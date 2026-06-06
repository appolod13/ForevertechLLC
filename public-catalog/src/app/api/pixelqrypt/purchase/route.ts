import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '@/lib/supabase';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(secretKey, { apiVersion: '2026-05-27.dahlia' });
}

function getString(v: unknown, maxLen = 400): string {
  const s = typeof v === 'string' ? v : '';
  const t = s.trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = getString(searchParams.get('code'), 128);
    const sessionId = getString(searchParams.get('session_id'), 128);
    const deviceId = getString(searchParams.get('deviceId'), 128);

    if (!code || !sessionId) {
      return NextResponse.json({ success: false, error: 'missing_params' }, { status: 400 });
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) return NextResponse.json({ success: false, error: 'not_paid' }, { status: 402 });

    const metaCode = getString(session.metadata?.pixelqryptCode, 128);
    if (metaCode && metaCode !== code) {
      return NextResponse.json({ success: false, error: 'code_mismatch' }, { status: 403 });
    }

    const metaDeviceId = getString(session.metadata?.deviceId, 128);
    if (metaDeviceId && deviceId && metaDeviceId !== deviceId) {
      return NextResponse.json({ success: false, error: 'device_mismatch' }, { status: 403 });
    }

    const supabase = getServiceSupabase();
    if (!supabase) return NextResponse.json({ success: false, error: 'supabase_not_configured' }, { status: 500 });

    const { data: msg, error: msgErr } = await supabase
      .from('quantum_hidden_messages')
      .select('*')
      .eq('quantum_verification_code', code)
      .single();

    if (msgErr || !msg) return NextResponse.json({ success: false, error: 'invalid_code' }, { status: 404 });

    const { data: gallery, error: galleryErr } = await supabase
      .from('gallery_items')
      .select('*')
      .eq('id', msg.gallery_item_id)
      .single();

    if (galleryErr || !gallery) return NextResponse.json({ success: false, error: 'missing_gallery_item' }, { status: 404 });

    const entitlementType = getString(session.metadata?.pixelqryptType, 48) || 'download';
    const userId = getString(session.metadata?.userId, 128) || null;

    const { error: entErr } = await supabase
      .from('pixelqrypt_entitlements')
      .insert({
        quantum_verification_code: code,
        stripe_checkout_session_id: sessionId,
        device_id: metaDeviceId || deviceId || null,
        user_id: userId,
        entitlement_type: entitlementType,
      });

    if (entErr && (entErr as unknown as { code?: string }).code !== '23505') {
      return NextResponse.json({ success: false, error: entErr.message || 'entitlement_insert_failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      purchased: true,
      entitlementType,
      imageUrl: gallery.image_url,
      prompt: gallery.prompt,
      galleryItemId: msg.gallery_item_id,
    });
  } catch (e: unknown) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'internal_error' }, { status: 500 });
  }
}
