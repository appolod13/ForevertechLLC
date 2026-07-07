import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockupsSelectSingleMock = vi.fn();
const mockupsUpdateMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => {
      if (table !== 'design_mockups') throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            single: mockupsSelectSingleMock,
          }),
        }),
        insert: vi.fn(() => ({
          select: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        })),
        update: mockupsUpdateMock.mockImplementation(() => ({
          eq: async () => ({ error: null }),
        })),
      };
    },
  }),
}));

import { POST } from './route';

describe('printify mockups route', () => {
  beforeEach(() => {
    mockupsSelectSingleMock.mockReset();
    mockupsUpdateMock.mockReset();
    process.env.PRINTIFY_SHOP_ID = 'shop_123';
    process.env.PRINTIFY_API_TOKEN = 'token_123';
  });

  it('returns cached ready mockups without calling Printify', async () => {
    mockupsSelectSingleMock.mockResolvedValue({
      data: {
        design_hash: 'hash_1',
        status: 'ready',
        mockup_front_url: 'https://printify.example/front.png',
        mockup_back_url: 'https://printify.example/back.png',
        mockup_left_url: 'https://printify.example/left.png',
        mockup_right_url: 'https://printify.example/right.png',
      },
      error: null,
    });
    global.fetch = vi.fn(async () => {
      throw new Error('Printify should not be called on cache hit');
    }) as typeof fetch;

    const res = await POST(
      new Request('http://localhost/api/printify/mockups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageUrl: 'https://example.com/design.png', prompt: 'x' }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('ready');
    expect(json.mockups.frontUrl).toBe('https://printify.example/front.png');
  });

  it('finalizes a pending mockup row when Printify product images become available', async () => {
    mockupsSelectSingleMock.mockResolvedValue({
      data: {
        design_hash: 'hash_pending',
        status: 'pending',
        printify_product_id: 'prod_123',
        mockup_front_url: null,
        mockup_back_url: null,
        mockup_left_url: null,
        mockup_right_url: null,
      },
      error: null,
    });

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (!url.includes('api.printify.com')) throw new Error(`Unexpected fetch url: ${url}`);
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            images: [
              { src: 'https://printify.example/front.png', position: 'front' },
              { src: 'https://printify.example/back.png', position: 'back' },
              { src: 'https://printify.example/left.png', position: 'left' },
              { src: 'https://printify.example/right.png', position: 'right' },
            ],
          }),
      } as Response;
    }) as typeof fetch;

    const res = await POST(
      new Request('http://localhost/api/printify/mockups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageUrl: 'https://example.com/design.png', prompt: 'x' }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('ready');
    expect(json.mockups.leftUrl).toBe('https://printify.example/left.png');
    expect(mockupsUpdateMock).toHaveBeenCalled();
  });
});
