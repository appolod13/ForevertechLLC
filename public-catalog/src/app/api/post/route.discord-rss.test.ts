import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieGetMock = vi.fn();
const posterPostsInsertMock = vi.fn();
const socialDestinationSingleMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: cookieGetMock,
    set: vi.fn(),
  }),
}));

vi.mock('twitter-api-v2', () => ({
  TwitterApi: class {},
}));

vi.mock('@/lib/supabase', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => {
      if (table === 'user_social_destinations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: socialDestinationSingleMock,
              }),
            }),
          }),
        };
      }
      if (table === 'poster_posts') {
        return {
          insert: posterPostsInsertMock,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

import { POST } from './route';

describe('post route discord and rss', () => {
  beforeEach(() => {
    cookieGetMock.mockReset();
    posterPostsInsertMock.mockReset();
    socialDestinationSingleMock.mockReset();
    cookieGetMock.mockReturnValue(undefined);
    socialDestinationSingleMock.mockResolvedValue({
      data: {
        webhook_url: 'https://discord.com/api/webhooks/123456/abcdef',
      },
      error: null,
    });
    posterPostsInsertMock.mockResolvedValue({ error: null });
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('discord.com/api/webhooks/')) {
        return {
          ok: true,
          status: 204,
          text: async () => '',
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;
  });

  it('posts to Discord and records an RSS item in the same submission', async () => {
    const res = await POST(
      new Request('http://localhost/api/post', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-1',
          content: 'Quantum drop is live',
          platforms: ['discord', 'rss'],
          metadata: { mediaUrl: 'https://example.com/post.png' },
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.results.discord.success).toBe(true);
    expect(json.results.rss.success).toBe(true);
    expect(posterPostsInsertMock).toHaveBeenCalled();
  });
});
