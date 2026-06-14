import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getRequestOrigin } from '@/lib/siteOrigin';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(secretKey);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(v: unknown, maxLen = 256): string {
  const s = typeof v === 'string' ? v : '';
  const t = s.trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

/**
 * Creates (or reuses) a Stripe Connect Express account for a creator and returns
 * an onboarding link. After onboarding, the returned accountId should be stored
 * against the creator's PixelQrypt designs so 90% of each sale is routed to them.
 */
export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const body: unknown = await request.json().catch(() => ({} as unknown));
    const b = isRecord(body) ? body : {};

    const email = getString(b.email, 256);
    let accountId = getString(b.accountId, 64);

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: email || undefined,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: 'individual',
        metadata: { product: 'pixelqrypt_creator' },
      });
      accountId = account.id;
    }

    const origin = getRequestOrigin(request);
    if (!origin) {
      return NextResponse.json({ error: 'Missing site origin. Set NEXT_PUBLIC_SITE_URL.' }, { status: 500 });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/creator/payouts?refresh=1`,
      return_url: `${origin}/creator/payouts?account=${encodeURIComponent(accountId)}`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ accountId, url: accountLink.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal_error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Returns the payout-readiness of a connected account so the UI can show whether
 * a creator can receive their 90% share yet.
 */
export async function GET(request: Request) {
  try {
    const stripe = getStripeClient();
    const { searchParams } = new URL(request.url);
    const accountId = getString(searchParams.get('accountId'), 64);
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }

    const account = await stripe.accounts.retrieve(accountId);
    return NextResponse.json({
      accountId,
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
      transfersActive: account.capabilities?.transfers === 'active',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal_error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
