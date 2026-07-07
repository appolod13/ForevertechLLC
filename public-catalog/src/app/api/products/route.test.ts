import { describe, expect, it, beforeEach } from 'vitest';

import { GET } from './route';

describe('products route', () => {
  beforeEach(() => {
    process.env.PRINTIFY_DEFAULT_SKU = 'sku-standard';
    process.env.PRINTIFY_AOP_DEFAULT_SKU = 'sku-aop';
  });

  it('returns both standard and all-over-print shirt products', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.products)).toBe(true);

    expect(json.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'tee',
          printType: 'standard',
          surfaces: expect.arrayContaining(['finished']),
        }),
        expect.objectContaining({
          id: 'tee-aop',
          printType: 'all_over_print',
          placementMode: 'all_over_print',
          surfaces: expect.arrayContaining(['front', 'back', 'overview', 'spin360', 'finished']),
        }),
      ]),
    );
  });

  it('includes optional Printify preview URLs from product env metadata', async () => {
    process.env.PRINTIFY_TEE_PREVIEW_URL = 'https://printify.example/tee.png';
    process.env.PRINTIFY_AOP_PREVIEW_URL = 'https://printify.example/aop.png';

    const res = await GET();
    const json = await res.json();

    expect(json.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'tee',
          printifyPreviewUrl: 'https://printify.example/tee.png',
        }),
        expect.objectContaining({
          id: 'tee-aop',
          printifyPreviewUrl: 'https://printify.example/aop.png',
        }),
      ]),
    );
  });
});
