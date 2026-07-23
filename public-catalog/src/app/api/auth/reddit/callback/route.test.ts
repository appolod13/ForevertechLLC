import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieGetMock = vi.fn();
const cookieSetMock = vi.fn();
const cookieDeleteMock = vi.fn();
const upsertMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: cookieGetMock,
    set: cookieSetMock,
    delete: cookieDeleteMock,
  }),
}));

vi.mock('@/lib/supabase', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => {
      if (table !== 'user_social_accounts') throw new Error(`Unexpected table ${table}`);
      return {
        upsert: upsertMock,
      };
    },
  }),
}));

import { GET } from './route';

describe('reddit callback route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    cookieGetMock.mockReset();
    cookieSetMock.mockReset();
    cookieDeleteMock.mockReset();
    upsertMock.mockReset();
    upsertMock.mockResolvedValue({ error: null });
    process.env = {
      ...originalEnv,
      REDDIT_CLIENT_ID: 'reddit-client-id',
      REDDIT_CLIENT_SECRET: 'reddit-client-secret',
    };
    cookieGetMock.mockImplementation((key: string) => {
      if (key === 'reddit_oauth_state') return { value: 'state-123' };
      if (key === 'reddit_oauth_user_id') return { value: 'user-42' };
      return undefined;
    });
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'reddit-access-token',
            refresh_token: 'reddit-refresh-token',
            expires_in: 3600,
            scope: 'identity submit read',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: 'pixelqrypt', id: 't2_user_123' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ) as typeof fetch;
  });

  it('exchanges the callback code, stores Reddit cookies, and persists the connected account', async () => {
    const res = await GET(new Request('http://localhost/api/auth/reddit/callback?code=code-123&state=state-123'));

    expect(res.headers.get('location')).toBe('http://localhost/studio');
    expect(cookieDeleteMock).toHaveBeenCalledWith('reddit_oauth_state');
    expect(cookieDeleteMock).toHaveBeenCalledWith('reddit_oauth_user_id');
    expect(cookieSetMock).toHaveBeenCalledWith(
      'reddit_user_token',
      'reddit-access-token',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(cookieSetMock).toHaveBeenCalledWith(
      'reddit_user_refresh_token',
      'reddit-refresh-token',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(cookieSetMock).toHaveBeenCalledWith(
      'reddit_screen_name',
      'pixelqrypt',
      expect.objectContaining({ httpOnly: false, path: '/' }),
    );
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-42',
        platform: 'reddit',
        account_id: 't2_user_123',
        account_name: 'pixelqrypt',
        access_token: 'reddit-access-token',
        refresh_token: 'reddit-refresh-token',
      }),
      { onConflict: 'user_id,platform' },
    );
  });
});
