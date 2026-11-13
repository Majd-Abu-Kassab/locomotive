// Question content can arrive as HTML from imported question banks, with
// MathJax-style math: <p>…</p>, <span class="math inline">\(…\)</span>,
// <span class="math display">\[…\]</span>, lists, <strong>… The app's
// renderer (RichTextPreview) only understands its own markup:
//   **bold**  *italic*  ^{sup}  _{sub}  $math$  $$math$$  ![alt](url)
// This converts the former into the latter. Plain app markup passes through
// untouched, so it's safe to run on any text, any number of times.

const FOREIGN = /<\/?[a-z][^>]*>|\\\(|\\\[|&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i;

const ENTITIES: Record<string, string> = {
    nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'",
    times: '×', divide: '÷', minus: '−', le: '≤', ge: '≥', ne: '≠', plusmn: '±', deg: '°', hellip: '…',
};

// Tags we know how to drop. Anything else (e.g. "x < 5") is left alone.
const KNOWN_TAGS = /<\/?(p|div|span|ul|ol|li|b|i|u|strong|em|a|blockquote|code|pre|table|tbody|thead|tr|td|th|h[1-6]|figure|figcaption|font|small|big|center|section|article)(\s[^>]*)?\/?>/gi;

export function toRichText(input: string): string {
    if (!input || !FOREIGN.test(input)) return input;
    let s = input;

    // Math. The lookbehind skips "\\[2pt]"-style LaTeX line breaks.
    s = s.replace(/(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g, (_, m: string) => `$$${m.trim()}$$`);
    s = s.replace(/(?<!\\)\\\(([\s\S]*?)(?<!\\)\\\)/g, (_, m: string) => `$${m.trim()}$`);

    // Lists: number <ol> items, bullet the rest.
    s = s.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, body: string) => {
        let n = 0;
        return `\n${body.replace(/<li[^>]*>/gi, () => `${++n}. `)}\n`;
    });
    s = s.replace(/<li[^>]*>/gi, '• ');

    // Line and paragraph breaks.
    s = s.replace(/<br\s*\/?>/gi, '\n');
    s = s.replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, '\n');

    // Inline formatting the renderer supports.
    s = s.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, '^{$1}');
    s = s.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, '_{$1}');
    s = s.replace(/<\/?(strong|b)(\s[^>]*)?>/gi, '**');
    s = s.replace(/<\/?(em|i)(\s[^>]*)?>/gi, '*');
    s = s.replace(/<img\b[^>]*>/gi, tag => {
        const src = tag.match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1];
        const alt = tag.match(/\salt\s*=\s*["']([^"']*)["']/i)?.[1] || 'diagram';
        return src ? `![${alt}](${src})` : '';
    });

    s = s.replace(KNOWN_TAGS, '');

    // Entities last, so a decoded "&lt;b&gt;" stays text rather than a tag.
    s = s.replace(/&([a-z]+|#\d+|#x[0-9a-f]+);/gi, (whole, name: string) => {
        const lower = name.toLowerCase();
        if (lower.startsWith('#x')) return String.fromCodePoint(parseInt(lower.slice(2), 16));
        if (lower.startsWith('#') && lower !== '#39') return String.fromCodePoint(parseInt(lower.slice(1), 10));
        return ENTITIES[lower] ?? whole;
    });

    return s
        .replace(/\*\*\s*\*\*/g, '')      // empty <strong></strong>
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/** One-line plain text, for tables, search and previews. */
export function toPlainText(input: string): string {
    return toRichText(input)
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '[image]')
        .replace(/\$\$?([^$]*)\$\$?/g, '$1')
        .replace(/[\^_]\{([^}]*)\}/g, '$1')
        .replace(/\*\*?([^*]+)\*\*?/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
}
