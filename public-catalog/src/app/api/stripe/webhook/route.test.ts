import { beforeEach, describe, expect, it, vi } from 'vitest';

const retrieveSessionMock = vi.fn();
const constructEventMock = vi.fn();

const ordersSelectSingleMock = vi.fn();
const orderItemsSelectMock = vi.fn();
const ordersUpdateEqMock = vi.fn(async () => ({ error: null }));

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      checkout = {
        sessions: {
          retrieve: retrieveSessionMock,
        },
      };
      webhooks = {
        constructEvent: constructEventMock,
      };
      refunds = {
        create: vi.fn(),
      };
      constructor() {}
    },
  };
});

vi.mock('@/lib/supabase', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => {
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              single: ordersSelectSingleMock,
            }),
          }),
          update: () => ({
            eq: ordersUpdateEqMock,
          }),
        };
      }
      if (table === 'order_items') {
        return {
          select: () => ({
            eq: orderItemsSelectMock,
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

vi.mock('@/lib/cartStore', () => ({
  addOrder: vi.fn(),
  clearCart: vi.fn(),
  getCart: vi.fn(() => []),
}));

import { POST } from './route';

describe('stripe webhook route', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3001';
    process.env.PRINTIFY_SHOP_ID = 'shop_123';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    retrieveSessionMock.mockReset();
    constructEventMock.mockReset();
    ordersUpdateEqMock.mockClear();
    orderItemsSelectMock.mockReset();
    ordersSelectSingleMock.mockReset();

    retrieveSessionMock.mockResolvedValue({
      id: 'cs_test_1',
      object: 'checkout.session',
      metadata: {
        deviceId: 'device-1',
        userId: 'user-1',
        origin: 'http://localhost:3001',
        customerName: 'Buyer Test',
        quantumVerified: '0',
        orderId: 'order_123',
      },
      customer_details: { email: 'buyer@example.com' },
      payment_status: 'paid',
    });
    constructEventMock.mockReturnValue({
      id: 'evt_test_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', object: 'checkout.session' } },
    });
  });

  it('skips Printify creation when the stored order is already fulfilled', async () => {
    ordersSelectSingleMock.mockResolvedValue({
      data: { id: 'order_123', status: 'submitted', printify_order_id: 'po_123' },
      error: null,
    });
    orderItemsSelectMock.mockResolvedValue({
      data: [
        {
          quantity: 1,
          metadata: {
            cart_item: {
              id: 'item-1',
              quantity: 1,
              title: 'Premium Tee',
              imageUrl: 'https://example.com/design.png',
              metadata: { productId: 'tee', printifySku: 'sku-standard-l', variant: 'L' },
            },
          },
        },
      ],
      error: null,
    });
    global.fetch = vi.fn(async () => {
      throw new Error('Printify should not be called for duplicate fulfillment');
    }) as typeof fetch;

    const res = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'sig_test',
        },
        body: JSON.stringify({
          id: 'evt_test_1',
          object: 'event',
          type: 'checkout.session.completed',
          data: { object: { id: 'cs_test_1', object: 'checkout.session' } },
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
