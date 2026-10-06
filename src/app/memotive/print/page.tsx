'use client';

import { useEffect, useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { RichTextPreview } from '@/components/RichTextEditor';
import { ClozeText } from '@/components/memotive/CardFace';
import { getDecks, getNotes, DeckRow, NoteRow } from '@/lib/memotive/api';
import '@/components/memotive/memotive.css';
import './print.css';

/**
 * Every card on one printable page, grouped by subject — the student's
 * backup. "Save as PDF" in the browser's print dialog makes the file, so
 * formulas and images come out exactly as on screen.
 */
export default function MemotivePrintPage() {
    const { user, loading: authLoading } = useAuth();
    const userId = user?.id;
    const supabase = useSupabase();
    const [data, setData] = useState<{ decks: DeckRow[]; notes: NoteRow[] } | 'error' | null>(null);

    useEffect(() => {
        if (!userId) return;
        Promise.all([getDecks(supabase, userId), getNotes(supabase, userId)])
            .then(([decks, notes]) => setData({ decks, notes: notes.reverse() }))
            .catch(err => { console.error('Memotive export load error:', err); setData('error'); });
    }, [userId, supabase]);

    if (authLoading || (user && data === null)) {
        return <div className="mm-print"><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>;
    }

    if (data === 'error' || data === null) {
        return <div className="mm-print"><p>Couldn’t load your cards. Please close this tab and try again.</p></div>;
    }

    const { decks, notes } = data;

    const byDeck = decks
        .map(d => ({ deck: d, notes: notes.filter(n => n.deck_id === d.id) }))
        .filter(g => g.notes.length > 0);

    return (
        <div className="mm-print">
            <div className="mm-print-bar">
                <div>
                    <h1>My Memotive cards</h1>
                    <p>{notes.length} card{notes.length === 1 ? '' : 's'} · {new Date().toLocaleDateString()}</p>
                </div>
                <button className="btn btn-primary" onClick={() => window.print()}>
                    <Printer size={16} /> Save as PDF
                </button>
            </div>
            <p className="mm-print-tip">In the print window, choose <strong>Save as PDF</strong> as the destination.</p>

            {byDeck.length === 0 && <p>You don’t have any cards yet.</p>}

            {byDeck.map(({ deck, notes: deckNotes }) => (
                <section key={deck.id} className="mm-print-deck">
                    <h2>{deck.name}</h2>
                    <table>
                        <tbody>
                            {deckNotes.map((n, i) => (
                                <tr key={n.id}>
                                    <td className="num">{i + 1}</td>
                                    {n.note_type === 'cloze' ? (
                                        <td colSpan={2} className="mm-content">
                                            <ClozeText text={n.front} active="all" reveal />
                                            {n.back.trim() && <div className="extra"><RichTextPreview text={n.back} /></div>}
                                        </td>
                                    ) : (
                                        <>
                                            <td className="mm-content"><RichTextPreview text={n.front} /></td>
                                            <td className="mm-content"><RichTextPreview text={n.back} /></td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            ))}
        </div>
    );
}
