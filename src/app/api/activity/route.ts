import { NextRequest } from 'next/server';
import { createClient as createSupabaseServer } from '@/lib/supabase-server';

// Activity heartbeat target, pinged by ActivityHeartbeat at most every 5
// minutes of interaction. The request passing through middleware refreshes
// the loco_last_activity cookie (the inactivity-timeout clock). When the
// student was on a study page (?study=1) it also adds those 5 minutes to
// their day (?day=YYYY-MM-DD, their local date) for the dashboard's study
// hours and streak.
export const dynamic = 'force-dynamic';

const PING_MINUTES = 5;

export async function GET(req: NextRequest) {
    const day = req.nextUrl.searchParams.get('day');
    if (req.nextUrl.searchParams.get('study') === '1' && day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
        try {
            const supabase = await createSupabaseServer();
            await supabase.rpc('log_study_minutes', { p_day: day, p_minutes: PING_MINUTES });
        } catch {
            // Study time is a nice-to-have; never fail the heartbeat over it.
        }
    }
    return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store' },
    });
}
