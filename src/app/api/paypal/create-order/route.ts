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
        const body = await req.json();
        const { amount, currency = 'EUR', description, sectionId } = body;

        console.log('=== PayPal Create Order ===');
        console.log('Request body:', JSON.stringify(body));
        console.log('PAYPAL_MODE:', process.env.PAYPAL_MODE);
        console.log('PAYPAL_BASE:', PAYPAL_BASE);
        console.log('CLIENT_ID exists:', !!CLIENT_ID);
        console.log('SECRET exists:', !!SECRET);

        if (!amount || amount <= 0) {
            console.error('Invalid amount:', amount);
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        if (!CLIENT_ID || !SECRET) {
            console.error('Missing PayPal credentials');
            return NextResponse.json({ error: 'PayPal not configured' }, { status: 500 });
        }

        console.log('Getting access token...');
        const token = await getAccessToken();
        console.log('Access token obtained:', !!token);

        if (!token) {
            console.error('Failed to get PayPal access token');
            return NextResponse.json({ error: 'PayPal authentication failed' }, { status: 500 });
        }

        const orderPayload = {
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: currency,
                    value: Number(amount).toFixed(2),
                },
                description: description || 'LOCOMOTIVE Course Access',
            }],
            application_context: {
                brand_name: 'LOCOMOTIVE',
                user_action: 'PAY_NOW',
            },
        };
        console.log('Order payload:', JSON.stringify(orderPayload));

        const order = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderPayload),
        });

        const orderData = await order.json();
        console.log('PayPal response status:', order.status);
        console.log('PayPal response:', JSON.stringify(orderData));

        if (!order.ok) {
            console.error('PayPal create order error:', JSON.stringify(orderData, null, 2));
            return NextResponse.json({
                error: 'Failed to create PayPal order',
                details: orderData,
            }, { status: order.status });
        }

        return NextResponse.json({
            orderId: orderData.id,
            approvalUrl: orderData.links?.find((l: { rel: string; href: string }) => l.rel === 'approve')?.href,
        });
    } catch (err) {
        console.error('create-order error:', err);
        return NextResponse.json({ error: 'Internal server error', message: String(err) }, { status: 500 });
    }
}
