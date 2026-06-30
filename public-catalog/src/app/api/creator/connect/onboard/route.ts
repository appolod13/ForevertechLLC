import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '@/lib/supabase';

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
    const stripe = getStripeClient();
    const body: unknown = await request.json().catch(() => ({} as unknown));
    const b = isRecord(body) ? body : {};

    const userId = getString(b.userId, 128);
    const email = getString(b.email, 256);

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const origin = getRequestOrigin(request);
    if (!origin) return NextResponse.json({ error: 'Missing site origin. Set NEXT_PUBLIC_SITE_URL.' }, { status: 500 });

    const supabase = getServiceSupabase();
    let existingMeta: Record<string, unknown> = {};
    let existingAccountId = '';

    if (supabase) {
      const { data: current } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: null as unknown }));
      const meta =
        current && typeof current === 'object' && 'user' in current && (current as { user?: { user_metadata?: unknown } }).user?.user_metadata
          ? ((current as { user: { user_metadata: Record<string, unknown> } }).user.user_metadata as Record<string, unknown>)
          : {};
      existingMeta = meta;
      existingAccountId = typeof meta.stripeConnectAccountId === 'string' ? meta.stripeConnectAccountId : '';
    }

    const accountId = existingAccountId
      ? existingAccountId
      : (await stripe.accounts.create({
          type: 'express',
          email: email || undefined,
          capabilities: {
            transfers: { requested: true },
          },
          metadata: {
            userId,
          },
        })).id;

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/profile?upgrade=premium-creator`,
      return_url: `${origin}/profile?upgrade=premium-creator`,
      type: 'account_onboarding',
    });

    if (supabase) {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingMeta,
          stripeConnectAccountId: accountId,
        },
      });
    }

    return NextResponse.json({ url: link.url, accountId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'internal_error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

