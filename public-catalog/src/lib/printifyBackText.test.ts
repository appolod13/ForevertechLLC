import { describe, it, expect } from 'vitest';
import { buildBackTextSvg, defaultPrintifyBackTextConfig, renderBackAbstractPngBuffer, renderBackTextPngBuffer } from './printifyBackText';

describe('printifyBackText', () => {
  it('defaults to pure white text for visibility on red background', () => {
    const cfg = defaultPrintifyBackTextConfig();
    expect(cfg.render.textColor).toBe('#ffffff');
  });

  it('uses a tighter default rotation range for organized layout', () => {
    const cfg = defaultPrintifyBackTextConfig();
    expect(cfg.render.angleMin).toBeGreaterThanOrEqual(-12);
    expect(cfg.render.angleMax).toBeLessThanOrEqual(12);
  });

  it('buildBackTextSvg is deterministic for same config + text', () => {
    const cfg = defaultPrintifyBackTextConfig();
    cfg.version = 'test';
    const svg1 = buildBackTextSvg('CUSTOM FUTURE TECH', cfg);
    const svg2 = buildBackTextSvg('CUSTOM FUTURE TECH', cfg);
    expect(svg1).toBe(svg2);
  });

  it('renders exactly one tile per word (no duplicates)', () => {
    const cfg = defaultPrintifyBackTextConfig();
    cfg.version = 'test';
    const text = 'ALPHA BETA GAMMA DELTA EPSILON';
    const svg = buildBackTextSvg(text, cfg);
    const words = text.split(' ').filter(Boolean);
    for (const w of words) {
      expect(svg.includes(`>${w}<`)).toBe(true);
    }
    const count = (svg.match(/<text /g) || []).length;
    expect(count).toBe(words.length);
  });

  it('includes per-tile clip paths to prevent visible overlap', () => {
    const cfg = defaultPrintifyBackTextConfig();
    cfg.version = 'test';
    const text = 'FOREVERTECH QUANTUM WALFRAM QISKIT FUTURE CITY MEGACITY GOLDEN HOUR ZETA NEON CIRCUIT DESIGN';
    const svg = buildBackTextSvg(text, cfg);
    const words = text.split(' ').filter(Boolean).slice(0, cfg.render.maxWords);
    const clipCount = (svg.match(/<clipPath /g) || []).length;
    expect(clipCount).toBe(words.length);
    const usesClip = (svg.match(/clip-path="url\(#ftclip-/g) || []).length;
    expect(usesClip).toBe(words.length);
    expect(svg.includes('clipPathUnits="userSpaceOnUse"')).toBe(true);
  });

  it('avoids textLength/lengthAdjust which can break some SVG renderers', () => {
    const cfg = defaultPrintifyBackTextConfig();
    cfg.version = 'test';
    const svg = buildBackTextSvg('SPIDER WOLF NIGHT TIME', cfg);
    expect(svg.includes('textLength=')).toBe(false);
    expect(svg.includes('lengthAdjust=')).toBe(false);
  });

  it('renders a PNG buffer with visible text', async () => {
    const cfg = defaultPrintifyBackTextConfig();
    cfg.version = 'test';
    const png = await renderBackTextPngBuffer('SPIDER WOLF NIGHT TIME', cfg);
    expect(Buffer.isBuffer(png)).toBe(true);
    expect(png.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  }, 15000);

  it('renders a deterministic abstract back PNG for the same seed text', async () => {
    const cfg = defaultPrintifyBackTextConfig();
    cfg.version = 'test';
    const a = await renderBackAbstractPngBuffer('FUTURISTIC GEOMETRY', cfg);
    const b = await renderBackAbstractPngBuffer('FUTURISTIC GEOMETRY', cfg);
    expect(a.equals(b)).toBe(true);
    expect(a.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });
});
