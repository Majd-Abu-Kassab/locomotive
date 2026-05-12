'use client';

import { useState, useRef, useCallback } from 'react';
import { Bold, Italic, Subscript, Superscript, Image, Type, Code } from 'lucide-react';

interface RichTextToolbarProps {
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    value: string;
    onChange: (val: string) => void;
    onImageUpload?: (file: File) => Promise<string | null>;
}

/**
 * Formatting toolbar that inserts markdown-like syntax into a textarea.
 * 
 * Supported syntax (rendered by RichTextPreview):
 *   **bold**   *italic*   ^{superscript}   _{subscript}
 *   $LaTeX math$   ![alt](url)
 */
export function RichTextToolbar({ textareaRef, value, onChange, onImageUpload }: RichTextToolbarProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const wrapSelection = useCallback((before: string, after: string) => {
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = value.substring(start, end);
        const newVal = value.substring(0, start) + before + selected + after + value.substring(end);
        onChange(newVal);
        // Restore cursor after React re-render
        setTimeout(() => {
            ta.focus();
            ta.selectionStart = start + before.length;
            ta.selectionEnd = start + before.length + selected.length;
        }, 0);
    }, [textareaRef, value, onChange]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onImageUpload) return;
        setUploading(true);
        const url = await onImageUpload(file);
        if (url) {
            const ta = textareaRef.current;
            const pos = ta ? ta.selectionStart : value.length;
            const insert = `![diagram](${url})`;
            const newVal = value.substring(0, pos) + insert + value.substring(pos);
            onChange(newVal);
        }
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const btnStyle: React.CSSProperties = {
        width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-glass)', border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)',
        transition: 'all 0.15s ease', fontSize: 12,
    };

    return (
        <div style={{
            display: 'flex', gap: 'var(--space-1)', padding: 'var(--space-2)',
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            border: '1px solid var(--border-primary)', borderBottom: 'none',
            flexWrap: 'wrap', alignItems: 'center',
        }}>
            <button type="button" title="Bold **text**" style={btnStyle} onClick={() => wrapSelection('**', '**')}>
                <Bold size={14} />
            </button>
            <button type="button" title="Italic *text*" style={btnStyle} onClick={() => wrapSelection('*', '*')}>
                <Italic size={14} />
            </button>
            <button type="button" title="Superscript ^{text}" style={btnStyle} onClick={() => wrapSelection('^{', '}')}>
                <Superscript size={14} />
            </button>
            <button type="button" title="Subscript _{text}" style={btnStyle} onClick={() => wrapSelection('_{', '}')}>
                <Subscript size={14} />
            </button>
            <div style={{ width: 1, height: 20, background: 'var(--border-primary)', margin: '0 2px' }} />
            <button type="button" title="Math equation $...$" style={btnStyle} onClick={() => wrapSelection('$', '$')}>
                <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: 14, fontWeight: 700 }}>∑</span>
            </button>
            <button type="button" title="Fraction" style={btnStyle} onClick={() => wrapSelection('$\\frac{', '}{denominator}$')}>
                <span style={{ fontSize: 10, fontWeight: 600 }}>a/b</span>
            </button>
            <button type="button" title="Chemical formula" style={btnStyle} onClick={() => wrapSelection('$\\text{', '}$')}>
                <Code size={14} />
            </button>
            <div style={{ width: 1, height: 20, background: 'var(--border-primary)', margin: '0 2px' }} />
            <button
                type="button"
                title="Upload image/diagram"
                style={{ ...btnStyle, opacity: uploading ? 0.5 : 1 }}
                onClick={() => fileRef.current?.click()}
                disabled={uploading || !onImageUpload}
            >
                <Image size={14} />
            </button>
            <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
            />
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)' }}>
                Supports: **bold** *italic* ^{'{sup}'} _{'{sub}'} $math$ ![img](url)
            </span>
        </div>
    );
}

/**
 * Renders rich text with formatting:
 *   **bold**  →  <strong>
 *   *italic*  →  <em>
 *   ^{text}   →  <sup>
 *   _{text}   →  <sub>
 *   $math$    →  KaTeX rendered
 *   ![alt](url) → <img>
 */
export function RichTextPreview({ text }: { text: string }) {
    if (!text) return null;

    const renderRichText = (input: string): React.ReactNode[] => {
        const nodes: React.ReactNode[] = [];
        // Combined regex for all supported patterns
        const regex = /(\$[^$]+\$)|(!\[([^\]]*)\]\(([^)]+)\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\^\{[^}]+\})|(\_\{[^}]+\})/g;
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = regex.exec(input)) !== null) {
            // Text before match
            if (match.index > lastIndex) {
                nodes.push(input.substring(lastIndex, match.index));
            }

            if (match[1]) {
                // $math$ — render with KaTeX
                const mathContent = match[1].slice(1, -1);
                try {
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    const katex = require('katex');
                    const html = katex.renderToString(mathContent, { throwOnError: false, displayMode: false });
                    nodes.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} />);
                } catch {
                    nodes.push(<code key={key++} style={{ color: 'var(--color-warning)' }}>{match[1]}</code>);
                }
            } else if (match[2]) {
                // ![alt](url)
                nodes.push(
                    <img
                        key={key++}
                        src={match[4]}
                        alt={match[3] || 'diagram'}
                        style={{
                            maxWidth: '100%', borderRadius: 'var(--radius-md)',
                            margin: 'var(--space-2) 0', display: 'block',
                        }}
                    />
                );
            } else if (match[5]) {
                // **bold**
                nodes.push(<strong key={key++}>{match[5].slice(2, -2)}</strong>);
            } else if (match[6]) {
                // *italic*
                nodes.push(<em key={key++}>{match[6].slice(1, -1)}</em>);
            } else if (match[7]) {
                // ^{superscript}
                nodes.push(<sup key={key++}>{match[7].slice(2, -1)}</sup>);
            } else if (match[8]) {
                // _{subscript}
                nodes.push(<sub key={key++}>{match[8].slice(2, -1)}</sub>);
            }

            lastIndex = match.index + match[0].length;
        }

        // Remaining text
        if (lastIndex < input.length) {
            nodes.push(input.substring(lastIndex));
        }

        return nodes;
    };

    return <span>{renderRichText(text)}</span>;
}
