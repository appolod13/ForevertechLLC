import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSessionMock = vi.fn(async () => ({ id: 'cs_test_1', url: 'https://stripe.test/checkout' }));
const expireSessionMock = vi.fn(async () => ({}));
const orderInsertMock = vi.fn();
const orderUpdateMock = vi.fn();
const orderItemsInsertMock = vi.fn(async () => ({ error: null }));

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      checkout = {
        sessions: {
          create: createSessionMock,
          expire: expireSessionMock,
        },
      };
      constructor() {}
    },
  };
});

vi.mock('@/lib/cartStore', () => ({
  getCart: vi.fn(() => []),
}));

vi.mock('@/lib/supabase', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => {
      if (table === 'orders') {
        return {
          insert: orderInsertMock,
          update: orderUpdateMock,
        };
      }
      if (table === 'order_items') {
        return {
          insert: orderItemsInsertMock,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

import { POST } from './route';

describe('checkout route', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3001';
    createSessionMock.mockClear();
    expireSessionMock.mockClear();
    orderItemsInsertMock.mockClear();
    orderInsertMock.mockImplementation(() => ({
      select: () => ({
        single: async () => ({ data: { id: 'order_123' }, error: null }),
      }),
    }));
    orderUpdateMock.mockImplementation(() => ({
      eq: async () => ({ error: null }),
    }));
  });

  it('creates a Stripe session linked to a durable internal order and Stripe-managed shipping collection', async () => {
    const req = new Request('http://localhost/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customerEmail: 'buyer@example.com',
        customerName: 'Buyer Test',
        deviceId: 'device-1',
        shippingCountry: 'US',
        shippingOptionId: 'standard',
        items: [
          {
            id: 'item-1',
            title: 'Premium Tee',
            price: 59.99,
            quantity: 1,
            imageUrl: 'https://example.com/design.png',
            metadata: {
              productId: 'tee',
              variant: 'L',
              printifySku: 'sku-standard-l',
            },
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(createSessionMock).toHaveBeenCalledTimes(1);

    const createArgs = createSessionMock.mock.calls[0][0];
    expect(typeof createArgs.metadata.orderId).toBe('string');
    expect(createArgs.metadata.orderId.length).toBeGreaterThan(10);
    expect(createArgs.shipping_address_collection).toEqual({ allowed_countries: ['US'] });
    expect(createArgs.phone_number_collection).toEqual({ enabled: true });
    expect(orderUpdateMock).toHaveBeenCalled();
    expect(orderUpdateMock.mock.calls[0][0].stripe_checkout_session_id).toBe('cs_test_1');
  });
});
