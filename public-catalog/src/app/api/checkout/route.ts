import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(secretKey, { apiVersion: '2026-03-25.dahlia' });
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const { items, customerEmail, customerName, metadata, deviceId, userId } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const lineItems = items.map((item: { price: string | number; title: string; image?: string; imageUrl?: string; quantity?: number }) => {
      const unitAmount = Math.round(Number(item.price) * 100);
      const imageUrl = item.imageUrl || item.image;

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.title || 'Product',
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: unitAmount,
        },
        quantity: item.quantity || 1,
      };
    });

    const origin = request.headers.get('origin') || 'http://localhost:3001';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      customer_email: customerEmail || undefined,
      metadata: {
        customerName: customerName || '',
        deviceId: String(deviceId || ''),
        userId: String(userId || ''),
        origin,
        ...(metadata || {}),
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Stripe error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
