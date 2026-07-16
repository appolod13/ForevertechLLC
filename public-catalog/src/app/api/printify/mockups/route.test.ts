import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockupsSelectSingleMock, mockupsUpdateMock, getServiceSupabaseMock } = vi.hoisted(() => ({
  mockupsSelectSingleMock: vi.fn(),
  mockupsUpdateMock: vi.fn(),
  getServiceSupabaseMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

import { POST } from './route';

describe('printify mockups route', () => {
  beforeEach(() => {
    mockupsSelectSingleMock.mockReset();
    mockupsUpdateMock.mockReset();
    getServiceSupabaseMock.mockReset();
    getServiceSupabaseMock.mockReturnValue({
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
    });
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

  it('builds an AOP Printify payload with front, back, left_sleeve, right_sleeve, and inside neck tag placements', async () => {
    mockupsSelectSingleMock.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url === 'https://example.com/design.png') {
        return {
          ok: true,
          arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
        } as Response;
      }

      if (url.includes('/v1/uploads/images.json')) {
        const body = JSON.parse(String(init?.body || '{}')) as { file_name?: string };
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: body.file_name?.includes('necktag') ? 'upload_logo' : 'upload_art',
              preview_url: 'https://printify.example/upload.png',
            }),
        } as Response;
      }

      if (url.includes('/v1/shops/shop_123/products/prod_aop.json')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 'prod_aop',
              blueprint_id: 12,
              print_provider_id: 34,
              variants: [{ id: 101 }],
              print_areas: [
                {
                  variant_ids: [101],
                  placeholders: [
                    { position: 'front', images: [{ x: 0.5, y: 0.5, scale: 0.8, angle: 0 }] },
                    { position: 'back', images: [{ x: 0.51, y: 0.5, scale: 0.8, angle: 0 }] },
                    { position: 'left_sleeve', images: [{ x: 0.4, y: 0.5, scale: 0.55, angle: 0 }] },
                    { position: 'right_sleeve', images: [{ x: 0.6, y: 0.5, scale: 0.55, angle: 0 }] },
                    { position: 'inside_neck_tag', images: [{ x: 0.5, y: 0.5, scale: 0.2, angle: 0 }] },
                  ],
                },
              ],
            }),
        } as Response;
      }

      if (url.includes('/v1/shops/shop_123/products.json')) {
        const payload = JSON.parse(String(init?.body || '{}')) as {
          print_areas?: Array<{ placeholders?: Array<{ position?: string; images?: Array<{ id?: string }> }> }>;
        };
        const placeholders = payload.print_areas?.[0]?.placeholders || [];
        expect(placeholders.map((entry) => entry.position)).toEqual([
          'front',
          'back',
          'left_sleeve',
          'right_sleeve',
          'inside_neck_tag',
        ]);
        expect(placeholders[0]?.images?.[0]?.id).toBe('upload_art');
        expect(placeholders[1]?.images?.[0]?.id).toBe('upload_art');
        expect(placeholders[2]?.images?.[0]?.id).toBe('upload_art');
        expect(placeholders[3]?.images?.[0]?.id).toBe('upload_art');
        expect(placeholders[4]?.images?.[0]?.id).toBe('upload_logo');

        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'prod_created' }),
        } as Response;
      }

      if (url.includes('/v1/shops/shop_123/products/prod_created.json')) {
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
      }

      throw new Error(`Unexpected fetch url: ${url}`);
    });

    global.fetch = fetchMock as typeof fetch;
    process.env.PRINTIFY_AOP_TEMPLATE_PRODUCT_ID = 'prod_aop';

    const res = await POST(
      new Request('http://localhost/api/printify/mockups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageUrl: 'https://example.com/design.png', prompt: 'x', printType: 'all_over_print' }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('ready');
  });

  it('fails clearly when an AOP template is missing a required sleeve placement', async () => {
    mockupsSelectSingleMock.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url === 'https://example.com/design.png') {
        return {
          ok: true,
          arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
        } as Response;
      }

      if (url.includes('/v1/uploads/images.json')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'upload_art', preview_url: 'https://printify.example/upload.png' }),
        } as Response;
      }

      if (url.includes('/v1/shops/shop_123/products/prod_aop_missing.json')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              id: 'prod_aop_missing',
              blueprint_id: 12,
              print_provider_id: 34,
              variants: [{ id: 101 }],
              print_areas: [
                {
                  variant_ids: [101],
                  placeholders: [
                    { position: 'front', images: [{ x: 0.5, y: 0.5, scale: 0.8, angle: 0 }] },
                    { position: 'back', images: [{ x: 0.51, y: 0.5, scale: 0.8, angle: 0 }] },
                    { position: 'left_sleeve', images: [{ x: 0.4, y: 0.5, scale: 0.55, angle: 0 }] },
                  ],
                },
              ],
            }),
        } as Response;
      }

      if (url.includes('/v1/shops/shop_123/products.json')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 'should_not_be_created' }),
        } as Response;
      }

      throw new Error(`Unexpected fetch url: ${url}`);
    }) as typeof fetch;

    process.env.PRINTIFY_AOP_TEMPLATE_PRODUCT_ID = 'prod_aop_missing';

    const res = await POST(
      new Request('http://localhost/api/printify/mockups', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageUrl: 'https://example.com/design.png', prompt: 'x', printType: 'all_over_print' }),
      }),
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(String(json.details || '')).toContain('required_aop_placement_missing');
  });

  it('returns a non-blocking error status in local mode when Supabase is not configured', async () => {
    getServiceSupabaseMock.mockReturnValue(null);

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
    expect(json.status).toBe('error');
    expect(json.error).toBe('supabase_not_configured');
  });
});
