import { describe, expect, it } from 'vitest';

import { buildNarrativeRenderSettings } from './narrativeRenderSettings';

describe('buildNarrativeRenderSettings', () => {
  it('returns deterministic settings for the same prompt and seed', () => {
    const first = buildNarrativeRenderSettings({
      prompt: 'electric fractal storytelling with cyan and magenta rings',
      seed: 4242,
      paletteProfile: 'joyful',
    });
    const second = buildNarrativeRenderSettings({
      prompt: 'electric fractal storytelling with cyan and magenta rings',
      seed: 4242,
      paletteProfile: 'joyful',
    });

    expect(second).toEqual(first);
  });

  it('keeps Mandelbrot rare and favors bright electric story modes', () => {
    const settings = buildNarrativeRenderSettings({
      prompt: 'clean electric cyan magenta fractal memory field',
      seed: 111,
      paletteProfile: 'joyful',
    });

    expect(settings.story_mode).toMatch(/diamond|ring|diagonal|spiral/);
    expect(settings.mandelbrot_weight).toBeLessThanOrEqual(0.12);
    expect(settings.brightness_floor).toBeGreaterThanOrEqual(0.34);
    expect(settings.palette_motion).toBeGreaterThan(0);
  });

  it('never selects Mandelbrot-heavy backgrounds for non-mandelbrot prompts', () => {
    let max = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const settings = buildNarrativeRenderSettings({
        prompt: 'clean electric cyan magenta fractal story field',
        seed,
        paletteProfile: 'joyful',
      });
      if (settings.mandelbrot_weight > max) max = settings.mandelbrot_weight;
    }
    expect(max).toBeLessThanOrEqual(0.06);
  });

  it('prefers diamond and ring storytelling modes for electric abstract prompts', () => {
    let diamondOrRing = 0;
    let total = 0;
    for (let seed = 1; seed <= 240; seed++) {
      const settings = buildNarrativeRenderSettings({
        prompt: 'electric abstract textile fractal with cyan magenta diamond rings',
        seed,
        paletteProfile: 'joyful',
      });
      total += 1;
      if (settings.story_mode === 'diamond_resonance' || settings.story_mode === 'ring_memory') {
        diamondOrRing += 1;
      }
    }
    expect(diamondOrRing).toBeGreaterThan(total / 2);
  });

  it('allows darker prompts to opt into a moodier floor without going black-first by default', () => {
    const settings = buildNarrativeRenderSettings({
      prompt: 'shadow memory fractal with luminous metallic edges',
      seed: 909,
      paletteProfile: 'shadow',
    });

    expect(settings.brightness_floor).toBeGreaterThanOrEqual(0.2);
    expect(settings.metallic_outline_strength).toBeGreaterThan(0.35);
  });
});
