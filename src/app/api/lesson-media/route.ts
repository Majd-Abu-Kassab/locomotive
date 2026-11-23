import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createSupabaseServer } from '@/lib/supabase-server';
import { bunnyConfig, bunnyEmbedUrl, bunnyVideoId } from '@/lib/bunny';

// GET /api/lesson-media?lessonId=…[&download=1]
// Lesson PDFs, slides and older videos live in the private 'course-content'
// bucket; newer videos are on Bunny Stream (lib/bunny.ts). Students never get
// a permanent address: after checking they're signed in and allowed into the
// lesson, this returns a link that expires ({ url }, or { embedUrl } for
// Bunny's player), so it can't be shared or reused, and paid lessons can't be
// opened without access.
// download=1 asks for a save-to-disk link, given only for lessons an admin
// allowed to be downloaded (and slide decks, which can't be viewed otherwise).
export const dynamic = 'force-dynamic';

const BUCKET = 'course-content';
// Long enough for a long lecture with pauses. The video player asks for a
// fresh link if one expires mid-video.
const LINK_SECONDS = 2 * 60 * 60;

const noStore = { 'Cache-Control': 'no-store' };

// Lessons store the bucket's public-style URL from upload time:
//   https://<project>.supabase.co/storage/v1/object/public/course-content/<path>
function storagePath(contentUrl: string): string | null {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const at = contentUrl.indexOf(marker);
    if (at === -1) return null;
    return decodeURIComponent(contentUrl.slice(at + marker.length).split('?')[0]);
}

export async function GET(req: NextRequest) {
    const lessonId = req.nextUrl.searchParams.get('lessonId');
    const wantsDownload = req.nextUrl.searchParams.get('download') === '1';
    if (!lessonId) return NextResponse.json({ error: 'lessonId is required' }, { status: 400, headers: noStore });

    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore });

    // Service role: reads access tables and signs links regardless of RLS.
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    try {
        const { data: lesson } = await admin
            .from('topics')
            .select('id, module_id, name, content_url, content_type, allow_download')
            .eq('id', lessonId)
            .maybeSingle();
        if (!lesson?.content_url) return NextResponse.json({ error: 'No content' }, { status: 404, headers: noStore });

        const canDownload = !!lesson.allow_download || lesson.content_type === 'presentation';
        if (wantsDownload && !canDownload) {
            return NextResponse.json({ error: 'Downloading this file is turned off' }, { status: 403, headers: noStore });
        }

        // Same rule as the lesson page: a module that's in no paid section is
        // free; otherwise the student needs access to a section containing it.
        // Staff can open everything.
        const [{ data: sections }, { data: profile }] = await Promise.all([
            admin.from('section_module_map').select('section_id').eq('module_id', lesson.module_id),
            admin.from('profiles').select('admin_role').eq('id', user.id).maybeSingle(),
        ]);
        const sectionIds = (sections ?? []).map(s => s.section_id);
        if (sectionIds.length > 0 && !profile?.admin_role) {
            const { data: access } = await admin
                .from('student_section_access')
                .select('id')
                .eq('user_id', user.id)
                .in('section_id', sectionIds)
                .in('status', ['active', 'free_grant'])
                .limit(1);
            if (!access?.length) return NextResponse.json({ error: 'Locked' }, { status: 403, headers: noStore });
        }

        // A video on Bunny Stream: Bunny's player, at an address that expires.
        // Videos are never downloadable.
        const bunnyId = bunnyVideoId(lesson.content_url);
        if (bunnyId) {
            if (wantsDownload) return NextResponse.json({ error: 'Videos can’t be downloaded' }, { status: 403, headers: noStore });
            const cfg = bunnyConfig();
            if (!cfg) {
                console.error('lesson-media: lesson', lesson.id, 'is on Bunny but BUNNY_STREAM_* is not set');
                return NextResponse.json({ error: 'Could not load this video' }, { status: 500, headers: noStore });
            }
            return NextResponse.json({ embedUrl: bunnyEmbedUrl(cfg, bunnyId, LINK_SECONDS) }, { headers: noStore });
        }

        const path = storagePath(lesson.content_url);
        if (!path) {
            // Not one of our uploads (e.g. an external link) — nothing to sign.
            return NextResponse.json({ url: lesson.content_url }, { headers: noStore });
        }

        // A download link saves the file under the lesson's name instead of opening it.
        const ext = path.split('.').pop();
        const fileName = `${lesson.name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'lesson'}.${ext}`;
        const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(
            path, LINK_SECONDS, wantsDownload ? { download: fileName } : undefined,
        );
        if (error || !data) {
            console.error('lesson-media sign error:', error);
            return NextResponse.json({ error: 'Could not load this file' }, { status: 500, headers: noStore });
        }
        return NextResponse.json({ url: data.signedUrl }, { headers: noStore });
    } catch (err) {
        console.error('lesson-media error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStore });
    }
}
