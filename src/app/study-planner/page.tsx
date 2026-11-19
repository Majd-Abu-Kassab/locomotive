'use client';

import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';
import { Loader2 } from 'lucide-react';
import './study-planner.css';

const PLANNER = '/embed/study-planner.html';
// Events the platform's inactivity timer listens for (ActivityHeartbeat).
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'] as const;

/**
 * The client's IMAT study planner (public/embed/study-planner.html, generated
 * by scripts/build-study-planner.mjs) shown inside the app. It's a large,
 * self-contained page, so it runs in its own same-origin frame instead of
 * being rewritten: the frame fills the content area and scrolls itself.
 */
export default function StudyPlannerPage() {
    const { theme } = useTheme();
    const frameRef = useRef<HTMLIFrameElement>(null);
    // Bumped each time the planner itself finishes loading in the frame.
    const [loads, setLoads] = useState(0);

    // Point the frame at the planner once, in the browser, passing on a
    // shared plan link (/study-planner#plan=…).
    useEffect(() => {
        if (frameRef.current) frameRef.current.src = PLANNER + window.location.hash;
    }, []);

    const onLoad = () => {
        let path = '';
        try { path = frameRef.current?.contentWindow?.location.pathname ?? ''; } catch { /* not ours */ }
        if (path === PLANNER) setLoads(n => n + 1);
        // The session ended and the frame was sent to sign in: do that in the
        // main window rather than showing the login page inside the planner.
        else if (path.startsWith('/login')) window.location.replace('/login?reason=session_expired');
    };

    // Keep the planner's light/dark theme in step with the app's switch.
    useEffect(() => {
        const doc = frameRef.current?.contentDocument;
        if (loads > 0 && doc) doc.documentElement.setAttribute('data-theme', theme);
    }, [theme, loads]);

    // Typing and clicking inside the frame doesn't reach the app, so pass it
    // on: otherwise a student planning for a long time would be signed out
    // for "inactivity".
    useEffect(() => {
        const win = frameRef.current?.contentWindow;
        if (loads === 0 || !win) return;
        const forward = (e: Event) => window.dispatchEvent(new Event(e.type));
        ACTIVITY_EVENTS.forEach(type => win.addEventListener(type, forward, { passive: true, capture: true }));
        return () => ACTIVITY_EVENTS.forEach(type => win.removeEventListener(type, forward, { capture: true }));
    }, [loads]);

    return (
        <AppLayout>
            <div className="study-planner">
                {loads === 0 && (
                    <div className="study-planner-loading">
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                )}
                <iframe ref={frameRef} title="IMAT study planner" onLoad={onLoad} />
            </div>
        </AppLayout>
    );
}
