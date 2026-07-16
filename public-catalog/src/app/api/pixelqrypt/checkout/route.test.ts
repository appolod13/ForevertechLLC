import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSessionMock = vi.fn(async () => ({ id: 'cs_test_1', url: 'https://stripe.test/pixelqrypt-checkout' }));

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      checkout = {
        sessions: {
          create: createSessionMock,
        },
      };
      constructor() {}
    },
  };
});

import { POST } from './route';

describe('pixelqrypt checkout route', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3001';
    createSessionMock.mockClear();
  });

  it('stores the 45% creator payout rate in session metadata for creator-linked purchases', async () => {
    const req = new Request('http://localhost/api/pixelqrypt/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code: 'PXQ-123',
        deviceId: 'device-1',
        userId: 'buyer-1',
        email: 'buyer@example.com',
        creatorUserId: 'creator-1',
        creatorStripeAccountId: 'acct_creator',
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(createSessionMock).toHaveBeenCalledTimes(1);

    const createArgs = createSessionMock.mock.calls[0][0];
    expect(createArgs.metadata.payoutRate).toBe('0.45');
    expect(createArgs.metadata.creatorPayoutCents).toBe('359');
    expect(createArgs.metadata.platformFeeCents).toBe('440');
  });
});
