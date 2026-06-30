import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(secretKey);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(v: unknown, maxLen = 400): string {
  const s = typeof v === 'string' ? v : '';
  const t = s.trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function getRequestOrigin(request: Request): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (env) return env.replace(/\/$/, '');

  const hostHeader = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').trim();
  const host = hostHeader.split(',')[0]?.trim() || '';
  const protoHeader = (request.headers.get('x-forwarded-proto') || '').trim();
  const proto = protoHeader.split(',')[0]?.trim() || '';
  if (host) return `${proto || 'https'}://${host}`;

  const origin = (request.headers.get('origin') || '').trim();
  if (origin) return origin.replace(/\/$/, '');

  return process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : '';
}

export async function POST(request: Request) {
  try {
    const priceId = (process.env.STRIPE_PREMIUM_CREATOR_PRICE_ID || '').trim();
    if (!priceId) {
      return NextResponse.json({ error: 'Missing STRIPE_PREMIUM_CREATOR_PRICE_ID' }, { status: 500 });
    }

    const stripe = getStripeClient();
    const body: unknown = await request.json().catch(() => ({} as unknown));
    const b = isRecord(body) ? body : {};

    const userId = getString(b.userId, 128);
    const email = getString(b.email, 256);

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const origin = getRequestOrigin(request);
    if (!origin) return NextResponse.json({ error: 'Missing site origin. Set NEXT_PUBLIC_SITE_URL.' }, { status: 500 });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/profile?creator_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/profile?upgrade=premium-creator`,
      customer_email: email || undefined,
      metadata: {
        premiumType: 'premium_creator',
        userId,
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal_error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

