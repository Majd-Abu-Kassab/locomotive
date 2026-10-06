'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Brain } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMemotive } from '@/contexts/MemotiveContext';
import MemotiveApp from './MemotiveApp';
import './memotive.css';

// No bubble on public pages, during tests/quizzes (/test/…), or on
// Memotive's own pages.
const HIDDEN = /^\/(login|register|forgot-password|reset-password|auth|test|memotive)(\/|$)/;

/**
 * The floating Memotive bubble and its half-page panel. Mounted once in the
 * root layout (not per page) so an open panel — and a half-written card —
 * survives navigating to another page to look something up.
 */
export default function MemotiveRoot() {
    const pathname = usePathname();
    const { user } = useAuth();
    const { available, totalDue, panelOpen, setPanelOpen } = useMemotive();
    const [expanded, setExpanded] = useState(false);

    const hidden = !user || !available || pathname === '/' || HIDDEN.test(pathname);

    // The full page replaces the panel.
    useEffect(() => {
        if (pathname.startsWith('/memotive')) setPanelOpen(false);
    }, [pathname, setPanelOpen]);

    if (!user || !available) return null;

    const due = totalDue.total;

    // While hidden (e.g. mid-test) the panel stays mounted so its state
    // is still there afterwards.
    return (
        <div style={hidden ? { display: 'none' } : undefined}>
            {panelOpen ? (
                <aside className={`mm-panel ${expanded ? 'expanded' : ''}`} aria-label="Memotive flashcards">
                    <button
                        className="mm-sheet-handle"
                        onClick={() => setExpanded(x => !x)}
                        aria-label={expanded ? 'Shrink panel' : 'Expand panel'}
                    />
                    <MemotiveApp mode="panel" onClose={() => setPanelOpen(false)} />
                </aside>
            ) : (
                <button
                    className="mm-bubble"
                    onClick={() => setPanelOpen(true)}
                    aria-label={due > 0 ? `Memotive — ${due} card${due === 1 ? '' : 's'} due today` : 'Memotive flashcards'}
                    title="Memotive"
                >
                    <Brain size={26} />
                    {due > 0 && <span className="mm-bubble-badge">{due > 99 ? '99+' : due}</span>}
                </button>
            )}
        </div>
    );
}
