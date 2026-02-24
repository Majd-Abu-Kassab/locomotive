'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { faqItems } from '@/data/mockData';
import { Search, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';

export default function FAQPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = faqItems.filter(
        f => f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AppLayout>
            <div className="page-wrapper" style={{ maxWidth: '800px' }}>
                <div className="page-header">
                    <h1>Frequently Asked Questions</h1>
                    <p>Find answers to common questions about LOCOMOTIVE</p>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {filtered.map((faq, i) => (
                        <div key={i} className="accordion-item">
                            <button
                                className="accordion-header"
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <HelpCircle size={18} style={{ color: 'var(--brand-accent-light)', flexShrink: 0 }} />
                                    <span style={{ fontWeight: 600, textAlign: 'left' }}>{faq.question}</span>
                                </div>
                                {openIndex === i ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                            {openIndex === i && (
                                <div className="accordion-content">
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

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
