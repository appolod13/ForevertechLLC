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

  it('submits a reddit link post when a public https image URL is provided', async () => {
    cookieGetMock.mockImplementation((key: string) => {
      if (key === 'reddit_user_token') return { value: 'reddit_token_123' };
      return undefined;
    });

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url === 'https://oauth.reddit.com/api/media/asset.json') {
        return {
          ok: true,
          json: async () => ({
            asset_id: 'reddit_asset_123',
          }),
        } as Response;
      }
      if (url === 'https://oauth.reddit.com/api/submit') {
        return {
          ok: true,
          json: async () => ({
            json: {
              errors: [],
              data: {
                id: 'reddit_post_123',
                url: 'https://reddit.com/r/LivestreamFail/comments/reddit_post_123/example',
              },
            },
          }),
        } as Response;
      }
      if (url === 'https://example.com/post.png') {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'image/png' }),
          arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
          blob: async () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const res = await POST(
      new Request('https://www.pixelqrypt.com/api/post', {
        method: 'POST',
        headers: { 'content-type': 'application/json', host: 'www.pixelqrypt.com', 'x-forwarded-proto': 'https' },
        body: JSON.stringify({
          userId: 'user-1',
          content: 'Quantum drop is live',
          platforms: ['reddit'],
          metadata: {
            mediaUrl: 'https://example.com/post.png',
            redditSubreddit: 'LivestreamFail',
          },
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.results.reddit.success).toBe(true);
    expect(json.results.reddit.subreddit).toBe('LivestreamFail');
    expect(
      (global.fetch as unknown as { mock: { calls: Array<[RequestInfo | URL, RequestInit | undefined]> } }).mock.calls.some((c) =>
        String(c[0]) === 'https://example.com/post.png',
      ),
    ).toBe(true);
  });
});
