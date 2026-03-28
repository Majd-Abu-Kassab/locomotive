import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const SECRET = process.env.PAYPAL_SECRET!;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
// Body: { orderId, paymentId, userId, sectionId }
export async function POST(req: NextRequest) {
    try {
        const { orderId, paymentId, userId, sectionId } = await req.json();

        if (!orderId || !userId || !sectionId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
                await supabase.from('payments').update({ status: 'failed' }).eq('id', paymentId);
            }
            return NextResponse.json({ error: 'Payment capture failed', details: captureData }, { status: 400 });
        }

        // Payment successful — update DB
        const now = new Date().toISOString();

        if (paymentId) {
            await supabase.from('payments').update({
                status: 'paid',
                paid_at: now,
                paypal_order_id: orderId,
            }).eq('id', paymentId);
        } else {
            // Create payment record if it doesn't exist yet
            const amount = parseFloat(
                captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0'
            );
            const { data: newPayment } = await supabase.from('payments').insert({
                user_id: userId,
                section_id: sectionId,
                amount,
                currency: 'EUR',
                status: 'paid',
                paypal_order_id: orderId,
                paid_at: now,
            }).select('id').single();

            if (newPayment?.id) {
                // Grant section access
                await supabase.from('student_section_access').upsert({
                    user_id: userId,
                    section_id: sectionId,
                    payment_id: newPayment.id,
                    status: 'active',
                    granted_by_admin: false,
                }, { onConflict: 'user_id,section_id' });
            }
        }

        // Grant access
        await supabase.from('student_section_access').upsert({
            user_id: userId,
            section_id: sectionId,
            status: 'active',
            granted_by_admin: false,
        }, { onConflict: 'user_id,section_id' });

        // Increment coupon uses if applicable
        const { data: payment } = await supabase
            .from('payments').select('coupon_id').eq('id', paymentId).single();
        if (payment?.coupon_id) {
            await supabase.rpc('increment_coupon_uses', { coupon_id: payment.coupon_id });
        }

        return NextResponse.json({ success: true, status: captureData.status });
    } catch (err) {
        console.error('capture-order error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
