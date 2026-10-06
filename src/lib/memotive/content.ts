// Memotive note content: which cards a note produces, and cloze parsing.
// Field text uses the same markup as questions (RichTextPreview): **bold**,
// *italic*, ^{sup}, _{sub}, $math$, $$math$$, ![alt](url).

export type NoteType = 'basic' | 'reversed' | 'type_in' | 'cloze';

export const NOTE_TYPES: { value: NoteType; label: string; hint: string }[] = [
    { value: 'basic', label: 'Basic', hint: 'Front → back' },
    { value: 'reversed', label: 'Basic + reversed', hint: 'Makes two cards: front → back and back → front' },
    { value: 'type_in', label: 'Type the answer', hint: 'Type your answer, then compare it with the back' },
    { value: 'cloze', label: 'Cloze (fill in the blank)', hint: 'Hide parts of a sentence: {{c1::answer}}' },
];

export const FREE_NOTE_LIMIT = 10;

export interface ClozeSegment {
    text: string;
    /** Cloze number for a deletion, null for plain text. */
    num: number | null;
    hint?: string;
}

/**
 * Split cloze text into plain and deletion segments. Braces inside an answer
 * are balanced, so `{{c1::Ca^{2+}}}` keeps its superscript intact.
 */
export function parseCloze(text: string): ClozeSegment[] {
    const out: ClozeSegment[] = [];
    let plainStart = 0;
    let i = 0;
    while (i < text.length) {
        const m = /^\{\{c(\d+)::/.exec(text.slice(i, i + 12));
        if (!m) { i++; continue; }
        // Scan for the closing "}}" at brace depth 0.
        let j = i + m[0].length;
        let depth = 0;
        let end = -1;
        while (j < text.length) {
            const ch = text[j];
            if (ch === '{') depth++;
            else if (ch === '}') {
                if (depth === 0 && text[j + 1] === '}') { end = j; break; }
                depth = Math.max(0, depth - 1);
            }
            j++;
        }
        if (end === -1) { i++; continue; } // unterminated — leave as plain text
        if (i > plainStart) out.push({ text: text.slice(plainStart, i), num: null });
        const body = text.slice(i + m[0].length, end);
        const hintAt = body.lastIndexOf('::');
        out.push(hintAt === -1
            ? { text: body, num: Number(m[1]) }
            : { text: body.slice(0, hintAt), num: Number(m[1]), hint: body.slice(hintAt + 2) });
        i = end + 2;
        plainStart = i;
    }
    if (plainStart < text.length) out.push({ text: text.slice(plainStart), num: null });
    return out;
}

export function clozeNumbers(text: string): number[] {
    const nums = new Set<number>();
    for (const seg of parseCloze(text)) if (seg.num !== null && seg.num > 0) nums.add(seg.num);
    return [...nums].sort((a, b) => a - b);
}

/** The card ordinals a note should have. Cloze cards use the cloze number. */
export function cardOrds(noteType: NoteType, front: string): number[] {
    switch (noteType) {
        case 'basic':
        case 'type_in': return [0];
        case 'reversed': return [0, 1];
        case 'cloze': return clozeNumbers(front);
    }
}

/** Returns an error message if the note can't be saved, else null. */
export function validateNote(noteType: NoteType, front: string, back: string): string | null {
    if (!front.trim()) return noteType === 'cloze' ? 'Write the text with at least one cloze.' : 'The front can’t be empty.';
    if (noteType === 'cloze') {
        return clozeNumbers(front).length === 0 ? 'Add at least one cloze, e.g. {{c1::mitochondria}}.' : null;
    }
    if (!back.trim()) return 'The back can’t be empty.';
    return null;
}

/** Strip markup to plain text — for previews, search and type-in comparison. */
export function toPlainText(text: string): string {
    return parseCloze(text).map(s => s.text).join('')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '[image]')
        .replace(/\$\$?([^$]*)\$\$?/g, '$1')
        .replace(/[\^_]\{([^}]*)\}/g, '$1')
        .replace(/\*\*?([^*]+)\*\*?/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}

export function answersMatch(typed: string, expected: string): boolean {
    const norm = (s: string) => toPlainText(s).toLowerCase().replace(/[.,;:!?]+$/, '');
    return norm(typed) === norm(expected);
}

/** Next unused cloze number — for the editor's "add cloze" button. */
export function nextClozeNumber(text: string): number {
    const nums = clozeNumbers(text);
    return nums.length ? nums[nums.length - 1] + 1 : 1;
}
