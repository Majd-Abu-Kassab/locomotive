import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createSupabaseServer } from '@/lib/supabase-server';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const SECRET = process.env.PAYPAL_SECRET!;

const captureOrderSchema = z.object({
    orderId: z.string().min(1, 'orderId is required'),
    paymentId: z.string().optional(),
    sectionId: z.string().min(1, 'sectionId is required')
});

const ratelimit = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? new Ratelimit({
          redis: kv,
          limiter: Ratelimit.slidingWindow(5, '10 s'),
          analytics: true,
      })
    : null;

async function getAccessToken(): Promise<string> {
    const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    return data.access_token;
}

// POST /api/paypal/capture-order
// Body: { orderId, paymentId?, sectionId }
export async function POST(req: NextRequest) {
    // --- C3 fix: service-role client created inside handler, not at module scope ---
    const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // --- Rate Limiting (H2) ---
        if (ratelimit) {
            const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
            const { success } = await ratelimit.limit(`ratelimit_${ip}`);
            if (!success) {
                return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
            }
        }

        // --- C1 fix: verify the caller is actually the authenticated user ---
        const supabase = await createSupabaseServer();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // --- Request Validation (M3) ---
        const rawBody = await req.json();
        const parsed = captureOrderSchema.safeParse(rawBody);
        
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request parameters', details: parsed.error.format() }, { status: 400 });
        }

        const { orderId, paymentId, sectionId } = parsed.data;

        // --- Security: verify sectionId belongs to a valid section ---
        const { data: section, error: sectionErr } = await adminSupabase
            .from('course_sections')
            .select('id')
            .eq('id', sectionId)
            .single();

        if (sectionErr || !section) {
            return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
        }

        // --- Security: if paymentId provided, verify it belongs to this user ---
        if (paymentId) {
            const { data: payment, error: paymentErr } = await adminSupabase
                .from('payments')
                .select('id, user_id')
                .eq('id', paymentId)
                .single();

            if (paymentErr || !payment || payment.user_id !== user.id) {
                return NextResponse.json({ error: 'Invalid payment reference' }, { status: 403 });
            }
        }

        const token = await getAccessToken();

        // Capture the PayPal order
        const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const captureData = await captureRes.json();

        if (!captureRes.ok || captureData.status !== 'COMPLETED') {
            console.error('PayPal capture failed:', captureData);

            // Update payment to failed
            if (paymentId) {
                await adminSupabase.from('payments').update({ status: 'failed' }).eq('id', paymentId);
            }
            return NextResponse.json({ error: 'Payment capture failed', details: captureData }, { status: 400 });
        }

        // Payment successful — update DB
        const now = new Date().toISOString();

        if (paymentId) {
            await adminSupabase.from('payments').update({
                status: 'paid',
                paid_at: now,
                paypal_order_id: orderId,
            }).eq('id', paymentId);
        } else {
            // Create payment record if it doesn't exist yet
            const amount = parseFloat(
                captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0'
            );
            const { data: newPayment } = await adminSupabase.from('payments').insert({
                user_id: user.id,   // Use the verified session user, not client-supplied userId
                section_id: sectionId,
                amount,
                currency: 'EUR',
                status: 'paid',
                paypal_order_id: orderId,
                paid_at: now,
            }).select('id').single();

            if (newPayment?.id) {
                await adminSupabase.from('student_section_access').upsert({
                    user_id: user.id,
                    section_id: sectionId,
                    payment_id: newPayment.id,
                    status: 'active',
                    granted_by_admin: false,
                }, { onConflict: 'user_id,section_id' });
            }
        }

        // Grant access (idempotent upsert — safe to call twice)
        await adminSupabase.from('student_section_access').upsert({
            user_id: user.id,   // Always use verified session user
            section_id: sectionId,
            status: 'active',
            granted_by_admin: false,
        }, { onConflict: 'user_id,section_id' });

        // Increment coupon uses if applicable
        if (paymentId) {
            const { data: payment } = await adminSupabase
                .from('payments').select('coupon_id').eq('id', paymentId).single();
            if (payment?.coupon_id) {
                await adminSupabase.rpc('increment_coupon_uses', { coupon_id: payment.coupon_id });
            }
        }

        return NextResponse.json({ success: true, status: captureData.status });
    } catch (err) {
        console.error('capture-order error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
