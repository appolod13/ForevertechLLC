import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { composeAopGarmentAssets, resolveBrandingLogoUrl } from './garmentComposer';

describe('garment composer', () => {
  it('creates explicit body, collar, and inside-tag assets for AOP garments', async () => {
    const designBuffer = await sharp({
      create: {
        width: 1800,
        height: 1800,
        channels: 4,
        background: { r: 72, g: 20, b: 130, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const logoBuffer = await sharp({
      create: {
        width: 420,
        height: 180,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const composed = await composeAopGarmentAssets({
      designBuffer,
      logoBuffer,
      fileSafe: 'sample-aop',
      brandingSource: 'explicit_logo_url',
    });

    expect(Object.keys(composed.zoneAssets)).toEqual([
      'front',
      'back',
      'left_sleeve',
      'right_sleeve',
      'inside_neck_tag',
      'collar',
    ]);
    expect(composed.meta.brandingSource).toBe('explicit_logo_url');

    const front = await sharp(composed.zoneAssets.front.buffer).metadata();
    const back = await sharp(composed.zoneAssets.back.buffer).metadata();
    const insideTag = await sharp(composed.zoneAssets.inside_neck_tag.buffer).metadata();

    expect(front.width).toBe(1400);
    expect(front.height).toBe(1800);
    expect(back.width).toBe(1400);
    expect(back.height).toBe(1800);
    expect(insideTag.width).toBe(900);
    expect(insideTag.height).toBe(360);
  });

  it('prefers explicit and metadata branding URLs before falling back', () => {
    expect(
      resolveBrandingLogoUrl({
        explicitLogoUrl: 'https://cdn.example.com/logo.png',
        metadata: { logoUrl: 'https://cdn.example.com/ignored.png' },
        fallbackLogoUrl: 'https://cdn.example.com/fallback.png',
      }),
    ).toEqual({
      url: 'https://cdn.example.com/logo.png',
      source: 'explicit_logo_url',
    });

    expect(
      resolveBrandingLogoUrl({
        metadata: { brandLogoUrl: '/uploads/logo.png' },
        origin: 'https://example.com',
        fallbackLogoUrl: 'https://cdn.example.com/fallback.png',
      }),
    ).toEqual({
      url: 'https://example.com/uploads/logo.png',
      source: 'metadata_logo_url',
    });
  });
});
