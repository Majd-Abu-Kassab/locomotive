import { Upload } from 'tus-js-client';

// Admin side of lesson video uploads to Bunny Stream: the file goes straight
// from the admin's browser to Bunny (any size, resumes after a dropped
// connection), using a one-video upload pass from /api/admin/bunny-upload.

const ROUTE = '/api/admin/bunny-upload';
export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'];

async function errorFrom(res: Response, fallback: string): Promise<Error> {
    const body = await res.json().catch(() => null);
    return new Error(typeof body?.error === 'string' ? body.error : fallback);
}

/** Whether lesson videos go to Bunny (its keys are set on the server). */
export async function bunnyConfigured(): Promise<boolean> {
    try {
        const res = await fetch(ROUTE, { cache: 'no-store' });
        if (!res.ok) return false;
        return (await res.json())?.configured === true;
    } catch {
        return false;
    }
}

/** Tells the server a lesson's Bunny video is no longer used, so it can be deleted (best effort). */
export function forgetBunnyVideo(contentUrl: string | null | undefined): void {
    const id = contentUrl?.startsWith('bunny:') ? contentUrl.slice('bunny:'.length) : null;
    if (id) fetch(`${ROUTE}?videoId=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
}

/**
 * Uploads a lesson's video to Bunny and makes the lesson play it. Bunny then
 * converts it, which takes a few minutes; until then the player says it's processing.
 */
export async function uploadLessonVideo(lessonId: string, file: File, onProgress: (percent: number) => void): Promise<void> {
    const start = await fetch(ROUTE, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lessonId }),
    });
    if (!start.ok) throw await errorFrom(start, 'Couldn’t start the upload.');
    const pass: { endpoint: string; libraryId: string; videoId: string; expires: number; signature: string; title: string } = await start.json();

    try {
        await new Promise<void>((resolve, reject) => {
            new Upload(file, {
                endpoint: pass.endpoint,
                // Keep trying through short connection drops, carrying on from where it stopped.
                retryDelays: [0, 3000, 10000, 30000, 60000],
                storeFingerprintForResuming: false,
                headers: {
                    AuthorizationSignature: pass.signature,
                    AuthorizationExpire: String(pass.expires),
                    VideoId: pass.videoId,
                    LibraryId: String(pass.libraryId),
                },
                metadata: { filetype: file.type || 'video/mp4', title: pass.title },
                onProgress: (sent, total) => onProgress(total ? Math.floor((sent / total) * 100) : 0),
                onSuccess: () => resolve(),
                onError: err => reject(err),
            }).start();
        });
    } catch (err) {
        forgetBunnyVideo(`bunny:${pass.videoId}`); // the empty video made for this upload
        console.error('Bunny upload failed:', err);
        throw new Error('The upload failed. Check your connection and try again.');
    }

    const finish = await fetch(ROUTE, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lessonId, videoId: pass.videoId }),
    });
    if (!finish.ok) throw await errorFrom(finish, 'The video uploaded, but couldn’t be attached to the lesson.');
}
