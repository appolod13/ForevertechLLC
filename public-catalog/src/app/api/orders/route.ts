import { NextRequest, NextResponse } from 'next/server';
import { addOrder, getOrders, type OrderRecord } from '@/lib/cartStore';

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function isSameOrigin(req: NextRequest): boolean {
  const host = (req.headers.get('host') || '').trim();
  const origin = (req.headers.get('origin') || '').trim();
  if (!host || !origin) return false;
  return origin === `https://${host}` || origin === `http://${host}`;
}

function resolveKey(params: URLSearchParams) {
  const userId = params.get('userId') || '';
  const deviceId = params.get('deviceId') || '';
  const key = userId || deviceId || 'anonymous';
  return { key, userId, deviceId };
}

function seedOrder(key: string): OrderRecord {
  const id = `seed-${Date.now()}`;
  return {
    id,
    createdAt: new Date().toISOString(),
    status: 'submitted',
    total: 49.99,
    items: [
      {
        id: 'seed-item-1',
        title: 'Demo Purchase (Size: L)',
        quantity: 1,
        price: 49.99,
        imageUrl: '/placeholder-future-city.svg',
      },
    ],
  };
}

export async function GET(req: NextRequest) {
  const { key } = resolveKey(req.nextUrl.searchParams);
  const orders = getOrders(key);

  if (orders.length === 0 && process.env.NODE_ENV !== 'production') {
    const seeded = seedOrder(key);
    addOrder(key, seeded);
    return NextResponse.json({ success: true, orders: [seeded] });
  }

  return NextResponse.json({ success: true, orders });
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  const b = (typeof body === 'object' && body !== null) ? (body as Record<string, unknown>) : {};
  const key = getString(b.key) || 'anonymous';
  const orderRaw = b.order;
  const order = (typeof orderRaw === 'object' && orderRaw !== null) ? (orderRaw as OrderRecord) : null;
  if (!order || !order.id) {
    return NextResponse.json({ success: false, error: 'invalid_order' }, { status: 400 });
  }
  addOrder(key, order);
  return NextResponse.json({ success: true });
}
