import { beforeEach, describe, expect, it, vi } from 'vitest';

const posterPostsSelectMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => {
      if (table !== 'poster_posts') throw new Error(`Unexpected table ${table}`);
      return {
        select: () => ({
          order: () => ({
            limit: posterPostsSelectMock,
          }),
        }),
      };
    },
  }),
}));

import { GET } from './route';

describe('rss feed route', () => {
  beforeEach(() => {
    posterPostsSelectMock.mockReset();
  });

  it('renders poster posts as RSS XML with enclosure entries for media', async () => {
    posterPostsSelectMock.mockResolvedValue({
      data: [
        {
          id: 'post_1',
          content: 'Quantum launch drop',
          media_url: 'https://example.com/post.png',
          created_at: '2026-07-07T10:00:00.000Z',
          title: 'Quantum launch drop',
        },
      ],
      error: null,
    });

    const res = await GET(new Request('http://localhost/rss.xml'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/rss+xml');
    const xml = await res.text();
    expect(xml).toContain('<rss');
    expect(xml).toContain('<title>Quantum launch drop</title>');
    expect(xml).toContain('https://example.com/post.png');
    expect(xml).toContain('<enclosure');
  });
});
