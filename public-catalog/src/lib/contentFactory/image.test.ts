import { describe, it, expect, beforeEach } from 'vitest';
import * as mod from './image';

describe('contentFactory/image', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('returns correct ratio for instagram', async () => {
    const r = await mod.generateImageForPlatform('mock', 'hello', 'instagram');
    expect(r.meta.width).toBe(1080);
    expect(r.meta.height).toBe(1080);
    expect(r.meta.ratio).toBe('1:1');
  });

  it('returns correct ratio for twitter', async () => {
    const r = await mod.generateImageForPlatform('mock', 'hello', 'twitter');
    expect(r.meta.width).toBe(1280);
    expect(r.meta.height).toBe(720);
    expect(r.meta.ratio).toBe('16:9');
  });

  it('falls back to SVG placeholder when OpenAI key missing', async () => {
    const r = await mod.generateImageForPlatform('dalle', 'a cat', 'instagram');
    expect(typeof r.image_url).toBe('string');
    expect(r.image_url.startsWith('data:image/svg+xml')).toBe(true);
    expect(r.meta.provider).toBe('dalle');
  });

  it('renders readable fallback text instead of percent-encoded labels', async () => {
    const r = await mod.generateImageForPlatform('mock', 'hello', 'linkedin' as never);
    const encoded = r.image_url.split(',')[1];
    const svg = Buffer.from(encoded, 'base64').toString('utf8');
    expect(svg).toContain('linkedin ~1.91:1');
    expect(svg).not.toContain('linkedin%20');
    expect(svg).not.toContain('%3A1');
  });
});
