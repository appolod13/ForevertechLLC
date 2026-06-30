import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '@/lib/supabase';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(secretKey);
}

function getString(v: unknown, maxLen = 400): string {
  const s = typeof v === 'string' ? v : '';
  const t = s.trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = getString(searchParams.get('session_id'), 128);
    const userId = getString(searchParams.get('userId'), 128);

    if (!sessionId || !userId) {
      return NextResponse.json({ success: false, error: 'missing_params' }, { status: 400 });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) return NextResponse.json({ success: false, error: 'not_paid' }, { status: 402 });

    const metaUserId = getString(session.metadata?.userId, 128);
    if (metaUserId && metaUserId !== userId) {
      return NextResponse.json({ success: false, error: 'user_mismatch' }, { status: 403 });
    }

    const supabase = getServiceSupabase();
    if (supabase) {
      const { data: current } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: null as unknown }));
      const existingMeta =
        current && typeof current === 'object' && 'user' in current && (current as { user?: { user_metadata?: unknown } }).user?.user_metadata
          ? ((current as { user: { user_metadata: Record<string, unknown> } }).user.user_metadata as Record<string, unknown>)
          : {};

      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingMeta,
          premiumCreator: true,
        },
      });
    }

    return NextResponse.json({ success: true, premiumCreator: true });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'internal_error' }, { status: 500 });
  }
}

