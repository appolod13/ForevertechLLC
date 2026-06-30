import { describe, expect, it, vi, beforeEach } from 'vitest';

import { POST } from './route';

const updateUserByIdMock = vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null }));
const getUserByIdMock = vi.fn(async () => ({ data: { user: { id: 'user-1', user_metadata: { name: 'Test User' } } }, error: null }));

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      accounts = {
        create: vi.fn(async () => ({ id: 'acct_123' })),
      };
      accountLinks = {
        create: vi.fn(async () => ({ url: 'https://stripe.test/onboard' })),
      };
      constructor() {}
    },
  };
});

vi.mock('@/lib/supabase', () => {
  return {
    getServiceSupabase: () => ({
      auth: {
        admin: {
          getUserById: getUserByIdMock,
          updateUserById: updateUserByIdMock,
        },
      },
    }),
  };
});

describe('creator connect onboard route', () => {
  beforeEach(() => {
    updateUserByIdMock.mockClear();
    getUserByIdMock.mockClear();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3001';
  });

  it('returns an onboarding URL and stores stripeConnectAccountId in user metadata', async () => {
    const req = new Request('http://local/api/creator/connect/onboard', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 'user-1', email: 'test@example.com' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe('https://stripe.test/onboard');
    expect(updateUserByIdMock).toHaveBeenCalled();
  });
});
