'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useMemotive } from '@/contexts/MemotiveContext';
import { useToast } from '@/components/Toast';
import { getNotes, deleteNote, NoteRow } from '@/lib/memotive/api';
import { NOTE_TYPES, toPlainText } from '@/lib/memotive/content';

interface NoteBrowserProps {
    initialDeckId?: string;
    onEdit: (note: NoteRow) => void;
    onBack: () => void;
}

export default function NoteBrowser({ initialDeckId, onEdit, onBack }: NoteBrowserProps) {
    const userId = useAuth().user?.id;
    const supabase = useSupabase();
    const { decks, refresh } = useMemotive();
    const { addToast } = useToast();
    const [notes, setNotes] = useState<NoteRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [deckId, setDeckId] = useState(initialDeckId ?? '');
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!userId) return;
        getNotes(supabase, userId)
            .then(setNotes)
            .catch(err => {
                console.error('Memotive browse load error:', err);
                addToast('Couldn’t load your cards.', 'error');
            })
            .finally(() => setLoading(false));
    }, [supabase, userId, addToast]);

    const deckName = useMemo(() => new Map(decks.map(d => [d.id, d.name])), [decks]);
    const typeLabel = useMemo(() => new Map(NOTE_TYPES.map(t => [t.value, t.label])), []);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return notes.filter(n =>
            (!deckId || n.deck_id === deckId) &&
            (!q || toPlainText(`${n.front} ${n.back}`).toLowerCase().includes(q)),
        );
    }, [notes, deckId, query]);

    const remove = async (note: NoteRow) => {
        if (!confirm('Delete this card? Its review history will be lost.')) return;
        try {
            await deleteNote(supabase, note.id);
            setNotes(ns => ns.filter(n => n.id !== note.id));
            await refresh();
            addToast('Card deleted', 'success');
        } catch {
            addToast('Couldn’t delete the card.', 'error');
        }
    };

    return (
        <div>
            <button className="mm-back" onClick={onBack}><ArrowLeft size={14} /> Back</button>
            <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Browse cards</h3>

            <div className="mm-toolbar">
                <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input className="input" style={{ paddingLeft: 30 }} placeholder="Search cards" value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <select className="select" value={deckId} onChange={e => setDeckId(e.target.value)}>
                    <option value="">All subjects</option>
                    {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="mm-empty"><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
            ) : shown.length === 0 ? (
                <div className="mm-empty">{notes.length === 0 ? 'No cards yet.' : 'No cards match.'}</div>
            ) : (
                <div className="mm-decks">
                    {shown.map(n => (
                        <div key={n.id} className="mm-note-row">
                            <div className="mm-note-text">
                                <div>{toPlainText(n.front) || '—'}</div>
                                <div className="mm-note-meta">
                                    {deckName.get(n.deck_id)} · {typeLabel.get(n.note_type)}
                                </div>
                            </div>
                            <button className="mm-icon-btn" onClick={() => onEdit(n)} aria-label="Edit card" title="Edit">
                                <Pencil size={14} />
                            </button>
                            <button className="mm-icon-btn" onClick={() => remove(n)} aria-label="Delete card" title="Delete" style={{ color: 'var(--color-danger-light)' }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div className="mm-hint">{shown.length} of {notes.length} card{notes.length === 1 ? '' : 's'}</div>
        </div>
    );
}
