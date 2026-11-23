import { createHash } from 'crypto';

// Lesson videos on Bunny Stream (bunny.net), which converts each upload into
// several qualities and streams the right one for the viewer's connection.
// A lesson whose video is on Bunny has content_url "bunny:<video id>";
// everything else (PDFs, slides, older videos) stays in Supabase Storage.
//
// Server only: this uses the library's secret keys, set in Vercel's
// environment variables (and .env.local for local testing):
//   BUNNY_STREAM_LIBRARY_ID  Stream > library > API: "Video library ID"
//   BUNNY_STREAM_API_KEY     Stream > library > API: "API Key" (the library's, not the account's)
//   BUNNY_STREAM_TOKEN_KEY   Stream > library > Security: "Token authentication key"
// Without them, video uploads keep going to Supabase Storage as before.

export const BUNNY_PREFIX = 'bunny:';
const API = 'https://video.bunnycdn.com';
const VIDEO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface BunnyConfig { libraryId: string; apiKey: string; tokenKey: string; }

export function bunnyConfig(): BunnyConfig | null {
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim();
    const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
    const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY?.trim();
    return libraryId && apiKey && tokenKey ? { libraryId, apiKey, tokenKey } : null;
}

export const isBunnyVideoId = (id: unknown): id is string => typeof id === 'string' && VIDEO_ID.test(id);

/** The Bunny video id in a lesson's content_url, or null if it isn't a Bunny video. */
export function bunnyVideoId(contentUrl: string | null | undefined): string | null {
    if (!contentUrl?.startsWith(BUNNY_PREFIX)) return null;
    const id = contentUrl.slice(BUNNY_PREFIX.length);
    return isBunnyVideoId(id) ? id : null;
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const unixIn = (seconds: number) => Math.floor(Date.now() / 1000) + seconds;

/**
 * Bunny's player for one video, at an address that stops working after
 * `seconds` (the library's Token Authentication), so it can't be shared.
 */
export function bunnyEmbedUrl(cfg: BunnyConfig, videoId: string, seconds: number): string {
    const expires = unixIn(seconds);
    const token = sha256(cfg.tokenKey + videoId + expires);
    const params = new URLSearchParams({ token, expires: String(expires), autoplay: 'false', preload: 'false' });
    return `https://player.mediadelivery.net/embed/${cfg.libraryId}/${videoId}?${params}`;
}

/**
 * Lets an admin's browser upload one file straight to Bunny (resumable "TUS"
 * upload) into the given video, without ever seeing the API key: the
 * signature only allows uploading to that video, until it expires.
 */
export function bunnyUploadAuth(cfg: BunnyConfig, videoId: string, seconds: number) {
    const expires = unixIn(seconds);
    return {
        endpoint: `${API}/tusupload`,
        libraryId: cfg.libraryId,
        videoId,
        expires,
        signature: sha256(cfg.libraryId + cfg.apiKey + expires + videoId),
    };
}

function api(cfg: BunnyConfig, path: string, init: RequestInit = {}) {
    return fetch(`${API}/library/${encodeURIComponent(cfg.libraryId)}${path}`, {
        ...init,
        cache: 'no-store',
        headers: {
            AccessKey: cfg.apiKey,
            accept: 'application/json',
            ...(init.body ? { 'content-type': 'application/json' } : {}),
        },
    });
}

/** Creates an empty video in the library (the upload fills it); returns its id. */
export async function bunnyCreateVideo(cfg: BunnyConfig, title: string): Promise<string> {
    const res = await api(cfg, '/videos', { method: 'POST', body: JSON.stringify({ title }) });
    if (!res.ok) throw new Error(`Bunny refused to create the video (HTTP ${res.status})`);
    const body = await res.json().catch(() => null);
    if (!isBunnyVideoId(body?.guid)) throw new Error('Bunny did not return a video id');
    return body.guid;
}

/** Deletes a video from the library; one that's already gone counts as deleted. */
export async function bunnyDeleteVideo(cfg: BunnyConfig, videoId: string): Promise<void> {
    const res = await api(cfg, `/videos/${encodeURIComponent(videoId)}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`Bunny refused to delete the video (HTTP ${res.status})`);
}
