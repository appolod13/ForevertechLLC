import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { quoteShipping } from '@/lib/shippingConfig';
import { getQuantumStatus } from '@/lib/quantumVerified';
import { getCart } from '@/lib/cartStore';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(secretKey, { apiVersion: '2026-03-25.dahlia' });
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

function resolveUnitAmountCents(item: unknown): number | null {
  const rec = isRecord(item) ? item : {};
  const meta = isRecord(rec.metadata) ? (rec.metadata as Record<string, unknown>) : {};
  const productId = getString(meta.productId, 64) || getString(rec.productId, 64);
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
    const qrUrl = normalizeCustomerQrUrl(qrUrlRaw);
    if (getString(qrUrlRaw) && !qrUrl) {
      return NextResponse.json({ error: 'Invalid QR link URL' }, { status: 400 });
    }

    const cartItems = getCart(deviceId);

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

    const lineItems = cartItems.map((item: unknown) => {
      const rec = isRecord(item) ? (item as Record<string, unknown>) : {};
      const unitAmount = resolveUnitAmountCents(item);
      if (unitAmount === null) {
        throw new Error('invalid_product');
      }
      const title = getString(rec.title) || 'Product';
      const quantity = Math.max(1, Math.trunc(getNumber(rec.quantity) || 1));
      const imageUrl = getString(rec.imageUrl) || getString(rec.image);

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: title,
            images: imageUrl ? [imageUrl] : [],
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
        ...(metadata || {}),
      }
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    console.error('Stripe error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
