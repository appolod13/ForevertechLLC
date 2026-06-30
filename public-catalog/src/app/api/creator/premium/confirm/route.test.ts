import { describe, expect, it, vi, beforeEach } from 'vitest';

import { GET } from './route';

const updateUserByIdMock = vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null }));
const getUserByIdMock = vi.fn(async () => ({ data: { user: { id: 'user-1', user_metadata: { name: 'Test User' } } }, error: null }));

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      checkout = {
        sessions: {
          retrieve: vi.fn(async () => ({
            id: 'cs_test_1',
            status: 'complete',
            payment_status: 'paid',
            metadata: { userId: 'user-1' },
          })),
        },
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

describe('creator premium confirm route', () => {
  beforeEach(() => {
    updateUserByIdMock.mockClear();
    getUserByIdMock.mockClear();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  it('marks premiumCreator via Supabase admin on paid session', async () => {
    const req = new Request('http://local/api/creator/premium/confirm?session_id=cs_test_1&userId=user-1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(updateUserByIdMock).toHaveBeenCalled();
  });
});
