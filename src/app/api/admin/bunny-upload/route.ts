import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createSupabaseServer } from '@/lib/supabase-server';
import {
    BUNNY_PREFIX, bunnyConfig, bunnyCreateVideo, bunnyDeleteVideo, bunnyUploadAuth, bunnyVideoId, isBunnyVideoId,
} from '@/lib/bunny';

// Admin uploads of lesson videos to Bunny Stream (see lib/bunny.ts).
//   GET                     → { configured }: whether videos go to Bunny
//   POST   { lessonId }     → creates the video in Bunny and returns what the
//                             browser needs to upload the file straight there
//   PATCH  { lessonId, videoId } → the upload finished: the lesson now plays
//                             that video (and its previous Bunny video is deleted)
//   DELETE ?videoId=…       → removes a video no lesson uses (a failed or
//                             cancelled upload, or a deleted lesson's video)
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };
// Long enough for a big lecture on a slow connection; it only allows
// uploading into the one video created for it.
const UPLOAD_SECONDS = 12 * 60 * 60;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: noStore });

/** The service-role client if the caller is a signed-in admin, else null. */
async function adminClient(): Promise<SupabaseClient | null> {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: profile } = await admin.from('profiles').select('admin_role').eq('id', user.id).maybeSingle();
    return profile?.admin_role ? admin : null;
}

async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
    try {
        const body = await req.json();
        return body && typeof body === 'object' ? body : {};
    } catch {
        return {};
    }
}

export async function GET() {
    if (!await adminClient()) return fail('Admins only', 403);
    return NextResponse.json({ configured: !!bunnyConfig() }, { headers: noStore });
}

export async function POST(req: NextRequest) {
    const admin = await adminClient();
    if (!admin) return fail('Admins only', 403);
    const cfg = bunnyConfig();
    if (!cfg) return fail('The video service isn’t set up yet', 501);

    const { lessonId } = await readJson(req);
    if (typeof lessonId !== 'string' || !lessonId) return fail('lessonId is required', 400);
    const { data: lesson } = await admin.from('topics').select('id, name').eq('id', lessonId).maybeSingle();
    if (!lesson) return fail('Lesson not found', 404);

    try {
        // Named after the lesson, so it's easy to find in Bunny's dashboard.
        const title = `${lesson.name} (${lesson.id})`.slice(0, 200);
        const videoId = await bunnyCreateVideo(cfg, title);
        return NextResponse.json({ ...bunnyUploadAuth(cfg, videoId, UPLOAD_SECONDS), title }, { headers: noStore });
    } catch (err) {
        console.error('bunny-upload start:', err);
        return fail('Couldn’t reach the video service. Try again in a moment.', 502);
    }
}

export async function PATCH(req: NextRequest) {
    const admin = await adminClient();
    if (!admin) return fail('Admins only', 403);
    const cfg = bunnyConfig();
    if (!cfg) return fail('The video service isn’t set up yet', 501);

    const { lessonId, videoId } = await readJson(req);
    if (typeof lessonId !== 'string' || !lessonId || !isBunnyVideoId(videoId)) return fail('lessonId and videoId are required', 400);

    const { data: lesson } = await admin.from('topics').select('id, content_url').eq('id', lessonId).maybeSingle();
    if (!lesson) return fail('Lesson not found', 404);

    const { error } = await admin.from('topics')
        .update({ content_url: BUNNY_PREFIX + videoId, content_type: 'video' })
        .eq('id', lessonId);
    if (error) {
        console.error('bunny-upload finish:', error);
        return fail('The video uploaded, but couldn’t be attached to the lesson. Try again.', 500);
    }

    // The video it replaces is no longer used by this lesson; delete it unless
    // another lesson still plays it.
    const previous = bunnyVideoId(lesson.content_url);
    if (previous && previous !== videoId) await deleteIfUnused(admin, previous);
    return NextResponse.json({ ok: true }, { headers: noStore });
}

export async function DELETE(req: NextRequest) {
    const admin = await adminClient();
    if (!admin) return fail('Admins only', 403);
    const videoId = req.nextUrl.searchParams.get('videoId');
    if (!isBunnyVideoId(videoId)) return fail('videoId is required', 400);
    if (!bunnyConfig()) return fail('The video service isn’t set up yet', 501);
    const deleted = await deleteIfUnused(admin, videoId);
    return NextResponse.json({ deleted }, { headers: noStore });
}

/** Deletes a Bunny video unless a lesson still plays it. True if deleted. */
async function deleteIfUnused(admin: SupabaseClient, videoId: string): Promise<boolean> {
    const cfg = bunnyConfig();
    if (!cfg) return false;
    const { count, error } = await admin.from('topics')
        .select('id', { count: 'exact', head: true })
        .eq('content_url', BUNNY_PREFIX + videoId);
    if (error || count !== 0) return false;
    try {
        await bunnyDeleteVideo(cfg, videoId);
        return true;
    } catch (err) {
        // Not fatal: it only leaves an unused video in Bunny's library.
        console.error('bunny-upload delete:', err);
        return false;
    }
}
