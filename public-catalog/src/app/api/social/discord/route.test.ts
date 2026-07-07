import { beforeEach, describe, expect, it, vi } from 'vitest';

const destinationSingleMock = vi.fn();
const destinationUpsertMock = vi.fn();
const destinationDeleteEqMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => {
      if (table !== 'user_social_destinations') throw new Error(`Unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: destinationSingleMock,
            }),
          }),
        }),
        upsert: destinationUpsertMock,
        delete: () => ({
          eq: (...args: unknown[]) => destinationDeleteEqMock(...args),
        }),
      };
    },
  }),
}));

import { DELETE, GET, POST } from './route';

describe('discord social destination route', () => {
  beforeEach(() => {
    destinationSingleMock.mockReset();
    destinationUpsertMock.mockReset();
    destinationDeleteEqMock.mockReset();
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 204,
      text: async () => '',
    })) as typeof fetch;
  });

  it('saves a per-user Discord webhook and returns redacted metadata', async () => {
    destinationUpsertMock.mockResolvedValue({ error: null });

    const res = await POST(
      new Request('http://localhost/api/social/discord', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: 'user-1', webhookUrl: 'https://discord.com/api/webhooks/123456/abcdef' }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.connected).toBe(true);
    expect(json.webhookDisplay).toContain('discord.com');
    expect(destinationUpsertMock).toHaveBeenCalled();
  });

  it('loads redacted connection state for the current user', async () => {
    destinationSingleMock.mockResolvedValue({
      data: {
        user_id: 'user-1',
        platform: 'discord',
        webhook_url: 'https://discord.com/api/webhooks/123456/abcdef',
      },
      error: null,
    });

    const res = await GET(new Request('http://localhost/api/social/discord?userId=user-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.connected).toBe(true);
    expect(String(json.webhookDisplay)).not.toContain('abcdef');
  });

  it('removes the saved webhook for the current user', async () => {
    destinationDeleteEqMock
      .mockReturnValueOnce({ eq: async () => ({ error: null }) });

    const res = await DELETE(new Request('http://localhost/api/social/discord?userId=user-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
