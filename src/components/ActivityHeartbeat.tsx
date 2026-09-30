'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const PING_EVERY_MS = 5 * 60_000; // at most one ping per 5 minutes of interaction
const EVENTS = ['pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'] as const;

/**
 * Keeps the middleware's inactivity timeout honest.
 *
 * The timeout only sees requests that pass through middleware, i.e. page
 * navigations. Supabase queries go straight from the browser to Supabase, so a
 * student working inside one page (a long quiz, a lesson) looked idle and was
 * signed out on their next click. On genuine interaction we ping
 * /api/activity — throttled — so the timer tracks real use. We never ping on a
 * timer alone, so an abandoned tab still times out.
 */
export default function ActivityHeartbeat() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        // Mounting follows a navigation, which already refreshed the timer.
        let lastPing = Date.now();
        let inFlight = false;

        const onActivity = async () => {
            if (inFlight || Date.now() - lastPing < PING_EVERY_MS) return;
            inFlight = true;
            lastPing = Date.now();
            try {
                const res = await fetch('/api/activity', { cache: 'no-store', redirect: 'manual' });
                // A redirect means middleware already ended the session (it had
                // expired, or the user is signed out) — land on login cleanly
                // instead of leaving them on a page whose requests now fail.
                if (res.type === 'opaqueredirect') {
                    window.location.replace('/login?reason=session_expired');
                }
            } catch {
                // Network blip — the next interaction retries after the throttle.
            } finally {
                inFlight = false;
            }
        };

        EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true, capture: true }));
        return () => {
            EVENTS.forEach(e => window.removeEventListener(e, onActivity, { capture: true }));
        };
    }, [user]);

    return null;
}
