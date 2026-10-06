'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useMemotive } from '@/contexts/MemotiveContext';
import { useToast } from '@/components/Toast';
import { RichTextToolbar } from '@/components/RichTextEditor';
import { saveNote, createDeck, NoteRow, MemotiveAccessError } from '@/lib/memotive/api';
import { NOTE_TYPES, NoteType, validateNote, cardOrds, nextClozeNumber } from '@/lib/memotive/content';
import CardFace from './CardFace';
import UpgradePrompt from './UpgradePrompt';

const NEW_DECK = '__new__';

interface NoteEditorProps {
    note?: NoteRow;
    defaultDeckId?: string;
    onDone: () => void;
}

export default function NoteEditor({ note, defaultDeckId, onDone }: NoteEditorProps) {
    const { user } = useAuth();
    const supabase = useSupabase();
    const { decks, canAdd, refresh } = useMemotive();
    const { addToast } = useToast();
    const isEdit = !!note;

    const [noteType, setNoteType] = useState<NoteType>(note?.note_type ?? 'basic');
    const [deckId, setDeckId] = useState(note?.deck_id ?? defaultDeckId ?? decks[0]?.id ?? NEW_DECK);
    const [newDeckName, setNewDeckName] = useState('');
    const [front, setFront] = useState(note?.front ?? '');
    const [back, setBack] = useState(note?.back ?? '');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [courseNames, setCourseNames] = useState<string[]>([]);
    const frontRef = useRef<HTMLTextAreaElement>(null);
    const backRef = useRef<HTMLTextAreaElement>(null);

    // Suggest the platform's subjects when the student names a new deck.
    useEffect(() => {
        if (deckId !== NEW_DECK || courseNames.length) return;
        supabase.from('courses').select('name').order('sort_order')
            .then(({ data }) => setCourseNames((data || []).map(c => c.name)));
    }, [deckId, courseNames.length, supabase]);

    useEffect(() => { frontRef.current?.focus(); }, []);

    const addCloze = () => {
        const ta = frontRef.current;
        if (!ta) return;
        const n = nextClozeNumber(front);
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = front.substring(start, end) || 'answer';
        const insert = `{{c${n}::${selected}}}`;
        setFront(front.substring(0, start) + insert + front.substring(end));
        setTimeout(() => {
            ta.focus();
            ta.selectionStart = start + `{{c${n}::`.length;
            ta.selectionEnd = ta.selectionStart + selected.length;
        }, 0);
    };

    const save = useCallback(async (addAnother: boolean) => {
        if (!user || saving) return;
        const problem = validateNote(noteType, front, back);
        if (problem) { setError(problem); return; }
        if (deckId === NEW_DECK && !newDeckName.trim()) { setError('Name the subject for this card.'); return; }
        setError(null);
        setSaving(true);
        try {
            let targetDeck = deckId;
            if (deckId === NEW_DECK) {
                // Switch to the created subject right away so a retry after a
                // failed card save doesn't try to create it twice.
                targetDeck = (await createDeck(supabase, user.id, newDeckName)).id;
                await refresh();
                setDeckId(targetDeck);
                setNewDeckName('');
            }
            await saveNote(supabase, user.id, { id: note?.id, deck_id: targetDeck, note_type: noteType, front, back });
            await refresh();
            addToast(isEdit ? 'Card updated' : 'Card added', 'success');
            if (addAnother) {
                // Anki's Add window: keep subject and type, clear the fields.
                setFront('');
                setBack('');
                frontRef.current?.focus();
            } else {
                onDone();
            }
        } catch (err) {
            if (err instanceof MemotiveAccessError) await refresh();
            setError(err instanceof Error ? err.message : 'Couldn’t save the card.');
        } finally {
            setSaving(false);
        }
    }, [user, saving, noteType, front, back, deckId, newDeckName, supabase, note?.id, refresh, addToast, isEdit, onDone]);

    // Ctrl/Cmd+Enter saves, like Anki.
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(!isEdit); }
    };

    if (!isEdit && !canAdd) {
        return (
            <div>
                <button className="mm-back" onClick={onDone}><ArrowLeft size={14} /> Back</button>
                <UpgradePrompt />
            </div>
        );
    }

    const isCloze = noteType === 'cloze';
    const cardCount = cardOrds(noteType, front).length;
    const previewOrd = cardOrds(noteType, front)[0] ?? 0;

    return (
        <div onKeyDown={onKeyDown}>
            <button className="mm-back" onClick={onDone}><ArrowLeft size={14} /> Back</button>
            <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                {isEdit ? 'Edit card' : 'Add a card'}
            </h3>

            <div className="mm-field">
                <label htmlFor="mm-deck">Subject</label>
                <select id="mm-deck" className="select" value={deckId} onChange={e => setDeckId(e.target.value)}>
                    {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value={NEW_DECK}>+ New subject…</option>
                </select>
                {deckId === NEW_DECK && (
                    <>
                        <input
                            className="input"
                            style={{ marginTop: 'var(--space-2)' }}
                            placeholder="e.g. Biology, Organic chemistry, Physics formulas"
                            value={newDeckName}
                            onChange={e => setNewDeckName(e.target.value)}
                            list="mm-course-names"
                            maxLength={80}
                        />
                        <datalist id="mm-course-names">
                            {courseNames.map(n => <option key={n} value={n} />)}
                        </datalist>
                    </>
                )}
            </div>

            <div className="mm-field">
                <label>Card type</label>
                <div className="mm-types">
                    {NOTE_TYPES.map(t => (
                        <button
                            key={t.value}
                            type="button"
                            className={`mm-type ${noteType === t.value ? 'active' : ''}`}
                            onClick={() => setNoteType(t.value)}
                            title={t.hint}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="mm-hint">{NOTE_TYPES.find(t => t.value === noteType)?.hint}</div>
            </div>

            <div className="mm-field">
                <label htmlFor="mm-front">{isCloze ? 'Text' : 'Front'}</label>
                <RichTextToolbar textareaRef={frontRef} value={front} onChange={setFront} />
                {isCloze && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', padding: 'var(--space-2)', border: '1px solid var(--border-primary)', borderTop: 'none', borderBottom: 'none', background: 'var(--bg-secondary)' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={addCloze}>[…] Add cloze</button>
                        <span className="mm-hint" style={{ margin: 0 }}>Select a word, then click — each number becomes its own card.</span>
                    </div>
                )}
                <textarea
                    id="mm-front"
                    ref={frontRef}
                    className="input"
                    value={front}
                    onChange={e => setFront(e.target.value)}
                    placeholder={isCloze ? 'The {{c1::mitochondria}} is the powerhouse of the cell.' : 'Question or term'}
                />
            </div>

            <div className="mm-field">
                <label htmlFor="mm-back">{isCloze ? 'Extra (optional — shown with the answer)' : noteType === 'type_in' ? 'Answer to type' : 'Back'}</label>
                <RichTextToolbar textareaRef={backRef} value={back} onChange={setBack} />
                <textarea
                    id="mm-back"
                    ref={backRef}
                    className="input"
                    value={back}
                    onChange={e => setBack(e.target.value)}
                    placeholder={noteType === 'type_in' ? 'The exact answer, e.g. Golgi apparatus' : isCloze ? 'Notes, mnemonic, source…' : 'Answer'}
                />
            </div>

            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPreview(p => !p)} style={{ marginBottom: 'var(--space-3)' }}>
                {showPreview ? <EyeOff size={14} /> : <Eye size={14} />} {showPreview ? 'Hide preview' : 'Preview'}
            </button>
            {showPreview && (
                <div className="mm-preview" style={{ marginBottom: 'var(--space-4)' }}>
                    <CardFace note={{ note_type: noteType, front, back }} ord={previewOrd} side="answer" />
                </div>
            )}

            {error && <div className="mm-error">{error}</div>}

            <div className="mm-actions" style={{ alignItems: 'center' }}>
                {!isEdit && (
                    <button className="btn btn-primary" onClick={() => save(true)} disabled={saving}>
                        {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />} Add
                    </button>
                )}
                <button className={`btn ${isEdit ? 'btn-primary' : 'btn-secondary'}`} onClick={() => save(false)} disabled={saving}>
                    {isEdit ? <><Save size={14} /> Save</> : 'Add & close'}
                </button>
                <span className="mm-hint" style={{ margin: 0 }}>
                    {cardCount > 1 ? `Makes ${cardCount} cards · ` : ''}Ctrl+Enter to {isEdit ? 'save' : 'add'}
                </span>
            </div>
        </div>
    );
}
