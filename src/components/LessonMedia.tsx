'use client';

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Loader2, AlertTriangle, Download } from 'lucide-react';

// Lesson files are private; /api/lesson-media hands out a link that expires
// (see that route). These components fetch it and keep it working.

/** A file link ({ url }), or Bunny's video player ({ embedUrl }). */
type LessonLink = { url: string; embedUrl?: undefined } | { embedUrl: string; url?: undefined };

async function fetchLessonLink(lessonId: string): Promise<LessonLink | null> {
    try {
        const res = await fetch(`/api/lesson-media?lessonId=${encodeURIComponent(lessonId)}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const body = await res.json();
        if (typeof body.embedUrl === 'string') return { embedUrl: body.embedUrl };
        return typeof body.url === 'string' ? { url: body.url } : null;
    } catch {
        return null;
    }
}

/** The lesson's file link. Render keyed by lesson id so a new lesson starts fresh. */
function useLessonLink(lessonId: string) {
    const [state, setState] = useState<{ link: LessonLink | null; failed: boolean }>({ link: null, failed: false });
    useEffect(() => {
        let cancelled = false;
        fetchLessonLink(lessonId).then(link => { if (!cancelled) setState({ link, failed: !link }); });
        return () => { cancelled = true; };
    }, [lessonId]);
    return { ...state, setLink: (link: LessonLink | null) => setState({ link, failed: !link }) };
}

function Placeholder({ failed, label, height }: { failed: boolean; label: string; height?: number }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
            ...(height ? { height } : { aspectRatio: '16/9' }),
            background: '#000', color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', padding: 'var(--space-4)',
        }}>
            {failed
                ? <><AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} /> Couldn’t load this {label}. Refresh the page to try again.</>
                : <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />}
        </div>
    );
}

/**
 * Watch-only lesson video (client request): no download button, no download
 * or cast option in the player, no right-click "Save video as". Videos on
 * Bunny Stream play in Bunny's player, which has no download option either.
 */
export function LessonVideo({ lessonId, onEnded }: { lessonId: string; onEnded?: () => void }) {
    const { link, failed, setLink } = useLessonLink(lessonId);
    if (!link) return <Placeholder failed={failed} label="video" />;
    if (link.url === undefined) return <BunnyPlayer src={link.embedUrl} onEnded={onEnded} />;
    return <StorageVideo lessonId={lessonId} url={link.url} setLink={setLink} onEnded={onEnded} />;
}

// Bunny's player reports playback to the page with postMessage, in the
// player.js format (JSON text with context "player.js"): once it says it's
// ready, we subscribe to the events we need. We talk to it directly rather
// than loading Bunny's script into our pages.
const PLAYER_JS = { context: 'player.js', version: '0.0.11' };
const PLAYER_EVENTS = ['timeupdate', 'ended'] as const;

function BunnyPlayer({ src, onEnded }: { src: string; onEnded?: () => void }) {
    const frameRef = useRef<HTMLIFrameElement>(null);
    const onEndedRef = useRef(onEnded);
    useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

    useEffect(() => {
        const frame = frameRef.current;
        if (!frame) return;
        const origin = new URL(src).origin;
        let subscribed = false;
        let fallback: number | undefined;

        const subscribe = () => {
            if (subscribed || !frame.contentWindow) return;
            subscribed = true;
            for (const event of PLAYER_EVENTS) {
                frame.contentWindow.postMessage(JSON.stringify({
                    ...PLAYER_JS, method: 'addEventListener', value: event, listener: `listener-${event}-${crypto.randomUUID()}`,
                }), origin);
            }
        };

        const onMessage = (e: MessageEvent) => {
            if (e.origin !== origin || e.source !== frame.contentWindow) return;
            let msg: { context?: string; event?: string } | null = null;
            try { msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
            if (msg?.context !== PLAYER_JS.context) return;
            if (msg.event === 'ready') subscribe();
            // Playing counts as study activity: ActivityHeartbeat listens for
            // 'timeupdate' on the page, which can't hear inside Bunny's frame.
            else if (msg.event === 'timeupdate') frame.dispatchEvent(new Event('timeupdate'));
            else if (msg.event === 'ended') onEndedRef.current?.();
        };

        // If the player said "ready" before we were listening, subscribe anyway.
        const onLoad = () => { fallback = window.setTimeout(subscribe, 3000); };

        window.addEventListener('message', onMessage);
        frame.addEventListener('load', onLoad);
        return () => {
            window.removeEventListener('message', onMessage);
            frame.removeEventListener('load', onLoad);
            window.clearTimeout(fallback);
        };
    }, [src]);

    return (
        // 16:9, but never taller than 70% of the screen (like the other player).
        <div style={{ background: '#000' }}>
            <div style={{ position: 'relative', aspectRatio: '16 / 9', maxWidth: 'calc(70vh * 16 / 9)', margin: '0 auto' }}>
                <iframe
                    ref={frameRef}
                    src={src}
                    title="Lesson video"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                />
            </div>
        </div>
    );
}

/** A video in our own storage, in the browser's player. */
function StorageVideo({ lessonId, url, setLink, onEnded }: {
    lessonId: string;
    url: string;
    setLink: (link: LessonLink | null) => void;
    onEnded?: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const resumeAt = useRef<number | null>(null);
    const retrying = useRef(false);

    // The link expires after a couple of hours. If playback fails (e.g. a
    // student paused for a long time), get a fresh link and carry on from the
    // same spot. One retry at a time, so a broken file can't loop.
    const onError = useCallback(async () => {
        if (retrying.current) return;
        retrying.current = true;
        resumeAt.current = videoRef.current?.currentTime ?? 0;
        setLink(await fetchLessonLink(lessonId));
    }, [lessonId, setLink]);

    const onLoadedMetadata = () => {
        if (resumeAt.current !== null && videoRef.current) {
            videoRef.current.currentTime = resumeAt.current;
            resumeAt.current = null;
            retrying.current = false;
        }
    };

    return (
        <video
            ref={videoRef}
            src={url}
            controls
            controlsList="nodownload noremoteplayback"
            disableRemotePlayback
            onContextMenu={e => e.preventDefault()}
            onError={onError}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={onEnded}
            preload="metadata"
            style={{ width: '100%', maxHeight: '70vh', background: '#000', display: 'block' }}
        >
            Your browser does not support the video tag.
        </video>
    );
}

/**
 * Download button for a lesson whose file students may save. It asks for a
 * save-to-disk link when clicked (the server refuses lessons where downloading
 * is off), so the link is always fresh.
 */
export function LessonDownloadButton({ lessonId, label = 'Download', className = 'btn btn-secondary btn-sm' }: {
    lessonId: string;
    label?: string;
    className?: string;
}) {
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const download = async () => {
        setBusy(true);
        setFailed(false);
        try {
            const res = await fetch(`/api/lesson-media?lessonId=${encodeURIComponent(lessonId)}&download=1`, { cache: 'no-store' });
            const body = res.ok ? await res.json() : null;
            // The link is served as an attachment, so this downloads without leaving the page.
            if (typeof body?.url === 'string') window.location.href = body.url;
            else setFailed(true);
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };
    return (
        <button className={className} onClick={download} disabled={busy} title={failed ? 'Download failed — try again' : undefined}>
            {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : failed ? <AlertTriangle size={14} /> : <Download size={14} />}
            {failed ? 'Try again' : label}
        </button>
    );
}

/** A lesson PDF or slide deck: renders `children(url)` once the link is ready. */
export function LessonFile({ lessonId, label, height, children }: {
    lessonId: string;
    label: string;
    height?: number;
    children: (url: string) => ReactNode;
}) {
    const { link, failed } = useLessonLink(lessonId);
    if (!link?.url) return <Placeholder failed={failed || !!link} label={label} height={height} />;
    return <>{children(link.url)}</>;
}
