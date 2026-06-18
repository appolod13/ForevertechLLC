/**
 * 4D Fractal Generator - Enhanced Edition
 * Merges: Sierpinski Triangle, Koch Snowflake, Vicsek Fractal, Mandelbrot-Julia Set
 * + Quantum Field Dynamics with Emotion-Based Shape Morphing
 * Converts text prompts into multi-dimensional fractal design parameters
 */

export interface QuantumFieldConfig {
  wave_amplitude: number;
  frequency: number;
  phase_offset: number;
  distortion_mode: 'ripple' | 'turbulence' | 'vortex' | 'spiral' | 'wave' | 'chaos' | 'crystalline';
  field_intensity: number;
  blend_with_fractal: number; // 0-1, how much quantum field blends
  color_influence: string;
  morphing_speed: number;
  rotation_velocity: number;
}

export interface FractalConfig {
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
  primary_fractal: 'sierpinski' | 'koch' | 'vicsek' | 'mandelbrot' | 'julia' | 'burning_ship' | 'trinity' | 'lyapunov' | 'newton' | 'hybrid';
  intensity: number; // 0-1
  complexity: number; // 0-1
  color_temperature: 'cool' | 'warm' | 'balanced' | 'neon' | 'cosmic' | 'void' | 'ethereal' | 'acidic';
  emotion: string;
  quantum_emotion: string;
  config: FractalConfig;
}

// Expanded emotion keywords with quantum field properties
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

  // Emotional states
  'angry': { intensity: 0.9, distortion: 'turbulence', colors: ['#660000', '#990000', '#cc0000', '#ff0000', '#ff3300'] },
  'melancholic': { intensity: 0.45, distortion: 'ripple', colors: ['#0a1a2e', '#1a2e4d', '#2d4d66', '#4d7599', '#6699cc'] },
  'joyful': { intensity: 0.8, distortion: 'spiral', colors: ['#ffaa00', '#ffff00', '#ff6600', '#ff0080', '#00ffff'] },
  'dreamlike': { intensity: 0.55, distortion: 'wave', colors: ['#1a0a3d', '#3d1a66', '#6633ff', '#aa66ff', '#00ffff'] },
  'mysterious': { intensity: 0.6, distortion: 'vortex', colors: ['#0a0a33', '#1a1a66', '#2d2d99', '#5555ff', '#ff00ff'] },

  // Texture emotions
  'smooth': { intensity: 0.35, distortion: 'wave', colors: ['#0a1a33', '#1a3d66', '#2d66aa', '#00ccff', '#00ffff'] },
  'rough': { intensity: 0.75, distortion: 'turbulence', colors: ['#330033', '#660066', '#990099', '#ff00ff', '#ffff00'] },
  'sharp': { intensity: 0.8, distortion: 'crystalline', colors: ['#0066ff', '#00ffff', '#ff0080', '#ffff00', '#ffffff'] },
  'electric': { intensity: 0.92, distortion: 'chaos', colors: ['#00ffff', '#00ff00', '#ffff00', '#ff00ff', '#0066ff'] },

  // Mathematical emotions
  'geometric': { intensity: 0.65, distortion: 'crystalline', colors: ['#000066', '#0033ff', '#00ccff', '#00ff99', '#ffff00'] },
  'mathematical': { intensity: 0.7, distortion: 'crystalline', colors: ['#1a1a33', '#3333ff', '#00ffff', '#ffff00', '#ffffff'] },
  'algorithmic': { intensity: 0.68, distortion: 'vortex', colors: ['#000033', '#003366', '#0066ff', '#00ffff', '#00ff00'] },
  'recursive': { intensity: 0.72, distortion: 'spiral', colors: ['#0a0a1a', '#1a1a33', '#3333ff', '#00ffff', '#ff00ff'] },
};

const INTENSITY_KEYWORDS: Record<string, number> = {
  'soft': 0.2, 'gentle': 0.22, 'subtle': 0.25, 'tender': 0.23,
  'light': 0.3, 'faint': 0.28, 'whisper': 0.25,
  'medium': 0.5, 'moderate': 0.52, 'balanced': 0.55, 'normal': 0.5,
  'strong': 0.75, 'bold': 0.78, 'powerful': 0.8,
  'intense': 0.88, 'vivid': 0.9, 'explosive': 0.95, 'extreme': 1.0, 'maximum': 1.0,
};

const COMPLEXITY_KEYWORDS: Record<string, number> = {
  'simple': 0.15, 'basic': 0.2, 'minimal': 0.18,
  'detailed': 0.55, 'intricate': 0.65, 'elaborate': 0.68,
  'complex': 0.75, 'very detailed': 0.8, 'ultra-detailed': 0.92, 'infinite': 1.0,
};

const COLOR_TEMPERATURE_KEYWORDS: Record<string, 'cool' | 'warm' | 'balanced' | 'neon' | 'cosmic' | 'void' | 'ethereal' | 'acidic'> = {
  'cool': 'cool', 'cold': 'cool', 'cyan': 'cool', 'blue': 'cool', 'ice': 'cool',
  'warm': 'warm', 'hot': 'warm', 'magenta': 'warm', 'red': 'warm', 'fire': 'warm',
  'balanced': 'balanced', 'neutral': 'balanced',
  'neon': 'neon', 'electric': 'neon', 'bright': 'neon', 'glowing': 'neon',
  'cosmic': 'cosmic', 'space': 'cosmic', 'void': 'void', 'dark': 'void', 'black': 'void',
  'ethereal': 'ethereal', 'mystical': 'ethereal', 'spiritual': 'ethereal',
  'acidic': 'acidic', 'toxic': 'acidic', 'nuclear': 'acidic', 'radioactive': 'acidic',
};

/**
 * Parse natural language promo string into 4D fractal configuration with quantum field
 * Example: "quantum void sierpinski with neon edges and flowing energy" -> FractalPromptParsed
 */
export function parsePromptTo4DFractal(prompt: string): FractalPromptParsed {
  const normalized = prompt.toLowerCase();
  
  // Detect primary fractal type
  let primary_fractal: 'sierpinski' | 'koch' | 'vicsek' | 'mandelbrot' | 'julia' | 'burning_ship' | 'trinity' | 'lyapunov' | 'newton' | 'hybrid' = 'hybrid';
  if (normalized.includes('sierpinski') || normalized.includes('triangle')) {
    primary_fractal = 'sierpinski';
  } else if (normalized.includes('koch') || normalized.includes('snowflake')) {
    primary_fractal = 'koch';
  } else if (normalized.includes('vicsek') || normalized.includes('cross')) {
    primary_fractal = 'vicsek';
  } else if (normalized.includes('mandelbrot')) {
    primary_fractal = 'mandelbrot';
  } else if (normalized.includes('julia')) {
    primary_fractal = 'julia';
  } else if (normalized.includes('burning') || normalized.includes('ship')) {
    primary_fractal = 'burning_ship';
  } else if (normalized.includes('trinity')) {
    primary_fractal = 'trinity';
  } else if (normalized.includes('lyapunov')) {
    primary_fractal = 'lyapunov';
  } else if (normalized.includes('newton')) {
    primary_fractal = 'newton';
  }

  // Detect intensity
  let intensity = 0.7;
  for (const [keyword, value] of Object.entries(INTENSITY_KEYWORDS)) {
    if (normalized.includes(keyword)) {
      intensity = value;
      break;
    }
  }

  // Detect complexity
  let complexity = 0.65;
  for (const [keyword, value] of Object.entries(COMPLEXITY_KEYWORDS)) {
    if (normalized.includes(keyword)) {
      complexity = value;
      break;
    }
  }

  // Detect color temperature
  let color_temperature: 'cool' | 'warm' | 'balanced' | 'neon' | 'cosmic' | 'void' | 'ethereal' | 'acidic' = 'balanced';
  for (const [keyword, value] of Object.entries(COLOR_TEMPERATURE_KEYWORDS)) {
    if (normalized.includes(keyword)) {
      color_temperature = value;
      break;
    }
  }

  // Extract primary emotion and quantum emotion
  let emotion = 'quantum';
  let quantum_emotion = 'ethereal';
  
  for (const emotionKeyword of Object.keys(EMOTION_KEYWORDS)) {
    if (normalized.includes(emotionKeyword)) {
      emotion = emotionKeyword;
      break;
    }
  }

  // Find secondary quantum emotion
  const quantumEmotions = ['flowing', 'spiraling', 'pulsing', 'crystalline', 'chaotic', 'harmonic'];
  for (const qEmotion of quantumEmotions) {
    if (normalized.includes(qEmotion)) {
      quantum_emotion = qEmotion;
      break;
    }
  }

  // Generate 4D configuration with quantum field
  const config = generateFractalConfig(primary_fractal, intensity, complexity, color_temperature, emotion, quantum_emotion);

  return {
    primary_fractal,
    intensity,
    complexity,
    color_temperature,
    emotion,
    quantum_emotion,
    config
  };
}

/**
 * Generate quantum field configuration based on emotion
 */
function generateQuantumFieldConfig(
  emotion: string,
  quantum_emotion: string,
  intensity: number,
  complexity: number
): QuantumFieldConfig {
  const emotionData = EMOTION_KEYWORDS[emotion] || EMOTION_KEYWORDS['quantum'];
  
  // Map quantum emotions to distortion modes
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
 * Generate fractal configuration from parsed parameters
 */
function generateFractalConfig(
  fractal_type: string,
  intensity: number,
  complexity: number,
  color_temperature: 'cool' | 'warm' | 'balanced' | 'neon' | 'cosmic' | 'void' | 'ethereal' | 'acidic',
  emotion: string,
  quantum_emotion: string
): FractalConfig {
  // Extended base configurations for each fractal type
  const baseConfigs: Record<string, Partial<FractalConfig>> = {
    sierpinski: {
      sierpinski_depth: Math.round(5 + complexity * 10),
      koch_iterations: 2,
      vicsek_scale: 0.3,
      mandelbrot_iterations: 20,
      burning_ship_iterations: 15,
      trinity_fractal_param: 0.8,
      lyapunov_exponent: -0.5,
      newton_fractal_iterations: 10,
      symmetry: 3,
      blend_mode: 'overlay'
    },
    koch: {
      sierpinski_depth: 2,
      koch_iterations: Math.round(3 + complexity * 6),
      vicsek_scale: 0.5,
      mandelbrot_iterations: 15,
      burning_ship_iterations: 12,
      trinity_fractal_param: 0.7,
      lyapunov_exponent: -0.4,
      newton_fractal_iterations: 12,
      symmetry: 6,
      blend_mode: 'screen'
    },
    vicsek: {
      sierpinski_depth: 3,
      koch_iterations: 2,
      vicsek_scale: 1 - (0.3 * complexity),
      mandelbrot_iterations: 25,
      burning_ship_iterations: 20,
      trinity_fractal_param: 0.9,
      lyapunov_exponent: -0.6,
      newton_fractal_iterations: 15,
      symmetry: 5,
      blend_mode: 'multiply'
    },
    mandelbrot: {
      sierpinski_depth: 3,
      koch_iterations: 2,
      vicsek_scale: 0.4,
      mandelbrot_zoom: Math.pow(2, 2 + complexity * 10),
      mandelbrot_iterations: Math.round(80 + complexity * 250),
      burning_ship_iterations: Math.round(60 + complexity * 200),
      trinity_fractal_param: 0.85,
      lyapunov_exponent: -0.55,
      newton_fractal_iterations: 20,
      symmetry: 1,
      blend_mode: 'soft-light'
    },
    julia: {
      sierpinski_depth: 2,
      koch_iterations: 1,
      vicsek_scale: 0.5,
      mandelbrot_zoom: Math.pow(2, 1 + complexity * 8),
      mandelbrot_iterations: Math.round(100 + complexity * 250),
      julia_constant_real: -0.7269 + (intensity * 0.15),
      julia_constant_imag: 0.1889 + (intensity * 0.15),
      burning_ship_iterations: 80,
      trinity_fractal_param: 0.88,
      lyapunov_exponent: -0.52,
      newton_fractal_iterations: 18,
      symmetry: 1,
      blend_mode: 'overlay'
    },
    burning_ship: {
      sierpinski_depth: 2,
      koch_iterations: 2,
      vicsek_scale: 0.35,
      mandelbrot_zoom: Math.pow(2, 2 + complexity * 9),
      mandelbrot_iterations: Math.round(120 + complexity * 280),
      burning_ship_iterations: Math.round(150 + complexity * 300),
      trinity_fractal_param: 0.82,
      lyapunov_exponent: -0.58,
      newton_fractal_iterations: 22,
      symmetry: 2,
      blend_mode: 'color-dodge'
    },
    trinity: {
      sierpinski_depth: 4,
      koch_iterations: 3,
      vicsek_scale: 0.45,
      mandelbrot_zoom: Math.pow(2, 1.5 + complexity * 7),
      mandelbrot_iterations: Math.round(90 + complexity * 230),
      trinity_fractal_param: 1.0 - (0.2 * complexity),
      burning_ship_iterations: 70,
      lyapunov_exponent: -0.48,
      newton_fractal_iterations: 16,
      symmetry: 3,
      blend_mode: 'hard-light'
    },
    lyapunov: {
      sierpinski_depth: 3,
      koch_iterations: 2,
      vicsek_scale: 0.4,
      mandelbrot_zoom: Math.pow(2, 0.5 + complexity * 5),
      mandelbrot_iterations: 60,
      burning_ship_iterations: 50,
      trinity_fractal_param: 0.75,
      lyapunov_exponent: -0.6 + (intensity * 0.1),
      newton_fractal_iterations: 14,
      symmetry: 1,
      blend_mode: 'color-burn'
    },
    newton: {
      sierpinski_depth: 2,
      koch_iterations: 1,
      vicsek_scale: 0.5,
      mandelbrot_zoom: Math.pow(2, 1 + complexity * 4),
      mandelbrot_iterations: 40,
      burning_ship_iterations: 35,
      trinity_fractal_param: 0.7,
      lyapunov_exponent: -0.4,
      newton_fractal_iterations: Math.round(25 + complexity * 100),
      symmetry: 1,
      blend_mode: 'overlay'
    },
    hybrid: {
      sierpinski_depth: Math.round(3 + complexity * 7),
      koch_iterations: Math.round(2 + complexity * 4),
      vicsek_scale: 0.4 + (intensity * 0.3),
      mandelbrot_zoom: Math.pow(2, 1 + complexity * 6),
      mandelbrot_iterations: Math.round(70 + complexity * 200),
      julia_constant_real: -0.7 + (intensity * 0.2),
      julia_constant_imag: 0.15 + (intensity * 0.2),
      burning_ship_iterations: Math.round(60 + complexity * 180),
      trinity_fractal_param: 0.8 + (intensity * 0.1),
      lyapunov_exponent: -0.52 + (intensity * 0.08),
      newton_fractal_iterations: Math.round(12 + complexity * 50),
      symmetry: 4,
      blend_mode: 'overlay'
    }
  };

  const baseConfig = baseConfigs[fractal_type] || baseConfigs.hybrid;

  // Expanded color palettes
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

  // Quantum field configuration
  const quantum_field = generateQuantumFieldConfig(emotion, quantum_emotion, intensity, complexity);

  return {
    sierpinski_depth: baseConfig.sierpinski_depth || 5,
    koch_iterations: baseConfig.koch_iterations || 2,
    vicsek_scale: baseConfig.vicsek_scale || 0.4,
    mandelbrot_zoom: baseConfig.mandelbrot_zoom || 1,
    mandelbrot_iterations: baseConfig.mandelbrot_iterations || 50,
    julia_constant_real: baseConfig.julia_constant_real || -0.7269,
    julia_constant_imag: baseConfig.julia_constant_imag || 0.1889,
    burning_ship_iterations: baseConfig.burning_ship_iterations || 50,
    trinity_fractal_param: baseConfig.trinity_fractal_param || 0.8,
    lyapunov_exponent: baseConfig.lyapunov_exponent || -0.5,
    newton_fractal_iterations: baseConfig.newton_fractal_iterations || 15,
    blend_mode: baseConfig.blend_mode || 'overlay',
    color_palette: palettes[color_temperature],
    symmetry: baseConfig.symmetry || 1,
    rotation: Math.random() * Math.PI * 2,
    scale: 0.9 + (intensity * 0.1),
    quantum_field
  };
}

/**
 * Convert FractalConfig to optimized prompt for image generation
 */
export function fractalConfigToPrompt(config: FractalConfig, emotion: string, quantum_emotion: string): string {
  const fractals: string[] = [];

  if (config.sierpinski_depth > 2) {
    fractals.push(`Sierpinski triangle depth ${config.sierpinski_depth}, recursive geometric patterns`);
  }
  if (config.koch_iterations > 1) {
    fractals.push(`Koch snowflake iterations ${config.koch_iterations}, intricate branching`);
  }
  if (config.vicsek_scale > 0.3) {
    fractals.push(`Vicsek cross-shaped fractal, self-similar scaling ${Math.round(config.vicsek_scale * 100)}%`);
  }
  if (config.mandelbrot_iterations > 20) {
    fractals.push(`Mandelbrot set with ${config.mandelbrot_iterations} iterations, zoom level ${Math.round(Math.log2(config.mandelbrot_zoom))}`);
  }
  if (config.julia_constant_real !== 0 || config.julia_constant_imag !== 0) {
    fractals.push(`Julia set [c=${config.julia_constant_real.toFixed(3)} + ${config.julia_constant_imag.toFixed(3)}i], organic flowing patterns`);
  }
  if (config.burning_ship_iterations > 20) {
    fractals.push(`Burning Ship iterations ${config.burning_ship_iterations}, fire-like recursive structures`);
  }
  if (config.trinity_fractal_param > 0) {
    fractals.push(`Trinity fractal with parameter ${config.trinity_fractal_param.toFixed(2)}, tri-symmetric patterns`);
  }
  if (config.newton_fractal_iterations > 10) {
    fractals.push(`Newton fractal with ${config.newton_fractal_iterations} iterations, basin of attraction dynamics`);
  }

  // Quantum field description
  const quantumFieldDesc = `quantum field with ${config.quantum_field.distortion_mode} distortion (amplitude ${config.quantum_field.wave_amplitude.toFixed(2)}, frequency ${config.quantum_field.frequency.toFixed(1)}), morphing ${config.quantum_field.morphing_speed > 0.2 ? 'rapidly' : 'gently'}, rotating at ${Math.abs(config.quantum_field.rotation_velocity).toFixed(2)}`;

  const colorDesc = config.color_palette[0] === '#000000' && config.color_palette[3]?.includes('00d4')
    ? 'cyan magenta neon edges on black void'
    : 'vibrant quantum gradient';

  const symmetryDesc = config.symmetry === 1 ? '' : `, ${config.symmetry}-fold rotational symmetry`;

  const blendDesc = config.blend_mode === 'multiply' ? 'layered overlapping fractals' : `merged fractal geometries (${config.blend_mode})`;

  const prompt = `4D ${emotion} fractal composite with ${quantum_emotion} quantum field: ${fractals.join(' + ')}. ${quantumFieldDesc} in background, ${blendDesc} with ${colorDesc}, perfectly centered square t-shirt print${symmetryDesc}, ethereal luminous glow with deep mathematical precision, high contrast dark dynamic background that shifts with ${quantum_emotion} energy, ${config.scale > 0.95 ? 'large scale dominant design' : 'dynamic adaptive scaling'}, intricate self-similar organic patterns, professional merch-ready, 8k resolution, cinematic volumetric lighting, mystical quantum aesthetic`;

  return prompt;
}

/**
 * Generate negative prompt to prevent unwanted elements
 */
export function generateFractalNegativePrompt(intensity: number, emotion: string): string {
  const baseNegative = "blurry, low quality, artifacts, deformed, text, watermark, realistic photo, cartoonish, dull flat colors, poor centering, split designs, duplicated elements, disconnected patterns, multiple isolated shapes, low contrast, bright white background, solid filled areas, generic gradient, ui background, plain design";
  
  let emotionSpecific = "";
  
  if (intensity > 0.85) {
    emotionSpecific = ", oversaturated, washed out, faded colors";
  } else if (intensity < 0.3) {
    emotionSpecific = ", overly complex, chaotic, unreadable, too busy";
  }

  if (emotion.includes('void') || emotion.includes('dark')) {
    emotionSpecific += ", bright, light, washed out, visible background";
  } else if (emotion.includes('ethereal') || emotion.includes('luminous')) {
    emotionSpecific += ", dark, dim, low contrast, flat colors";
  }

  return baseNegative + emotionSpecific;
}

/**
 * Full pipeline: Promo string -> Image Generation Prompt
 */
export function promoToImagePrompt(promoText: string): {
  prompt: string;
  negative_prompt: string;
  config: FractalPromptParsed;
} {
  const parsed = parsePromptTo4DFractal(promoText);
  const prompt = fractalConfigToPrompt(parsed.config, parsed.emotion, parsed.quantum_emotion);
  const negative_prompt = generateFractalNegativePrompt(parsed.intensity, parsed.emotion);

  return {
    prompt,
    negative_prompt,
    config: parsed
  };
}

/**
 * Generate canvas instructions for visualization
 */
export function generateCanvasPrompt(config: FractalConfig, width: number = 512, height: number = 512): string {
  const quantumField = config.quantum_field;
  return `Canvas ${width}x${height}: Apply ${config.symmetry}-fold symmetry with ${config.blend_mode} blend. Layer fractals at rotation ${(config.rotation * 180 / Math.PI).toFixed(1)}°, scale ${(config.scale * 100).toFixed(0)}%. Quantum field: ${quantumField.distortion_mode} with amplitude ${quantumField.wave_amplitude.toFixed(2)}, frequency ${quantumField.frequency.toFixed(1)}, morphing speed ${quantumField.morphing_speed.toFixed(2)}, rotation velocity ${quantumField.rotation_velocity.toFixed(2)}`;
}

/**
 * Get emotion-based quantum field visualization metadata
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
