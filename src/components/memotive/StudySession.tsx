'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowLeft, Loader2, PartyPopper, Pencil, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useMemotive } from '@/contexts/MemotiveContext';
import { useToast } from '@/components/Toast';
import { getStudyCards, getNewStudiedToday, answerCard, StudyCard, NoteRow, MemotiveAccessError } from '@/lib/memotive/api';
import { endOfToday, startOfToday, previewDelays, formatDelay, LEARN_AHEAD_MS, Rating, RATING_LABELS } from '@/lib/memotive/scheduler';
import { answersMatch } from '@/lib/memotive/content';
import CardFace from './CardFace';

interface StudySessionProps {
    deckId?: string;
    deckName: string;
    onExit: () => void;
    onEditNote: (note: NoteRow) => void;
}

type Next =
    | { kind: 'card'; card: StudyCard }
    | { kind: 'wait'; until: number }
    | { kind: 'done' };

// Anki's default new-card order, "card type, then order added": every
// front→back card (and cloze 1) before any reversed card (or cloze 2), which
// keeps a note's siblings apart without hiding them.
const cardTypeRank = (c: StudyCard) => c.note.note_type === 'cloze' ? c.ord - 1 : c.ord;
const byNewOrder = (a: StudyCard, b: StudyCard) =>
    cardTypeRank(a) - cardTypeRank(b) || a.note.created_at.localeCompare(b.note.created_at);

/**
 * Anki's queue order: learning cards that are due, then reviews due today,
 * then new cards up to the daily allowance. Only when nothing else is left
 * do learning cards come up early (within the learn-ahead limit).
 */
function pickNext(cards: StudyCard[], now: number, endOfDay: number, newLeft: number, studyAhead: boolean): Next {
    const learning = cards
        .filter(c => (c.state === 'learning' || c.state === 'relearning') && new Date(c.due).getTime() <= endOfDay)
        .sort((a, b) => +new Date(a.due) - +new Date(b.due));
    const firstLearnDue = learning[0] ? new Date(learning[0].due).getTime() : Infinity;
    if (learning[0] && (studyAhead || firstLearnDue <= now)) return { kind: 'card', card: learning[0] };

    const review = cards
        .filter(c => c.state === 'review' && new Date(c.due).getTime() <= endOfDay)
        .sort((a, b) => +new Date(a.due) - +new Date(b.due));
    if (review[0]) return { kind: 'card', card: review[0] };
    if (newLeft > 0) {
        const fresh = cards.filter(c => c.state === 'new').sort(byNewOrder)[0];
        if (fresh) return { kind: 'card', card: fresh };
    }

    if (learning[0] && firstLearnDue <= now + LEARN_AHEAD_MS) return { kind: 'card', card: learning[0] };
    if (learning[0]) return { kind: 'wait', until: firstLearnDue };
    return { kind: 'done' };
}

export default function StudySession({ deckId, deckName, onExit, onEditNote }: StudySessionProps) {
    // Key on the id: Supabase re-emits the user object whenever the tab
    // regains focus, which would otherwise reload the session mid-study.
    const userId = useAuth().user?.id;
    const supabase = useSupabase();
    const { settings, refresh, canStudy } = useMemotive();
    const { addToast } = useToast();
    const [cards, setCards] = useState<StudyCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [newLeft, setNewLeft] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [typed, setTyped] = useState('');
    const [busy, setBusy] = useState(false);
    const [studyAhead, setStudyAhead] = useState(false);
    const [reviewed, setReviewed] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [locked, setLocked] = useState(false);
    const typedRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        const today = new Date();
        Promise.all([
            getStudyCards(supabase, userId, endOfToday(today), deckId),
            getNewStudiedToday(supabase, userId, startOfToday(today)),
        ]).then(([c, n]) => {
            if (cancelled) return;
            setCards(c);
            setNewLeft(Math.max(0, (settings?.new_per_day ?? 20) - n));
        }).catch(err => {
            console.error('Memotive study load error:', err);
            addToast('Couldn’t load your cards. Please try again.', 'error');
        }).finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
        // Load once per session; settings changes mid-session don't reshuffle it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase, userId, deckId]);

    // Refresh the badge/deck counts when the session ends.
    useEffect(() => () => { refresh(); }, [refresh]);

    const next = useMemo(
        () => pickNext(cards, now, endOfToday(new Date(now)).getTime(), newLeft, studyAhead),
        [cards, now, newLeft, studyAhead],
    );
    const current = next.kind === 'card' ? next.card : null;

    // While waiting on a learning card, tick so it appears when due.
    useEffect(() => {
        if (next.kind !== 'wait') return;
        const id = setInterval(() => setNow(Date.now()), 15_000);
        return () => clearInterval(id);
    }, [next.kind]);

    const delays = useMemo(() => current ? previewDelays(current, new Date()) : null, [current, revealed]); // eslint-disable-line react-hooks/exhaustive-deps

    const reveal = useCallback(() => setRevealed(true), []);

    const answer = useCallback(async (rating: Rating) => {
        if (!current || busy) return;
        setBusy(true);
        try {
            const when = new Date();
            const sched = await answerCard(supabase, current, rating, when);
            if (current.state === 'new') setNewLeft(n => n - 1);
            setCards(cs => cs.map(c => c.id === current.id ? { ...c, ...sched, last_reviewed_at: when.toISOString() } : c));
            setReviewed(r => r + 1);
            setRevealed(false);
            setTyped('');
            setStudyAhead(false);
            setNow(Date.now());
        } catch (err) {
            if (err instanceof MemotiveAccessError) setLocked(true);
            else addToast('Couldn’t save that answer. Check your connection and try again.', 'error');
        } finally {
            setBusy(false);
        }
    }, [current, busy, supabase, addToast]);

    // Keyboard: Space/Enter = show answer, then 1–4 to rate (Space = Good).
    useEffect(() => {
        if (!current) return;
        const onKey = (e: KeyboardEvent) => {
            // Leave keys alone while typing anywhere (the type-in box handles
            // its own Enter) or when a modifier is held.
            const target = e.target as HTMLElement;
            const typing = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable;
            if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
            if (!revealed) {
                if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); }
                return;
            }
            if (['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); answer(Number(e.key) as Rating); }
            else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); answer(3); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [current, revealed, reveal, answer]);

    // Focus the answer box on type-in cards.
    useEffect(() => {
        if (current?.note.note_type === 'type_in' && !revealed) typedRef.current?.focus();
    }, [current, revealed]);

    const header = (
        <div className="mm-study-top">
            <button className="mm-back" style={{ margin: 0 }} onClick={onExit}>
                <ArrowLeft size={14} /> {deckName}
            </button>
            {current && (
                <button className="btn btn-ghost btn-sm" onClick={() => onEditNote(current.note)} title="Edit this card">
                    <Pencil size={14} /> Edit
                </button>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="mm-study">
                {header}
                <div className="mm-empty"><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
            </div>
        );
    }

    if (locked || !canStudy) {
        return (
            <div className="mm-study">
                {header}
                <div className="mm-banner">
                    Studying is paused because you have more cards than the free plan allows. Your cards are safe —
                    you can still browse, edit and export them. Unlock unlimited Memotive to keep studying, or delete
                    cards to get back to the free limit.
                </div>
            </div>
        );
    }

    if (next.kind !== 'card') {
        return (
            <div className="mm-study">
                {header}
                <div className="mm-empty">
                    <div className="mm-empty-icon">{next.kind === 'wait' ? <Clock size={28} /> : <PartyPopper size={28} />}</div>
                    {next.kind === 'wait' ? (
                        <>
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Nearly there</h3>
                            <p>The cards you’re still learning come back in {formatDelay(next.until - now)}.</p>
                            <div className="mm-actions" style={{ justifyContent: 'center' }}>
                                <button className="btn btn-primary btn-sm" onClick={() => setStudyAhead(true)}>Study them now</button>
                                <button className="btn btn-secondary btn-sm" onClick={onExit}>Finish</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                                {reviewed > 0 ? 'Congratulations!' : 'Nothing due right now'}
                            </h3>
                            <p>
                                {reviewed > 0
                                    ? `You reviewed ${reviewed} card${reviewed === 1 ? '' : 's'}. That’s everything due today.`
                                    : 'You’re all caught up on this subject for today.'}
                            </p>
                            <div className="mm-actions" style={{ justifyContent: 'center' }}>
                                <button className="btn btn-primary btn-sm" onClick={onExit}>Back to subjects</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    const card = next.card;
    const isTypeIn = card.note.note_type === 'type_in';
    const typedOk = isTypeIn && revealed && answersMatch(typed, card.note.back);

    return (
        <div className="mm-study">
            {header}
            <div className="mm-card">
                <CardFace note={card.note} ord={card.ord} side={revealed ? 'answer' : 'question'} />
                {isTypeIn && (
                    <div className="mm-typed">
                        {!revealed ? (
                            <input
                                ref={typedRef}
                                className="input"
                                placeholder="Type your answer, then press Enter"
                                value={typed}
                                onChange={e => setTyped(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); reveal(); } }}
                            />
                        ) : (
                            <div className="mm-typed-result">
                                {typed.trim() === ''
                                    ? <span className="text-secondary">You didn’t type an answer.</span>
                                    : typedOk
                                        ? <span className="ok">✓ {typed}</span>
                                        : <span className="bad">{typed}</span>}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mm-answer-bar">
                {!revealed ? (
                    <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} onClick={reveal}>
                        Show answer
                    </button>
                ) : (
                    <div className="mm-ratings">
                        {([1, 2, 3, 4] as Rating[]).map(r => (
                            <button key={r} className={`mm-rating r${r}`} onClick={() => answer(r)} disabled={busy}>
                                {RATING_LABELS[r]}
                                <small>{delays?.[r]}</small>
                            </button>
                        ))}
                    </div>
                )}
                <div className="mm-kbd">
                    {revealed ? 'Keys: 1 Again · 2 Hard · 3 or Space Good · 4 Easy' : 'Key: Space to show the answer'}
                </div>
            </div>
        </div>
    );
}
