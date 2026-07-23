import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieSetMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: cookieSetMock,
  }),
}));

import { GET } from './route';

describe('reddit login route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    cookieSetMock.mockReset();
    process.env = {
      ...originalEnv,
      REDDIT_CLIENT_ID: 'reddit-client-id',
    };
  });

  it('redirects to Reddit OAuth and stores state for the callback', async () => {
    const res = await GET(new Request('http://localhost/api/auth/reddit/login?userId=user-42'));
    const location = res.headers.get('location');

    expect(location).toBeTruthy();
    const redirect = new URL(String(location));
    expect(redirect.origin).toBe('https://www.reddit.com');
    expect(redirect.pathname).toBe('/api/v1/authorize');
    expect(redirect.searchParams.get('client_id')).toBe('reddit-client-id');
    expect(redirect.searchParams.get('response_type')).toBe('code');
    expect(redirect.searchParams.get('duration')).toBe('permanent');
    expect(redirect.searchParams.get('redirect_uri')).toBe('http://localhost/api/auth/reddit/callback');
    expect(redirect.searchParams.get('scope')).toBe('identity submit read');

    expect(cookieSetMock).toHaveBeenCalledWith(
      'reddit_oauth_state',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, maxAge: 3600, path: '/' }),
    );
    expect(cookieSetMock).toHaveBeenCalledWith(
      'reddit_oauth_user_id',
      'user-42',
      expect.objectContaining({ httpOnly: true, maxAge: 3600, path: '/' }),
    );
  });
});
