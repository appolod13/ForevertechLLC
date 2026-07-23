import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieGetMock = vi.fn();
const socialDestinationSingleMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: cookieGetMock,
  }),
}));

vi.mock('@/lib/supabase', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => {
      if (table !== 'user_social_destinations') throw new Error(`Unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: socialDestinationSingleMock,
            }),
          }),
        }),
      };
    },
  }),
}));

import { GET } from './route';

describe('auth session route', () => {
  beforeEach(() => {
    cookieGetMock.mockReset();
    socialDestinationSingleMock.mockReset();
    cookieGetMock.mockImplementation((key: string) => {
      if (key === 'reddit_user_token') return { value: 'reddit_token_123' };
      if (key === 'reddit_screen_name') return { value: 'reddit_user' };
      return undefined;
    });
    socialDestinationSingleMock.mockResolvedValue({
      data: {
        platform: 'discord',
        webhook_url: 'https://discord.com/api/webhooks/123/secret',
      },
      error: null,
    });
  });

  it('returns reddit, discord, and rss connection state alongside the existing poster platforms', async () => {
    const res = await GET(new Request('http://localhost/api/auth/session?userId=user-1'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.reddit).toEqual({ authenticated: true, screenName: 'reddit_user' });
    expect(json.discord).toEqual({ authenticated: true, screenName: 'Discord connected' });
    expect(json.rss).toEqual({ authenticated: true, screenName: 'RSS feed' });
    expect(json.twitter).toEqual({ authenticated: false });
  });

  it('treats a reddit refresh token as a usable connected session', async () => {
    cookieGetMock.mockImplementation((key: string) => {
      if (key === 'reddit_user_refresh_token') return { value: 'reddit_refresh_123' };
      if (key === 'reddit_screen_name') return { value: 'reddit_user' };
      return undefined;
    });

    const res = await GET(new Request('http://localhost/api/auth/session?userId=user-1'));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.reddit).toEqual({ authenticated: true, screenName: 'reddit_user' });
  });
});
