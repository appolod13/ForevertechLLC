import { describe, expect, it, vi, beforeEach } from 'vitest';

import { POST } from './route';

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      checkout = {
        sessions: {
          create: vi.fn(async () => ({ id: 'cs_test_1', url: 'https://stripe.test/checkout' })),
        },
      };
      constructor() {}
    },
  };
});

describe('creator premium checkout route', () => {
  beforeEach(() => {
    delete process.env.STRIPE_PREMIUM_CREATOR_PRICE_ID;
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3001';
  });

  it('returns 500 when STRIPE_PREMIUM_CREATOR_PRICE_ID is missing', async () => {
    const req = new Request('http://local/api/creator/premium/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 'user-1', email: 'test@example.com' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

