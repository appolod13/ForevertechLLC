/**
 * 4D Fractal Generator - Multi-Fractal Blending Edition
 * Creates COMPOSITE fractal designs combining multiple patterns in single image
 * Each promo generates unique blend of 2-4 fractals layered together
 */

export interface QuantumFieldConfig {
  wave_amplitude: number;
  frequency: number;
  phase_offset: number;
  distortion_mode: 'ripple' | 'turbulence' | 'vortex' | 'spiral' | 'wave' | 'chaos' | 'crystalline';
  field_intensity: number;
  blend_with_fractal: number;
  color_influence: string;
  morphing_speed: number;
  rotation_velocity: number;
}

export interface FractalConfig {
  primary_fractals: string[]; // CHANGED: Array of fractals to blend
  sierpinski_depth: number;
  koch_iterations: number;
  vicsek_scale: number;
  mandelbrot_zoom: number;
  mandelbrot_iterations: number;
  julia_constant_real: number;
  julia_constant_imag: number;
  burning_ship_iterations: number;
  trinity_fractal_param: number;
  lyapunov_exponent: number;
  newton_fractal_iterations: number;
  blend_mode: 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light' | 'color-dodge' | 'color-burn';
  color_palette: string[];
  symmetry: number;
  rotation: number;
  scale: number;
  quantum_field: QuantumFieldConfig;
}

export interface FractalPromptParsed {
  primary_fractal: string; // First primary
  secondary_fractals: string[]; // Additional fractals to blend
  intensity: number;
  complexity: number;
  color_temperature: 'cool' | 'warm' | 'balanced' | 'neon' | 'cosmic' | 'void' | 'ethereal' | 'acidic';
  emotion: string;
  quantum_emotion: string;
  config: FractalConfig;
}

// ALL 9 FRACTALS
const ALL_FRACTALS = ['sierpinski', 'koch', 'vicsek', 'mandelbrot', 'julia', 'burning_ship', 'trinity', 'lyapunov', 'newton'];

const EMOTION_KEYWORDS: Record<string, { intensity: number; distortion: string; colors: string[] }> = {
  // Calm emotions
  'peaceful': { intensity: 0.2, distortion: 'wave', colors: ['#001a33', '#00264d', '#003d66', '#0066cc', '#0099ff'] },
  'serene': { intensity: 0.25, distortion: 'ripple', colors: ['#000d1a', '#001f33', '#003d66', '#0099ff', '#00d4ff'] },
  'tranquil': { intensity: 0.22, distortion: 'wave', colors: ['#000a1a', '#001a2e', '#003d66', '#00a3d4', '#00e6ff'] },
  'meditative': { intensity: 0.18, distortion: 'ripple', colors: ['#0a0a1a', '#1a1a33', '#333366', '#5555dd', '#7777ff'] },

  // Intense emotions
  'intense': { intensity: 0.95, distortion: 'turbulence', colors: ['#ff0000', '#ff00ff', '#ff0080', '#ff0040', '#000000'] },
  'vivid': { intensity: 0.88, distortion: 'chaos', colors: ['#ff00ff', '#00ffff', '#ffff00', '#ff0080', '#0040ff'] },
  'explosive': { intensity: 1.0, distortion: 'vortex', colors: ['#ff3300', '#ff0000', '#ff00ff', '#ffff00', '#000000'] },
  'chaotic': { intensity: 0.92, distortion: 'chaos', colors: ['#ff00ff', '#00ff00', '#ffff00', '#ff0080', '#00ffff'] },

  // Dark/Void emotions
  'void': { intensity: 0.35, distortion: 'vortex', colors: ['#000000', '#0a0a1a', '#1a1a33', '#2d2d66', '#4d4d99'] },
  'dark': { intensity: 0.4, distortion: 'spiral', colors: ['#0d0d1a', '#1a1a2e', '#2d3d66', '#4d5599', '#6666cc'] },
  'ominous': { intensity: 0.5, distortion: 'turbulence', colors: ['#1a0a0a', '#330000', '#660000', '#990000', '#2d0066'] },
  'shadow': { intensity: 0.38, distortion: 'ripple', colors: ['#0a0a0a', '#1a1a1a', '#333333', '#4d4d66', '#5555aa'] },
  'abyss': { intensity: 0.45, distortion: 'vortex', colors: ['#000000', '#0a0a1a', '#1a1a4d', '#2d2d99', '#0066ff'] },

  // Energetic/Cosmic emotions
  'quantum': { intensity: 0.75, distortion: 'crystalline', colors: ['#000033', '#0066ff', '#00ffff', '#ff00ff', '#ffff00'] },
  'cosmic': { intensity: 0.7, distortion: 'spiral', colors: ['#0a0a2e', '#16213e', '#0f3460', '#00d4ff', '#ff00ff'] },
  'ethereal': { intensity: 0.55, distortion: 'wave', colors: ['#1a0a3d', '#2d1a66', '#4d2d99', '#7755ff', '#00ffff'] },
  'luminous': { intensity: 0.8, distortion: 'wave', colors: ['#001a33', '#003d66', '#00d4ff', '#00ffff', '#ffff00'] },
  'radiant': { intensity: 0.85, distortion: 'ripple', colors: ['#1a1a00', '#4d4d00', '#ffff00', '#ffaa00', '#ff6600'] },
  'nebula': { intensity: 0.72, distortion: 'turbulence', colors: ['#1a0a3d', '#3d0a66', '#66099f', '#00ffff', '#ff00ff'] },

  // Nature/Organic emotions
  'organic': { intensity: 0.6, distortion: 'wave', colors: ['#0a3d1a', '#1a6633', '#2d994d', '#66ff66', '#00ff99'] },
  'flowing': { intensity: 0.5, distortion: 'wave', colors: ['#0a1a3d', '#1a3d66', '#2d66aa', '#00ccff', '#00ff99'] },
  'fractured': { intensity: 0.65, distortion: 'crystalline', colors: ['#330033', '#660066', '#990099', '#ff00ff', '#00ffff'] },
  'crystalline': { intensity: 0.7, distortion: 'crystalline', colors: ['#000066', '#0033ff', '#00ccff', '#ffffff', '#ccccff'] },

  // Other emotions
  'angry': { intensity: 0.9, distortion: 'turbulence', colors: ['#660000', '#990000', '#cc0000', '#ff0000', '#ff3300'] },
  'melancholic': { intensity: 0.45, distortion: 'ripple', colors: ['#0a1a2e', '#1a2e4d', '#2d4d66', '#4d7599', '#6699cc'] },
  'joyful': { intensity: 0.8, distortion: 'spiral', colors: ['#ffaa00', '#ffff00', '#ff6600', '#ff0080', '#00ffff'] },
  'dreamlike': { intensity: 0.55, distortion: 'wave', colors: ['#1a0a3d', '#3d1a66', '#6633ff', '#aa66ff', '#00ffff'] },
  'mysterious': { intensity: 0.6, distortion: 'vortex', colors: ['#0a0a33', '#1a1a66', '#2d2d99', '#5555ff', '#ff00ff'] },
};

/**
 * MULTI-FRACTAL: Select 2-4 fractals to blend based on promo
 */
function selectFractalsToBlend(prompt: string, complexity: number): string[] {
  const normalized = prompt.toLowerCase();
  let selected: string[] = [];

  // Check for specific fractal names
  ALL_FRACTALS.forEach(fractal => {
    if (normalized.includes(fractal)) {
      selected.push(fractal);
    }
  });

  // If no specific fractals found, select based on complexity
  if (selected.length === 0) {
    if (complexity > 0.8) {
      // Ultra-detailed: blend 4 fractals – Julia leads the story, Koch strings it together,
      // Sierpinski anchors the ancient structure, Mandelbrot adds boundary depth.
      selected = ['julia', 'koch', 'sierpinski', 'mandelbrot'];
    } else if (complexity > 0.6) {
      // Medium-detailed: the canonical fractal storytelling trio (Julia + Koch + Sierpinski)
      // plus alternating companions for variety.
      const options = [
        ['julia', 'koch', 'sierpinski'],    // primary trio – expressive storytelling
        ['julia', 'sierpinski', 'koch'],    // same trio, Sierpinski as secondary anchor
        ['julia', 'burning_ship', 'koch'],  // drama + strings
        ['julia', 'newton', 'sierpinski'],  // resolution arc
        ['julia', 'lyapunov', 'koch'],      // chaos theory thread
      ];
      selected = options[Math.floor(Math.random() * options.length)];
    } else {
      // Simple: Julia + Koch – the most expressive string-like pair
      const options = [
        ['julia', 'koch'],
        ['julia', 'sierpinski'],
        ['julia', 'burning_ship'],
        ['koch', 'sierpinski'],
        ['julia', 'newton'],
      ];
      selected = options[Math.floor(Math.random() * options.length)];
    }
  }

  // If only 1 fractal selected, add 1-2 more for blending
  if (selected.length === 1) {
    const primary = selected[0];
    const remaining = ALL_FRACTALS.filter(f => f !== primary);
    const toAdd = Math.floor(1 + complexity);
    for (let i = 0; i < toAdd; i++) {
      const idx = Math.floor(Math.random() * remaining.length);
      selected.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
  }

  return selected.slice(0, 4); // Max 4 fractals to blend
}

/**
 * Parse promo and select multiple fractals for blending
 */
export function parsePromptTo4DFractal(prompt: string): FractalPromptParsed {
  const normalized = prompt.toLowerCase();
  
  let intensity = 0.7;
  for (const [keyword, value] of Object.entries({ 'soft': 0.2, 'gentle': 0.22, 'subtle': 0.25, 'tender': 0.23, 'light': 0.3, 'medium': 0.5, 'balanced': 0.55, 'strong': 0.75, 'bold': 0.78, 'intense': 0.88, 'vivid': 0.9, 'explosive': 0.95, 'extreme': 1.0 })) {
    if (normalized.includes(keyword)) {
      intensity = value;
      break;
    }
  }

  let complexity = 0.65;
  for (const [keyword, value] of Object.entries({ 'simple': 0.15, 'basic': 0.2, 'minimal': 0.18, 'detailed': 0.55, 'intricate': 0.65, 'elaborate': 0.68, 'complex': 0.75, 'very detailed': 0.8, 'ultra-detailed': 0.92, 'infinite': 1.0 })) {
    if (normalized.includes(keyword)) {
      complexity = value;
      break;
    }
  }

  let color_temperature: 'cool' | 'warm' | 'balanced' | 'neon' | 'cosmic' | 'void' | 'ethereal' | 'acidic' = 'balanced';
  const tempMap: Record<string, 'cool' | 'warm' | 'balanced' | 'neon' | 'cosmic' | 'void' | 'ethereal' | 'acidic'> = {
    'cool': 'cool', 'cold': 'cool', 'cyan': 'cool', 'blue': 'cool', 'ice': 'cool',
    'warm': 'warm', 'hot': 'warm', 'magenta': 'warm', 'red': 'warm', 'fire': 'warm',
    'balanced': 'balanced', 'neutral': 'balanced',
    'neon': 'neon', 'electric': 'neon', 'bright': 'neon', 'glowing': 'neon',
    'cosmic': 'cosmic', 'space': 'cosmic', 'void': 'void', 'dark': 'void', 'black': 'void',
    'ethereal': 'ethereal', 'mystical': 'ethereal', 'spiritual': 'ethereal',
    'acidic': 'acidic', 'toxic': 'acidic', 'nuclear': 'acidic', 'radioactive': 'acidic',
  };
  for (const [keyword, value] of Object.entries(tempMap)) {
    if (normalized.includes(keyword)) {
      color_temperature = value;
      break;
    }
  }

  let emotion = 'quantum';
  for (const emotionKeyword of Object.keys(EMOTION_KEYWORDS)) {
    if (normalized.includes(emotionKeyword)) {
      emotion = emotionKeyword;
      break;
    }
  }

  let quantum_emotion = 'ethereal';
  const quantumEmotions = ['flowing', 'spiraling', 'pulsing', 'crystalline', 'chaotic', 'harmonic'];
  for (const qEmotion of quantumEmotions) {
    if (normalized.includes(qEmotion)) {
      quantum_emotion = qEmotion;
      break;
    }
  }

  // SELECT MULTIPLE FRACTALS FOR BLENDING
  const secondary_fractals = selectFractalsToBlend(prompt, complexity);
  const primary_fractal = secondary_fractals[0] || 'hybrid';

  const config = generateMultiFractalConfig(secondary_fractals, intensity, complexity, color_temperature, emotion, quantum_emotion);

  return {
    primary_fractal,
    secondary_fractals,
    intensity,
    complexity,
    color_temperature,
    emotion,
    quantum_emotion,
    config
  };
}

/**
 * Generate quantum field configuration
 */
function generateQuantumFieldConfig(emotion: string, quantum_emotion: string, intensity: number, complexity: number): QuantumFieldConfig {
  const emotionData = EMOTION_KEYWORDS[emotion] || EMOTION_KEYWORDS['quantum'];
  
  const distortionMap: Record<string, 'ripple' | 'turbulence' | 'vortex' | 'spiral' | 'wave' | 'chaos' | 'crystalline'> = {
    'flowing': 'wave',
    'spiraling': 'spiral',
    'pulsing': 'ripple',
    'crystalline': 'crystalline',
    'chaotic': 'chaos',
    'harmonic': 'wave',
  };

  return {
    wave_amplitude: emotionData.intensity * (0.5 + complexity * 0.5),
    frequency: 2 + complexity * 8,
    phase_offset: Math.random() * Math.PI * 2,
    distortion_mode: distortionMap[quantum_emotion] || (emotionData.distortion as 'ripple' | 'turbulence' | 'vortex' | 'spiral' | 'wave' | 'chaos' | 'crystalline'),
    field_intensity: 0.4 + intensity * 0.6,
    blend_with_fractal: 0.5 + intensity * 0.3,
    color_influence: emotionData.colors[Math.floor(Math.random() * emotionData.colors.length)],
    morphing_speed: 0.1 + complexity * 0.4,
    rotation_velocity: (intensity * 0.3) * (Math.random() > 0.5 ? 1 : -1),
  };
}

/**
 * Generate multi-fractal configuration
 */
function generateMultiFractalConfig(fractals: string[], intensity: number, complexity: number, color_temperature: 'cool' | 'warm' | 'balanced' | 'neon' | 'cosmic' | 'void' | 'ethereal' | 'acidic', emotion: string, quantum_emotion: string): FractalConfig {
  const palettes: Record<string, string[]> = {
    cool: ['#000000', '#0a1a3a', '#1a4d7a', '#00d4ff', '#00ffff', '#0066ff', '#0a1a3a'],
    warm: ['#000000', '#2a0a0a', '#7a1a1a', '#ff00ff', '#ff0080', '#ff3300', '#2a0a0a'],
    balanced: ['#000000', '#1a1a3a', '#3a3a7a', '#00d4ff', '#ff00ff', '#ffff00', '#1a1a3a'],
    neon: ['#000000', '#00ff00', '#00ffff', '#ff00ff', '#ffff00', '#ff0080', '#0066ff'],
    cosmic: ['#0a0a2e', '#16213e', '#0f3460', '#00d4ff', '#ff00ff', '#ff6600', '#00ff99'],
    void: ['#000000', '#0a0a1a', '#1a1a33', '#2d2d66', '#4d4d99', '#00d4ff', '#ff00ff'],
    ethereal: ['#1a0a3d', '#2d1a66', '#4d2d99', '#7755ff', '#00ffff', '#ff00ff', '#00ff99'],
    acidic: ['#00ff00', '#00ffff', '#ffff00', '#ff00ff', '#ff0080', '#00ff00', '#ccff00'],
  };

  const quantum_field = generateQuantumFieldConfig(emotion, quantum_emotion, intensity, complexity);

  return {
    primary_fractals: fractals,
    sierpinski_depth: Math.round(5 + complexity * 10),
    koch_iterations: Math.round(3 + complexity * 6),
    vicsek_scale: 1 - (0.3 * complexity),
    mandelbrot_zoom: Math.pow(2, 2 + complexity * 10),
    mandelbrot_iterations: Math.round(80 + complexity * 250),
    julia_constant_real: -0.7269 + (intensity * 0.08),
    julia_constant_imag: 0.1889 + (intensity * 0.10),
    burning_ship_iterations: Math.round(60 + complexity * 200),
    trinity_fractal_param: 0.85,
    lyapunov_exponent: -0.55,
    newton_fractal_iterations: 20,
    blend_mode: 'overlay',
    color_palette: palettes[color_temperature],
    symmetry: 1,
    rotation: Math.random() * Math.PI * 2,
    scale: 0.9 + (intensity * 0.1),
    quantum_field
  };
}

/**
 * Convert multi-fractal config to enhanced prompt with fractal storytelling language
 */
export function fractalConfigToPrompt(config: FractalConfig, emotion: string, quantum_emotion: string, fractals: string[]): string {
  // Describe ALL selected fractals with storytelling roles
  const fractalDescriptions = fractals.map((f, i) => {
    const descriptions: Record<string, string> = {
      'sierpinski': `Sierpinski recursive triangles ${i === 0 ? 'carrying ancient memory at the heart of the story' : 'woven as structural scaffolding across the narrative'}`,
      'koch': `Koch snowflake string-like filaments ${i === 0 ? 'threading the opening passage' : 'branching like plot threads through the composition'}`,
      'vicsek': `Vicsek cross-shaped self-similar fractal ${i === 0 ? 'anchoring the story grid' : 'layered as a recurring motif'}`,
      'mandelbrot': `Mandelbrot boundary complexity ${i === 0 ? "framing the story's edge" : 'adding structural depth as a supporting layer'}`,
      'julia': `Julia set expressive organic spirals ${i === 0 ? 'as the emotional soul and primary narrator' : 'as a secondary emotional voice'}`,
      'burning_ship': `Burning Ship fire-like recursive patterns ${i === 0 ? "igniting the story's climax" : 'smoldering in the background tension'}`,
      'trinity': `Trinity fractal 3-fold symmetric patterns ${i === 0 ? 'as the central narrative pillar' : 'woven into the resolution arc'}`,
      'lyapunov': `Lyapunov chaos theory visualization ${i === 0 ? "mapping the story's chaotic turning point" : 'adding layers of ordered chaos'}`,
      'newton': `Newton fractal basin of attraction ${i === 0 ? 'guiding the story to resolution' : 'pulling recursive threads toward closure'}`,
    };
    return descriptions[f] || f;
  }).join(', ');

  const blendTechnique = fractals.length > 2
    ? `${fractals.length} fractal types composited as a multi-chapter narrative tapestry`
    : `${fractals.length} fractal types interwoven in a recursive story arc`;

  const prompt = `Fractal storytelling canvas — ${emotion} multi-fractal composite: ${fractalDescriptions}. ${blendTechnique}, strings and filaments of Koch branching like plot threads, Sierpinski's ancient triangular memory holding the structure, Julia's expressive organic spirals narrating the emotional core. Recursive narrative unfolding from quantum string-like filaments, each iteration a new chapter emerging from the previous. Quantum field with ${quantum_emotion} distortion mode (morphing speed ${config.quantum_field.morphing_speed.toFixed(2)}), flowing dynamic background. Color palette: ${config.color_palette.slice(0, 4).join(', ')} on black void with glowing neon accents — the image tells a story through self-similar repetition, ancient fractal geometry woven with living emotional threads. Perfectly centered, ethereal luminous glow, high contrast, mathematical precision fused with organic emotional flow, professional merch-ready, 8k resolution, cinematic volumetric lighting`;

  return prompt;
}

/**
 * Generate negative prompt
 */
export function generateFractalNegativePrompt(intensity: number, emotion: string): string {
  const baseNegative = "blurry, low quality, artifacts, deformed, text, watermark, realistic photo, cartoonish, dull flat colors, poor centering, split designs, disconnected patterns, multiple isolated shapes, low contrast, bright white background, solid filled areas, generic gradient, ui background, plain design, single pattern, monolithic design, separate unrelated fractals";
  
  let emotionSpecific = "";
  
  if (intensity > 0.85) {
    emotionSpecific = ", oversaturated, washed out, faded colors";
  } else if (intensity < 0.3) {
    emotionSpecific = ", overly complex, chaotic unreadable, too busy";
  }

  if (emotion.includes('void') || emotion.includes('dark')) {
    emotionSpecific += ", bright, light, washed out, visible background";
  } else if (emotion.includes('ethereal') || emotion.includes('luminous')) {
    emotionSpecific += ", dark, dim, low contrast, flat colors";
  }

  return baseNegative + emotionSpecific;
}

/**
 * Full pipeline: Promo → Multi-Fractal Image Prompt
 */
export function promoToImagePrompt(promoText: string): {
  prompt: string;
  negative_prompt: string;
  config: FractalPromptParsed;
} {
  const parsed = parsePromptTo4DFractal(promoText);
  const prompt = fractalConfigToPrompt(parsed.config, parsed.emotion, parsed.quantum_emotion, parsed.secondary_fractals);
  const negative_prompt = generateFractalNegativePrompt(parsed.intensity, parsed.emotion);

  return {
    prompt,
    negative_prompt,
    config: parsed
  };
}

/**
 * Get quantum field metadata
 */
export function getQuantumFieldMetadata(emotion: string): Record<string, unknown> {
  const emotionData = EMOTION_KEYWORDS[emotion] || EMOTION_KEYWORDS['quantum'];
  
  return {
    emotion,
    distortion_type: emotionData.distortion,
    primary_colors: emotionData.colors,
    intensity_level: emotionData.intensity,
    field_characteristics: {
      waves_per_frame: 4 + emotionData.intensity * 6,
      color_shift_frequency: emotionData.intensity * 0.5,
      edge_softness: 1 - emotionData.intensity,
    }
  };
}
