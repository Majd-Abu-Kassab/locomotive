'use client';

import AppLayout from '@/components/AppLayout';
import MemotiveApp from '@/components/memotive/MemotiveApp';
import { useMemotive } from '@/contexts/MemotiveContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function MemotivePage() {
    const { available, loaded } = useMemotive();
    const { user, loading } = useAuth();

    return (
        <AppLayout>
            <div className="page-wrapper" style={{ maxWidth: 900, margin: '0 auto' }}>
                {available ? (
                    <MemotiveApp mode="page" />
                ) : loading || (user && !loaded) ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                    </div>
                ) : (
                    <p className="text-secondary">Memotive isn’t available right now. Please try again in a moment.</p>
                )}
            </div>
        </AppLayout>
    );
}
