// Activity heartbeat target. The response itself is empty — the point is the
// request passing through middleware, which refreshes the loco_last_activity
// cookie (the inactivity-timeout clock). Pinged by ActivityHeartbeat.
export const dynamic = 'force-dynamic';

export function GET() {
    return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store' },
    });
}
