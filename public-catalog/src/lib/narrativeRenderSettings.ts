export interface NarrativeRenderSettingsInput {
  prompt: string;
  seed: number;
  paletteProfile?: string | null;
}

export interface NarrativeRenderSettings {
  story_mode: 'diamond_resonance' | 'ring_memory' | 'diagonal_current' | 'spiral_filament';
  story_phase_bias: [number, number, number, number];
  mandelbrot_mode: 'rare' | 'accent' | 'guided';
  mandelbrot_weight: number;
  julia_weight: number;
  ring_bias: number;
  diamond_bias: number;
  string_flow_strength: number;
  diagonal_filament_strength: number;
  texture_style: 'diamond_wave' | 'spiral' | 'diagonal_hatch';
  texture_mix: number;
  detail_density: number;
  brightness_floor: number;
  metallic_outline_strength: number;
  palette_motion: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizePhaseBias(values: number[]): [number, number, number, number] {
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  return values.map((value) => Number((value / total).toFixed(4))) as [number, number, number, number];
}

function isDarkPalette(profile?: string | null, prompt?: string) {
  const source = `${profile || ''} ${prompt || ''}`.toLowerCase();
  return /(void|dark|shadow|abyss|ominous|grief)/.test(source);
}

export function buildNarrativeRenderSettings({
  prompt,
  seed,
  paletteProfile,
}: NarrativeRenderSettingsInput): NarrativeRenderSettings {
  const normalizedPrompt = prompt.trim().toLowerCase();
  const combinedSeed = hashString(`${normalizedPrompt}::${seed}::${paletteProfile || ''}`);
  const rand = createSeededRandom(combinedSeed);
  const darkPalette = isDarkPalette(paletteProfile, normalizedPrompt);
  const storyModes: NarrativeRenderSettings['story_mode'][] = [
    'diamond_resonance',
    'ring_memory',
    'diagonal_current',
    'spiral_filament',
  ];
  const story_mode = storyModes[Math.floor(rand() * storyModes.length)] || 'diamond_resonance';
  const explicitMandelbrot = normalizedPrompt.includes('mandelbrot');
  const rareMandelbrot = explicitMandelbrot || rand() < 0.07;
  const mandelbrot_weight = explicitMandelbrot
    ? clamp(0.14 + rand() * 0.04, 0.1, 0.18)
    : rareMandelbrot
      ? clamp(0.08 + rand() * 0.05, 0.06, 0.12)
      : clamp(0.02 + rand() * 0.04, 0.02, 0.06);
  const brightness_floor = darkPalette
    ? clamp(0.22 + rand() * 0.06, 0.2, 0.32)
    : clamp(0.38 + rand() * 0.12, 0.36, 0.52);
  const baseRing = story_mode === 'ring_memory' ? 0.78 : 0.34 + rand() * 0.24;
  const baseDiamond = story_mode === 'diamond_resonance' ? 0.82 : 0.32 + rand() * 0.26;

  return {
    story_mode,
    story_phase_bias: normalizePhaseBias([
      0.9 + rand() * 0.6,
      1.0 + rand() * 0.7,
      1.1 + rand() * 0.8,
      0.9 + rand() * 0.6,
    ]),
    mandelbrot_mode: explicitMandelbrot ? 'guided' : rareMandelbrot ? 'accent' : 'rare',
    mandelbrot_weight: Number(mandelbrot_weight.toFixed(4)),
    julia_weight: Number(clamp(0.58 + rand() * 0.26, 0.58, 0.84).toFixed(4)),
    ring_bias: Number(clamp(baseRing, 0.2, 0.9).toFixed(4)),
    diamond_bias: Number(clamp(baseDiamond, 0.2, 0.9).toFixed(4)),
    string_flow_strength: Number(clamp(0.54 + rand() * 0.28, 0.5, 0.9).toFixed(4)),
    diagonal_filament_strength: Number(clamp(0.42 + rand() * 0.32, 0.35, 0.86).toFixed(4)),
    texture_style:
      story_mode === 'diagonal_current'
        ? 'diagonal_hatch'
        : story_mode === 'spiral_filament'
          ? 'spiral'
          : 'diamond_wave',
    texture_mix: Number(clamp(0.48 + rand() * 0.22, 0.45, 0.78).toFixed(4)),
    detail_density: Number(clamp(0.58 + rand() * 0.24, 0.55, 0.88).toFixed(4)),
    brightness_floor: Number(brightness_floor.toFixed(4)),
    metallic_outline_strength: Number(clamp(0.44 + rand() * 0.24, 0.4, 0.82).toFixed(4)),
    palette_motion: Number(clamp(0.52 + rand() * 0.30, 0.5, 0.86).toFixed(4)),
  };
}
