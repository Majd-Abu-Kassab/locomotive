import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseServer } from '@/lib/supabase-server';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const SECRET = process.env.PAYPAL_SECRET!;

const createOrderSchema = z.object({
    sectionId: z.string().min(1, "sectionId is required"),
    currency: z.string().optional().default('EUR'),
    couponCode: z.string().optional()
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

// POST /api/paypal/create-order
// Body: { sectionId, currency?, couponCode? }
// Price is resolved SERVER-SIDE from sectionId so the client cannot manipulate it.
export async function POST(req: NextRequest) {
    try {
        // --- Rate Limiting (H2) ---
        if (ratelimit) {
            const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
            const { success } = await ratelimit.limit(`ratelimit_${ip}`);
            if (!success) {
                return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
            }
        }

        // --- Auth: require a logged-in user ---
        const supabase = await createSupabaseServer();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // --- Request Validation (M3) ---
        const rawBody = await req.json();
        const parsed = createOrderSchema.safeParse(rawBody);
        
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request parameters', details: parsed.error.format() }, { status: 400 });
        }
        
        const { sectionId, currency, couponCode } = parsed.data;

        if (!CLIENT_ID || !SECRET) {
            return NextResponse.json({ error: 'PayPal not configured' }, { status: 500 });
        }

        // --- Resolve price server-side ---
        const { data: section, error: sectionErr } = await supabase
            .from('course_sections')
            .select('id, name, price, currency, course_id, courses(name)')
            .eq('id', sectionId)
            .single();

        if (sectionErr || !section) {
            return NextResponse.json({ error: 'Section not found' }, { status: 404 });
        }

        let finalPrice: number = Number(section.price);
        let couponId: string | null = null;
        let discountAmount = 0;

        // --- Server-side coupon validation (M2 fix) ---
        if (couponCode && couponCode.trim()) {
            const { data: coupon } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', couponCode.trim().toUpperCase())
                .eq('is_active', true)
                .single();

            if (coupon) {
                const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                const maxedOut = coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses;

                if (!expired && !maxedOut) {
                    discountAmount = coupon.type === 'percentage'
                        ? Math.min(finalPrice * (coupon.value / 100), finalPrice)
                        : Math.min(coupon.value, finalPrice);
                    discountAmount = Math.round(discountAmount * 100) / 100;
                    finalPrice = Math.max(0, finalPrice - discountAmount);
                    couponId = coupon.id;
                }
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const courseName = (section as any).courses?.name || 'LOCOMOTIVE Course';
        const description = `${courseName} — ${section.name}`;

        const token = await getAccessToken();
        if (!token) {
            return NextResponse.json({ error: 'PayPal authentication failed' }, { status: 500 });
        }

        const orderPayload = {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: section.currency || currency,
                    value: finalPrice.toFixed(2),
                },
                description,
            }],
            application_context: {
                brand_name: 'LOCOMOTIVE',
                user_action: 'PAY_NOW',
            },
        };

        const order = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderPayload),
        });

        const orderData = await order.json();

        if (!order.ok) {
            console.error('PayPal create order error:', JSON.stringify(orderData, null, 2));
            return NextResponse.json({
                error: 'Failed to create PayPal order',
                details: orderData,
            }, { status: order.status });
        }

        return NextResponse.json({
            orderId: orderData.id,
            finalPrice,
            discountAmount,
            couponId,
            approvalUrl: orderData.links?.find((l: { rel: string; href: string }) => l.rel === 'approve')?.href,
        });
    } catch (err) {
        console.error('create-order error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
