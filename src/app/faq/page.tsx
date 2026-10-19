'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { faqCategories, type FaqBlock } from '@/data/faq';
import { Search, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

// Plain text of a block, without link markup, for search.
const blockText = (block: FaqBlock) =>
    (Array.isArray(block) ? block.join(' ') : block).replace(LINK_RE, '$1');

// Renders a line of text, turning [label](url) into links.
function RichText({ text }: { text: string }) {
    const parts: React.ReactNode[] = [];
    let last = 0;
    for (const m of text.matchAll(LINK_RE)) {
        parts.push(text.slice(last, m.index));
        parts.push(
            <a
                key={m.index}
                href={m[2]}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--brand-accent-light)', fontWeight: 600 }}
            >
                {m[1]}
            </a>
        );
        last = m.index! + m[0].length;
    }
    parts.push(text.slice(last));
    return <>{parts}</>;
}

export default function FAQPage() {
    const [openKey, setOpenKey] = useState<string | null>('0-0');
    const [searchQuery, setSearchQuery] = useState('');

    const query = searchQuery.toLowerCase();
    const filtered = faqCategories
        .map((category, c) => ({
            ...category,
            items: category.items
                .map((faq, i) => ({ ...faq, key: `${c}-${i}` }))
                .filter(f => f.question.toLowerCase().includes(query) ||
                    f.answer.some(b => blockText(b).toLowerCase().includes(query))),
        }))
        .filter(category => category.items.length > 0);

    return (
        <AppLayout>
            <div className="page-wrapper">
                <div className="page-header">
                    <h1>Frequently Asked Questions</h1>
                    <p>Find answers to common questions about the IMAT exam and LOCOMOTIVE</p>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 'var(--space-6)' }}>
                    <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                        className="input"
                        placeholder="Search FAQ..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: 44 }}
                    />
                </div>

                {/* FAQ Items */}
                {filtered.map(category => (
                    <section key={category.title} style={{ marginBottom: 'var(--space-8)' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                            {category.title}
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {category.items.map(faq => (
                                <div key={faq.key} className="accordion-item">
                                    <button
                                        className="accordion-header"
                                        onClick={() => setOpenKey(openKey === faq.key ? null : faq.key)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                            <HelpCircle size={18} style={{ color: 'var(--brand-accent-light)', flexShrink: 0 }} />
                                            <span style={{ fontWeight: 600, textAlign: 'left' }}>{faq.question}</span>
                                        </div>
                                        {openKey === faq.key ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    </button>
                                    {openKey === faq.key && (
                                        <div className="accordion-content" style={{ color: 'var(--text-secondary)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                            {faq.answer.map((block, b) => Array.isArray(block) ? (
                                                <ul key={b} style={{ margin: 0, paddingLeft: 'var(--space-5)', listStyle: 'disc' }}>
                                                    {block.map((item, j) => <li key={j}><RichText text={item} /></li>)}
                                                </ul>
                                            ) : (
                                                <p key={b} style={{ margin: 0 }}><RichText text={block} /></p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-tertiary)' }}>
                        <HelpCircle size={48} style={{ marginBottom: 'var(--space-4)', opacity: 0.5 }} />
                        <p>No results found for &ldquo;{searchQuery}&rdquo;</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
