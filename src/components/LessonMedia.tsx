'use client';

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Loader2, AlertTriangle, Download } from 'lucide-react';

// Lesson files are private; /api/lesson-media hands out a link that expires
// (see that route). These components fetch it and keep it working.

async function fetchLessonUrl(lessonId: string): Promise<string | null> {
    try {
        const res = await fetch(`/api/lesson-media?lessonId=${encodeURIComponent(lessonId)}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const body = await res.json();
        return typeof body.url === 'string' ? body.url : null;
    } catch {
        return null;
    }
}

/** The lesson's file link. Render keyed by lesson id so a new lesson starts fresh. */
function useLessonUrl(lessonId: string) {
    const [state, setState] = useState<{ url: string | null; failed: boolean }>({ url: null, failed: false });
    useEffect(() => {
        let cancelled = false;
        fetchLessonUrl(lessonId).then(url => { if (!cancelled) setState({ url, failed: !url }); });
        return () => { cancelled = true; };
    }, [lessonId]);
    return { ...state, setUrl: (url: string | null) => setState({ url, failed: !url }) };
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
 * or cast option in the player, no right-click "Save video as".
 */
export function LessonVideo({ lessonId, onEnded }: { lessonId: string; onEnded?: () => void }) {
    const { url, failed, setUrl } = useLessonUrl(lessonId);
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
        setUrl(await fetchLessonUrl(lessonId));
    }, [lessonId, setUrl]);

    const onLoadedMetadata = () => {
        if (resumeAt.current !== null && videoRef.current) {
            videoRef.current.currentTime = resumeAt.current;
            resumeAt.current = null;
            retrying.current = false;
        }
    };

    if (!url) return <Placeholder failed={failed} label="video" />;

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
    const { url, failed } = useLessonUrl(lessonId);
    if (!url) return <Placeholder failed={failed} label={label} height={height} />;
    return <>{children(url)}</>;
}
