import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieSetMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: cookieSetMock,
  }),
}));

import { GET } from './route';

describe('generic platform login route', () => {
  beforeEach(() => {
    cookieSetMock.mockReset();
  });

  it('routes reddit to the dedicated reddit login flow instead of the mock cookie path', async () => {
    const res = await GET(
      new Request('http://localhost/api/auth/reddit/login?userId=user-42'),
      { params: Promise.resolve({ platform: 'reddit' }) },
    );

    expect(res.headers.get('location')).toBe('http://localhost/api/auth/reddit/login?userId=user-42');
    expect(cookieSetMock).not.toHaveBeenCalled();
  });
});
