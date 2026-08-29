'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';

const SESSION_KEY = 'loco_session_id';
const POLL_MS = 30_000;      // how often we re-check / heartbeat
const RECENT_MS = 90_000;    // another session counts as "live" if seen within this window

/**
 * Enforces a single active session per account (one browser at a time).
 *
 * Each browser stores a random session id locally and writes it to
 * profiles.active_session_id as the "active" one. On a schedule (and on tab
 * focus) every browser checks whether it is still the active session:
 *   - still active  → refresh the heartbeat
 *   - superseded    → sign out and bounce to login with a message
 *   - fresh login   → claim the session, or (if another live session exists)
 *                     ask the user to confirm taking over
 *
 * This is a UX guard, not hard security — it deters account sharing.
 */
export default function SingleSessionGuard() {
    const { user, signOut } = useAuth();
    const supabase = useSupabase();
    const router = useRouter();
    const [showPrompt, setShowPrompt] = useState(false);
    const busy = useRef(false);

    const claim = useCallback(async () => {
        if (!user) return;
        const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(SESSION_KEY, id);
        await supabase
            .from('profiles')
            .update({ active_session_id: id, session_last_seen: new Date().toISOString() })
            .eq('id', user.id);
    }, [supabase, user]);

    const check = useCallback(async () => {
        if (!user || busy.current || showPrompt) return;
        busy.current = true;
        try {
            const local = localStorage.getItem(SESSION_KEY);
            const { data } = await supabase
                .from('profiles')
                .select('active_session_id, session_last_seen')
                .eq('id', user.id)
                .maybeSingle();

            const active = data?.active_session_id ?? null;
            const lastSeen = data?.session_last_seen ? new Date(data.session_last_seen).getTime() : 0;
            const recent = Date.now() - lastSeen < RECENT_MS;

            if (local && active && local === active) {
                // We are the active session — refresh heartbeat.
                await supabase
                    .from('profiles')
                    .update({ session_last_seen: new Date().toISOString() })
                    .eq('id', user.id);
            } else if (local && active && local !== active) {
                // A newer login took over. Sign out WITHOUT clearing the DB marker
                // (that belongs to the new session now).
                localStorage.removeItem(SESSION_KEY);
                await supabase.auth.signOut();
                router.replace('/login?reason=signed_in_elsewhere');
            } else if (!local && active && recent) {
                // Fresh browser, another live session exists — ask before taking over.
                setShowPrompt(true);
            } else {
                // Fresh browser with no live session elsewhere, or the marker was
                // cleared — claim it silently.
                await claim();
            }
        } catch {
            // Ignore transient network/RLS errors — we retry on the next tick.
        } finally {
            busy.current = false;
        }
    }, [user, supabase, router, claim, showPrompt]);

    useEffect(() => {
        if (!user) return;
        check();
        const iv = setInterval(check, POLL_MS);
        const onVisible = () => { if (document.visibilityState === 'visible') check(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(iv);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [user, check]);

    const continueHere = async () => {
        setShowPrompt(false);
        await claim();
    };

    const cancel = async () => {
        setShowPrompt(false);
        localStorage.removeItem(SESSION_KEY);
        await signOut();
        router.replace('/login');
    };

    if (!showPrompt) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
            <div className="modal" style={{ maxWidth: 420, textAlign: 'center' }}>
                <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
                    Already signed in elsewhere
                </h2>
                <p className="text-secondary" style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
                    Your account is currently active on another device or browser. Only one session is
                    allowed at a time. Continue here and sign out the other session?
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={cancel}>Cancel</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={continueHere}>Continue here</button>
                </div>
            </div>
        </div>
    );
}
