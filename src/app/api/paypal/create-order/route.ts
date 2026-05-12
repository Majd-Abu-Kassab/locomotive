import { NextRequest, NextResponse } from 'next/server';

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const SECRET = process.env.PAYPAL_SECRET!;

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
// Body: { sectionId, amount, currency, description }
export async function POST(req: NextRequest) {
    try {
        const { amount, currency = 'EUR', description, sectionId } = await req.json();

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const token = await getAccessToken();

        const order = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: currency,
                        value: amount.toFixed(2),
                    },
                    description: description || 'LOCOMOTIVE Course Access',
                }],
                application_context: {
                    brand_name: 'LOCOMOTIVE',
                    user_action: 'PAY_NOW',
                },
            }),
        });

        const orderData = await order.json();

        if (!order.ok) {
            console.error('PayPal create order error:', orderData);
            return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 });
        }

        return NextResponse.json({
            orderId: orderData.id,
            approvalUrl: orderData.links?.find((l: { rel: string; href: string }) => l.rel === 'approve')?.href,
        });
    } catch (err) {
        console.error('create-order error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
