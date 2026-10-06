'use client';

import { RichTextPreview } from '@/components/RichTextEditor';
import { parseCloze, NoteType } from '@/lib/memotive/content';

interface CardFaceProps {
    note: { note_type: NoteType; front: string; back: string };
    ord: number;
    side: 'question' | 'answer';
}

/**
 * Renders one side of a card, Anki-style: the answer side repeats the
 * question above a divider. Reversed cards (ord 1) swap front and back;
 * cloze cards hide deletion number `ord` and show the rest.
 */
export default function CardFace({ note, ord, side }: CardFaceProps) {
    if (note.note_type === 'cloze') {
        return (
            <div className="mm-content">
                <ClozeText text={note.front} active={ord} reveal={side === 'answer'} />
                {side === 'answer' && note.back.trim() && (
                    <>
                        <hr className="mm-divider" />
                        <RichTextPreview text={note.back} />
                    </>
                )}
            </div>
        );
    }

    const reversed = note.note_type === 'reversed' && ord === 1;
    const question = reversed ? note.back : note.front;
    const answer = reversed ? note.front : note.back;
    return (
        <div className="mm-content">
            <RichTextPreview text={question} />
            {side === 'answer' && (
                <>
                    <hr className="mm-divider" />
                    <RichTextPreview text={answer} />
                </>
            )}
        </div>
    );
}

export function ClozeText({ text, active, reveal }: { text: string; active: number | 'all'; reveal: boolean }) {
    return (
        <>
            {parseCloze(text).map((seg, i) => {
                if (seg.num === null) return <RichTextPreview key={i} text={seg.text} />;
                const isActive = active === 'all' || seg.num === active;
                if (!isActive) return <RichTextPreview key={i} text={seg.text} />;
                if (!reveal) return <span key={i} className="mm-cloze hidden">[{seg.hint || '…'}]</span>;
                return <span key={i} className="mm-cloze"><RichTextPreview text={seg.text} /></span>;
            })}
        </>
    );
}
