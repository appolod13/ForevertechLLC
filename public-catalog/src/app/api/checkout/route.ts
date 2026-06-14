import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { quoteShipping } from '@/lib/shippingConfig';
import { getQuantumStatus } from '@/lib/quantumVerified';
import { getCart } from '@/lib/cartStore';
import { getServiceSupabase } from '@/lib/supabase';
import { getRequestOrigin } from '@/lib/siteOrigin';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(secretKey);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getString(v: unknown, maxLen = 300): string {
  const s = typeof v === 'string' ? v : '';
  const t = s.trim();
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function getNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : NaN;
}

function normalizeCustomerQrUrl(input: unknown): string {
  const raw = getString(input, 400);
  if (!raw) return '';
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return '';
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
  const href = u.toString();
  return href.length > 350 ? href.slice(0, 350) : href;
}

// getRequestOrigin is imported from '@/lib/siteOrigin' and canonicalizes the host
// so Stripe redirect URLs always return to pixelqrypt.com.

function resolveUnitAmountCents(item: unknown): number | null {
  const rec = isRecord(item) ? item : {};
  const meta = isRecord(rec.metadata) ? (rec.metadata as Record<string, unknown>) : {};
  const productId = getString(meta.productId, 64) || getString(rec.productId, 64);

  // Prefer an explicit cents amount if provided.
  const metaCents = getNumber(meta.unitAmountCents);
  if (Number.isFinite(metaCents) && metaCents > 0) {
    return Math.round(metaCents);
  }

  // Otherwise use the cart item's price (in dollars) and convert to cents.
  const priceDollars = getNumber(rec.price);
  if (Number.isFinite(priceDollars) && priceDollars > 0) {
    return Math.round(priceDollars * 100);
  }

  // Fallback for the legacy hardcoded tee product.
  if (productId === 'tee') return 4999;
  return null;
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const body: unknown = await request.json().catch(() => ({} as unknown));
    const b = isRecord(body) ? body : {};
    const quantumVerified = Boolean(b.quantumVerified);
    const customerEmail = getString(b.customerEmail);
    const customerName = getString(b.customerName);
    const deviceId = getString(b.deviceId, 128) || 'anonymous';
    const userId = getString(b.userId, 128);
    const shippingOptionId = getString(b.shippingOptionId, 64);
    const shippingCountry = getString(b.shippingCountry, 4);
    const metadata = isRecord(b.metadata) ? (b.metadata as Record<string, unknown>) : {};
    const qrUrlRaw = 'qrUrl' in b ? (b as Record<string, unknown>).qrUrl : '';
    const qrDisabledRaw = 'qrDisabled' in b ? (b as Record<string, unknown>).qrDisabled : false;
    const qrDisabled =
      qrDisabledRaw === true ||
      String(qrDisabledRaw || '')
        .trim()
        .toLowerCase() === 'true' ||
      String(qrDisabledRaw || '').trim() === '1';
    const qrUrl = qrDisabled ? '' : normalizeCustomerQrUrl(qrUrlRaw);
    if (!qrDisabled && getString(qrUrlRaw) && !qrUrl) {
      return NextResponse.json({ error: 'Invalid QR link URL' }, { status: 400 });
    }

    const rawItems = 'items' in b ? (b as Record<string, unknown>).items : null;
    const cartItems = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems : getCart(deviceId);

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (quantumVerified) {
      const status = getQuantumStatus();
      if (!status.available) {
        return NextResponse.json({ error: 'Quantum Verified is temporarily unavailable' }, { status: 400 });
      }
    }

    const itemCount = cartItems.reduce((sum: number, it: unknown) => {
      const rec = isRecord(it) ? it : {};
      const q = typeof rec.quantity === 'number' || typeof rec.quantity === 'string' ? Number(rec.quantity) : 1;
      return sum + Math.max(1, Math.trunc(Number.isFinite(q) ? q : 1));
    }, 0);
    const metaRec = metadata;
    const shipCountry =
      typeof shippingCountry === 'string' && shippingCountry.trim()
        ? shippingCountry
        : 'country' in metaRec
          ? String(metaRec.country || 'US')
          : 'US';
    const shipOptions = quoteShipping({ country: String(shipCountry || 'US'), itemCount });
    const selectedShip = shipOptions.find((o) => o.id === String(shippingOptionId || '')) || shipOptions[0] || null;

    // Stripe requires product_data.images to be fully-qualified public URLs.
    // Generated assets often use relative paths (e.g. /images/.. or /uploads/..),
    // which Stripe rejects with "Not a valid URL". Resolve to absolute and drop
    // anything that still isn't a valid http(s) URL.
    const lineItemOrigin = getRequestOrigin(request);
    const toStripeImage = (raw: string): string | null => {
      const v = (raw || '').trim();
      if (!v) return null;
      try {
        const abs = /^https?:\/\//i.test(v)
          ? v
          : lineItemOrigin
            ? new URL(v, lineItemOrigin + '/').toString()
            : '';
        if (!abs) return null;
        const u = new URL(abs);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        return u.toString();
      } catch {
        return null;
      }
    };

    const lineItems = cartItems.map((item: unknown) => {
      const rec = isRecord(item) ? (item as Record<string, unknown>) : {};
      const unitAmount = resolveUnitAmountCents(item);
      if (unitAmount === null) {
        throw new Error('invalid_product');
      }
      const title = getString(rec.title) || 'Product';
      const quantity = Math.max(1, Math.trunc(getNumber(rec.quantity) || 1));
      const rawImage = getString(rec.imageUrl) || getString(rec.image);
      const stripeImage = toStripeImage(rawImage);

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: title,
            images: stripeImage ? [stripeImage] : [],
          },
          unit_amount: unitAmount,
        },
        quantity,
      };
    });

    if (selectedShip && selectedShip.amountUsd > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Shipping: ${selectedShip.label}`,
            images: [],
          },
          unit_amount: Math.round(Number(selectedShip.amountUsd) * 100),
        },
        quantity: 1,
      });
    }

    const feeEnv = (process.env.QUANTUM_VERIFIED_FEE_CENTS || '').trim();
    const feeCentsRaw = feeEnv ? Number(feeEnv) : 499;
    const quantumFeeCents = Number.isFinite(feeCentsRaw) ? Math.max(0, Math.min(50_000, Math.trunc(feeCentsRaw))) : 499;

    if (quantumVerified && quantumFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Quantum Verified Premium',
            images: [],
          },
          unit_amount: quantumFeeCents,
        },
        quantity: 1,
      });
    }

    const totalAmountCents = lineItems.reduce((sum, li) => {
      const unitAmount = li?.price_data?.unit_amount;
      const qty = li?.quantity;
      const cents = typeof unitAmount === 'number' && Number.isFinite(unitAmount) ? unitAmount : 0;
      const q = typeof qty === 'number' && Number.isFinite(qty) ? Math.max(0, Math.trunc(qty)) : 0;
      return sum + cents * q;
    }, 0);

    const origin = getRequestOrigin(request);
    if (!origin) {
      return NextResponse.json({ error: 'Missing site origin. Set NEXT_PUBLIC_SITE_URL.' }, { status: 500 });
    }

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
        quantumVerified: quantumVerified ? '1' : '0',
        quantumFeeCents: quantumVerified ? String(quantumFeeCents) : '0',
        shippingOptionId: selectedShip?.id || '',
        shippingCents: selectedShip ? String(Math.round(Number(selectedShip.amountUsd) * 100)) : '0',
        qrUrl: qrUrl || '',
        qrDisabled: qrDisabled ? '1' : '0',
        ...(metadata || {}),
      }
    });

    const supabase = getServiceSupabase();
    if (supabase) {
      const { data: orderRow, error: orderError } = await supabase
        .from('orders')
        .insert({
          stripe_checkout_session_id: session.id,
          user_id: userId || null,
          device_id: deviceId || null,
          status: 'pending',
          total_amount: Number.isFinite(totalAmountCents) ? totalAmountCents : null,
          currency: 'usd',
          customer_email: customerEmail || null,
        })
        .select('id')
        .single();

      if (orderError || !orderRow?.id) {
        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch {
        }
        return NextResponse.json({ error: orderError?.message || 'Failed to persist order snapshot' }, { status: 500 });
      }

      const orderItemRows = cartItems.map((item: unknown) => {
        const rec = isRecord(item) ? (item as Record<string, unknown>) : {};
        const meta = isRecord(rec.metadata) ? (rec.metadata as Record<string, unknown>) : {};
        const productId = getString(meta.productId, 64) || getString(rec.productId, 64) || null;
        const variantId =
          getString(meta.variantId, 120) ||
          getString(meta.printifySku, 120) ||
          getString(meta.variant, 64) ||
          getString(rec.variantId, 120) ||
          null;
        const quantity = Math.max(1, Math.trunc(getNumber(rec.quantity) || 1));
        const price = resolveUnitAmountCents(item);
        return {
          order_id: orderRow.id,
          product_id: productId,
          variant_id: variantId,
          quantity,
          price: typeof price === 'number' && Number.isFinite(price) ? price : null,
          metadata: { cart_item: rec },
        };
      });

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemRows);
      if (itemsError) {
        try {
          await supabase.from('orders').delete().eq('id', orderRow.id);
        } catch {
        }
        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch {
        }
        return NextResponse.json({ error: itemsError.message || 'Failed to persist order items snapshot' }, { status: 500 });
      }
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    console.error('Stripe error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
