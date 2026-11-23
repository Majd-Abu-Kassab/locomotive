'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { localDay } from '@/lib/studyStats';

const PING_EVERY_MS = 5 * 60_000; // at most one ping per 5 minutes of interaction
// Genuine interaction, plus a video playing ('timeupdate' fires several times a
// second while it plays): a student watching a lecture hands-off is studying,
// not idle. Media events don't bubble, but these listeners are capture-phase
// on window, so they still hear them.
const EVENTS = ['pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart', 'timeupdate'] as const;
// Pages where active time counts as study time on the dashboard.
const STUDY_PAGES = /^\/(courses|test|memotive|study-planner|create-test|starter-pack|previous-tests)(\/|$)/;

/**
 * Keeps the middleware's inactivity timeout honest.
 *
 * The timeout only sees requests that pass through middleware, i.e. page
 * navigations. Supabase queries go straight from the browser to Supabase, so a
 * student working inside one page (a long quiz, a lesson) looked idle and was
 * signed out on their next click. On genuine interaction we ping
 * /api/activity — throttled — so the timer tracks real use. We never ping on a
 * timer alone, so an abandoned tab still times out (once its video, if any,
 * has stopped playing).
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
                // On a study page, the server also adds these minutes to today's study time.
                const study = STUDY_PAGES.test(window.location.pathname) ? '1' : '0';
                const res = await fetch(`/api/activity?study=${study}&day=${localDay(new Date())}`, { cache: 'no-store', redirect: 'manual' });
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
