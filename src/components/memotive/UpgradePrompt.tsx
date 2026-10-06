'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';
import { useMemotive } from '@/contexts/MemotiveContext';

/** Shown when a free student has used all their free cards. */
export default function UpgradePrompt() {
    const { status, setPanelOpen } = useMemotive();
    const limit = status?.freeLimit ?? 10;
    return (
        <div className="mm-empty" style={{ paddingTop: 'var(--space-6)' }}>
            <div className="mm-empty-icon" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)' }}>
                <Crown size={28} />
            </div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                You’ve used your {limit} free cards
            </h3>
            <p style={{ maxWidth: 380, margin: '0 auto var(--space-5)', lineHeight: 1.6 }}>
                Delete a card to free up a spot, or unlock unlimited Memotive. It’s included with course
                parts marked <strong>Includes Memotive</strong>.
            </p>
            <Link href="/upgrade" className="btn btn-primary" onClick={() => setPanelOpen(false)}>
                <Crown size={16} /> Unlock unlimited cards
            </Link>
        </div>
    );
}
