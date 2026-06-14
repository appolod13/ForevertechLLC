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

// Canonical production site. Stripe's success/cancel (back arrow) must always
// return here, never to a mistyped/alternate host like "pixelcrypt.com".
const CANONICAL_SITE_URL = 'https://pixelqrypt.com';

// Normalize any resolved origin so the misspelled "pixelcrypt" domain (and bare
// www) always maps back to the canonical pixelqrypt.com.
function normalizeOrigin(rawOrigin: string): string {
  const cleaned = rawOrigin.replace(/\/$/, '');
  if (!cleaned) return cleaned;
  try {
    const url = new URL(cleaned);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'pixelcrypt.com' || host === 'pixelqrypt.com') {
      return CANONICAL_SITE_URL;
    }
    return cleaned;
  } catch {
    return cleaned;
  }
}

function getRequestOrigin(request: Request): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (env) return normalizeOrigin(env);

  const hostHeader = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').trim();
  const host = hostHeader.split(',')[0]?.trim() || '';
  const protoHeader = (request.headers.get('x-forwarded-proto') || '').trim();
  const proto = protoHeader.split(',')[0]?.trim() || '';
  if (host) return normalizeOrigin(`${proto || 'https'}://${host}`);

  const origin = (request.headers.get('origin') || '').trim();
  if (origin) return normalizeOrigin(origin);

  return process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : CANONICAL_SITE_URL;
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const body: unknown = await request.json().catch(() => ({} as unknown));
    const b = isRecord(body) ? body : {};

    const code = getString(b.code, 128);
    const deviceId = getString(b.deviceId, 128) || 'anonymous';
    const userId = getString(b.userId, 128);
    const email = getString(b.email, 256);
    const galleryItemId = getString(b.galleryItemId, 64);
    const creatorUserId = getString(b.creatorUserId, 128);
    const creatorStripeAccountId = getString(b.creatorStripeAccountId, 64);

    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

    const origin = getRequestOrigin(request);
    if (!origin) return NextResponse.json({ error: 'Missing site origin. Set NEXT_PUBLIC_SITE_URL.' }, { status: 500 });

    const priceEnv = (process.env.PIXELQRYPT_DOWNLOAD_PRICE_CENTS || '').trim();
    const priceRaw = priceEnv ? Number(priceEnv) : 799;
    const unitAmount = Number.isFinite(priceRaw) ? Math.max(0, Math.min(100_000, Math.trunc(priceRaw))) : 799;

    // Creator revenue share (default 90% to creator, 10% platform fee).
    // Configurable via PIXELQRYPT_CREATOR_SHARE_BPS (basis points, e.g. 9000 = 90%).
    const shareBpsEnv = Number((process.env.PIXELQRYPT_CREATOR_SHARE_BPS || '').trim());
    const creatorShareBps = Number.isFinite(shareBpsEnv) ? Math.max(0, Math.min(10_000, Math.trunc(shareBpsEnv))) : 9000;
    const creatorShareAmount = Math.round((unitAmount * creatorShareBps) / 10_000);
    const platformFeeAmount = Math.max(0, unitAmount - creatorShareAmount);

    // Only enable Stripe Connect payouts when we actually have a creator account.
    // Without it, behavior is unchanged (platform receives the full amount).
    const enablePayout = Boolean(creatorStripeAccountId) && unitAmount > 0;
    const paymentIntentData = enablePayout
      ? {
          application_fee_amount: platformFeeAmount,
          transfer_data: { destination: creatorStripeAccountId },
          metadata: {
            pixelqryptCode: code,
            galleryItemId,
            creatorUserId,
            creatorStripeAccountId,
            creatorShareBps: String(creatorShareBps),
            creatorShareAmount: String(creatorShareAmount),
            platformFeeAmount: String(platformFeeAmount),
          },
        }
      : undefined;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'PixelQrypt™ Download Access' },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      ...(paymentIntentData ? { payment_intent_data: paymentIntentData } : {}),
      success_url: `${origin}/pixelqrypt?code=${encodeURIComponent(code)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pixelqrypt?code=${encodeURIComponent(code)}`,
      customer_email: email || undefined,
      metadata: {
        origin,
        deviceId,
        userId,
        pixelqryptCode: code,
        pixelqryptType: 'download',
        galleryItemId,
        creatorUserId,
        creatorStripeAccountId,
        creatorShareBps: String(creatorShareBps),
        creatorShareAmount: String(creatorShareAmount),
        platformFeeAmount: String(platformFeeAmount),
        payoutEnabled: String(enablePayout),
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal_error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
