'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Brain, Plus, List, Settings, FileDown, Maximize2, X, Pencil, Trash2, Crown, CheckCircle2, Loader2, ArrowLeft,
} from 'lucide-react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useMemotive, DueCounts } from '@/contexts/MemotiveContext';
import { useToast } from '@/components/Toast';
import { renameDeck, deleteDeck, saveSettings, NoteRow, MemotiveSettings } from '@/lib/memotive/api';
import StudySession from './StudySession';
import NoteEditor from './NoteEditor';
import NoteBrowser from './NoteBrowser';
import './memotive.css';

type View =
    | { name: 'home' }
    | { name: 'study'; deckId?: string }
    | { name: 'add'; deckId?: string }
    | { name: 'edit'; note: NoteRow; returnTo: View }
    | { name: 'browse'; deckId?: string }
    | { name: 'settings' };

interface MemotiveAppProps {
    mode: 'panel' | 'page';
    onClose?: () => void;
}

export default function MemotiveApp({ mode, onClose }: MemotiveAppProps) {
    const { decks } = useMemotive();
    const [view, setView] = useState<View>({ name: 'home' });
    const home = () => setView({ name: 'home' });

    const deckName = (id?: string) => id ? decks.find(d => d.id === id)?.name ?? 'Subject' : 'All subjects';

    let body: React.ReactNode;
    switch (view.name) {
        case 'study':
            body = (
                <StudySession
                    key={view.deckId ?? 'all'}
                    deckId={view.deckId}
                    deckName={deckName(view.deckId)}
                    onExit={home}
                    onEditNote={note => setView({ name: 'edit', note, returnTo: view })}
                />
            );
            break;
        case 'add':
            body = <NoteEditor defaultDeckId={view.deckId} onDone={home} />;
            break;
        case 'edit':
            body = <NoteEditor key={view.note.id} note={view.note} onDone={() => setView(view.returnTo)} />;
            break;
        case 'browse':
            body = (
                <NoteBrowser
                    initialDeckId={view.deckId}
                    onBack={home}
                    onEdit={note => setView({ name: 'edit', note, returnTo: { name: 'browse', deckId: view.deckId } })}
                />
            );
            break;
        case 'settings':
            body = <SettingsView onBack={home} />;
            break;
        default:
            body = <Home onStudy={deckId => setView({ name: 'study', deckId })} onAdd={deckId => setView({ name: 'add', deckId })} onBrowse={deckId => setView({ name: 'browse', deckId })} />;
    }

    return (
        <div className={`mm-app ${mode}`}>
            <div className="mm-header">
                <div className="mm-title">
                    <span className="mm-title-icon"><Brain size={16} /></span>
                    <span>Memotive</span>
                </div>
                <button className="mm-icon-btn" onClick={() => setView({ name: 'add' })} title="Add a card" aria-label="Add a card"><Plus size={16} /></button>
                <button className="mm-icon-btn" onClick={() => setView({ name: 'browse' })} title="Browse cards" aria-label="Browse cards"><List size={16} /></button>
                <a className="mm-icon-btn" href="/memotive/print" target="_blank" rel="noopener" title="Download as PDF" aria-label="Download as PDF"><FileDown size={16} /></a>
                <button className="mm-icon-btn" onClick={() => setView({ name: 'settings' })} title="Settings" aria-label="Settings"><Settings size={16} /></button>
                {mode === 'panel' && (
                    <>
                        <Link className="mm-icon-btn mm-open-page" href="/memotive" title="Open full page" aria-label="Open full page" onClick={onClose}><Maximize2 size={16} /></Link>
                        <button className="mm-icon-btn" onClick={onClose} title="Close" aria-label="Close Memotive"><X size={16} /></button>
                    </>
                )}
            </div>
            <div className="mm-body">{body}</div>
        </div>
    );
}

function Counts({ c }: { c: DueCounts }) {
    const cls = (n: number, base: string) => n > 0 ? base : `${base} mm-count-zero`;
    return (
        <div className="mm-counts">
            <span className={cls(c.new, 'mm-count-new')}>{c.new}</span>
            <span className={cls(c.learn, 'mm-count-learn')}>{c.learn}</span>
            <span className={cls(c.review, 'mm-count-review')}>{c.review}</span>
        </div>
    );
}

function Home({ onStudy, onAdd, onBrowse }: {
    onStudy: (deckId?: string) => void;
    onAdd: (deckId?: string) => void;
    onBrowse: (deckId?: string) => void;
}) {
    const supabase = useSupabase();
    const { decks, status, totalDue, dueForDeck, canStudy, refresh, setPanelOpen } = useMemotive();
    const { addToast } = useToast();

    const unlimited = !!status?.unlimited;
    const noteCount = status?.noteCount ?? 0;
    const limit = status?.freeLimit ?? 10;
    const lapsed = !canStudy;

    const rename = async (id: string, current: string) => {
        const name = prompt('Rename subject', current)?.trim();
        if (!name || name === current) return;
        try {
            await renameDeck(supabase, id, name);
            await refresh();
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Couldn’t rename.', 'error');
        }
    };

    const remove = async (id: string, name: string) => {
        if (!confirm(`Delete “${name}” and all its cards? This can’t be undone.`)) return;
        try {
            await deleteDeck(supabase, id);
            await refresh();
            addToast('Subject deleted', 'success');
        } catch {
            addToast('Couldn’t delete the subject.', 'error');
        }
    };

    const plan = unlimited ? (
        <div className="mm-plan">
            <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
            <span>Unlimited cards</span>
        </div>
    ) : (
        <div className="mm-plan">
            <span><strong>{Math.min(noteCount, limit)}</strong> / {limit} free cards</span>
            <div className={`mm-plan-bar ${noteCount >= limit ? 'full' : ''}`}>
                <div style={{ width: `${Math.min(100, (noteCount / limit) * 100)}%` }} />
            </div>
            <Link href="/upgrade" className="btn btn-ghost btn-sm" onClick={() => setPanelOpen(false)}>
                <Crown size={14} /> Unlimited
            </Link>
        </div>
    );

    if (decks.length === 0) {
        return (
            <>
                {plan}
                <div className="mm-empty">
                    <div className="mm-empty-icon"><Brain size={28} /></div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Make your first flashcard</h3>
                    <p style={{ maxWidth: 360, margin: '0 auto var(--space-5)', lineHeight: 1.6 }}>
                        Write cards in your own words, pick a subject, and Memotive brings each one back right
                        before you’d forget it.
                    </p>
                    <button className="btn btn-primary" onClick={() => onAdd()}><Plus size={16} /> Add a card</button>
                </div>
            </>
        );
    }

    return (
        <>
            {plan}
            {lapsed && (
                <div className="mm-banner">
                    You have <strong>{noteCount}</strong> cards and the free plan studies up to {limit}. Your cards are
                    safe — browse, edit or download them as a PDF anytime. <Link href="/upgrade" onClick={() => setPanelOpen(false)} style={{ color: 'var(--text-accent)' }}>Unlock unlimited</Link> to
                    keep studying, or delete cards to get back to {limit}.
                </div>
            )}

            <div className="mm-decks">
                <div className="mm-deck-row head">
                    <span style={{ flex: 1 }}>Subject</span>
                    <div className="mm-counts"><span>New</span><span>Learn</span><span>Due</span></div>
                    <span style={{ width: 64 }} />
                </div>
                {decks.map(d => (
                    <div key={d.id} className="mm-deck-row">
                        <button className="mm-deck-name" onClick={() => canStudy ? onStudy(d.id) : onBrowse(d.id)} title={`${canStudy ? 'Study' : 'Browse'} ${d.name}`}>
                            {d.name}
                        </button>
                        <Counts c={dueForDeck(d.id)} />
                        <div style={{ display: 'flex', width: 64, justifyContent: 'flex-end' }}>
                            <button className="mm-icon-btn" onClick={() => rename(d.id, d.name)} title="Rename" aria-label={`Rename ${d.name}`}><Pencil size={13} /></button>
                            <button className="mm-icon-btn" onClick={() => remove(d.id, d.name)} title="Delete" aria-label={`Delete ${d.name}`}><Trash2 size={13} /></button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mm-actions">
                <button className="btn btn-primary" onClick={() => onStudy()} disabled={!canStudy}>
                    {totalDue.total > 0 ? `Study now · ${totalDue.total} due` : <><CheckCircle2 size={16} /> All caught up</>}
                </button>
                <button className="btn btn-secondary" onClick={() => onAdd()}><Plus size={16} /> Add a card</button>
            </div>
        </>
    );
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: 'numeric' });

function SettingsView({ onBack }: { onBack: () => void }) {
    const supabase = useSupabase();
    const { settings, refresh } = useMemotive();
    const { addToast } = useToast();
    const [draft, setDraft] = useState<MemotiveSettings | null>(settings);
    const [saving, setSaving] = useState(false);

    if (!draft) return null;

    const save = async () => {
        setSaving(true);
        try {
            await saveSettings(supabase, { ...draft, new_per_day: Math.max(0, Math.min(999, draft.new_per_day || 0)) });
            await refresh();
            addToast('Settings saved', 'success');
            onBack();
        } catch {
            addToast('Couldn’t save settings.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <button className="mm-back" onClick={onBack}><ArrowLeft size={14} /> Back</button>
            <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Settings</h3>

            <div className="mm-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                        type="checkbox"
                        checked={draft.reminders_enabled}
                        onChange={e => setDraft({ ...draft, reminders_enabled: e.target.checked })}
                    />
                    Daily reminder when cards are due
                </label>
                <div className="mm-hint">Shows in your notifications (the bell at the top).</div>
            </div>

            <div className="mm-field">
                <label htmlFor="mm-hour">Remind me after</label>
                <select
                    id="mm-hour"
                    className="select"
                    value={draft.reminder_hour}
                    disabled={!draft.reminders_enabled}
                    onChange={e => setDraft({ ...draft, reminder_hour: Number(e.target.value) })}
                >
                    {HOURS.map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}
                </select>
            </div>

            <div className="mm-field">
                <label htmlFor="mm-new">New cards per day</label>
                <input
                    id="mm-new"
                    className="input"
                    type="number"
                    min={0}
                    max={999}
                    value={draft.new_per_day}
                    onChange={e => setDraft({ ...draft, new_per_day: parseInt(e.target.value) || 0 })}
                />
                <div className="mm-hint">How many cards you haven’t studied yet to introduce each day. Anki’s default is 20.</div>
            </div>

            <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />} Save settings
            </button>
        </div>
    );
}
