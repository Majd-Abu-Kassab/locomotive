'use client';

import { useState } from 'react';
import { Brain, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useMemotive } from '@/contexts/MemotiveContext';
import { useToast } from '@/components/Toast';
import { getOrCreateDeck, saveNote, MemotiveAccessError } from '@/lib/memotive/api';
import type { QuestionRow } from '@/lib/api';

const LETTERS = 'ABCDEFGH';

// Options are sometimes stored with their own "A) " prefix.
const optionText = (opt: unknown) => {
    const s = String(opt);
    return /^[A-E]\) /.test(s) ? s.substring(3) : s;
};

/** Turn an exam question into a Basic card: stem + options → answer + explanation. */
export function questionToCard(q: QuestionRow): { front: string; back: string } {
    const options = q.options.map((o, i) => `${LETTERS[i]}) ${optionText(o)}`).join('\n');
    const front = [q.stem, q.image_url ? `![diagram](${q.image_url})` : '', options].filter(Boolean).join('\n\n');
    const answer = `Answer: ${LETTERS[q.correct_answer]}) ${optionText(q.options[q.correct_answer])}`;
    return { front, back: q.explanation ? `${answer}\n\n${q.explanation}` : answer };
}

/** One-click "save this question as a flashcard", filed under its subject. */
export default function AddQuestionToMemotive({ question }: { question: QuestionRow }) {
    const { user } = useAuth();
    const supabase = useSupabase();
    const { available, refresh } = useMemotive();
    const { addToast } = useToast();
    const [state, setState] = useState<'idle' | 'saving' | 'added'>('idle');

    if (!available || !user) return null;

    const add = async () => {
        setState('saving');
        try {
            const deck = await getOrCreateDeck(supabase, user.id, question.subject || 'Exam questions');
            await saveNote(supabase, user.id, {
                deck_id: deck.id,
                note_type: 'basic',
                ...questionToCard(question),
                source_question_id: question.id,
            });
            await refresh();
            setState('added');
            addToast(`Added to Memotive · ${deck.name}`, 'success');
        } catch (err) {
            setState('idle');
            if (err instanceof MemotiveAccessError) {
                await refresh();
                addToast('You’ve used your free Memotive cards. Delete one or unlock unlimited on the Upgrade page.', 'warning', 6000);
            } else {
                addToast('Couldn’t add the card. Please try again.', 'error');
            }
        }
    };

    return (
        <button
            className="btn btn-ghost btn-sm mm-add-from-q"
            onClick={add}
            disabled={state !== 'idle'}
            style={state === 'added' ? { color: 'var(--color-success)' } : undefined}
        >
            {state === 'saving' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : state === 'added' ? <Check size={14} /> : <Brain size={14} />}
            {state === 'added' ? 'Added to Memotive' : 'Add to Memotive'}
        </button>
    );
}
