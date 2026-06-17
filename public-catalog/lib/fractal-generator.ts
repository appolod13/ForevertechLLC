/**
 * 4D Fractal Generator - Merges Multiple Fractal Geometries
 * Combines: Sierpinski Triangle, Koch Snowflake, Vicsek Fractal, Mandelbrot-Julia Set
 * Converts text prompts into multi-dimensional fractal design parameters
 */

export interface FractalConfig {
  sierpinski_depth: number;
  koch_iterations: number;
  vicsek_scale: number;
  mandelbrot_zoom: number;
  mandelbrot_iterations: number;
  julia_constant_real: number;
  julia_constant_imag: number;
  blend_mode: 'multiply' | 'screen' | 'overlay' | 'soft-light';
  color_palette: string[];
  symmetry: number;
  rotation: number;
  scale: number;
}

export interface FractalPromptParsed {
  primary_fractal: 'sierpinski' | 'koch' | 'vicsek' | 'mandelbrot' | 'julia' | 'hybrid';
  intensity: number; // 0-1
  complexity: number; // 0-1
  color_temperature: 'cool' | 'warm' | 'balanced';
  emotion: string;
  config: FractalConfig;
}

/**
 * Parse natural language promo string into 4D fractal configuration
 * Example: "quantum void sierpinski with neon edges" -> FractalPromptParsed
 */
export function parsePromptTo4DFractal(prompt: string): FractalPromptParsed {
  const normalized = prompt.toLowerCase();
  
  // Detect primary fractal type
  let primary_fractal: 'sierpinski' | 'koch' | 'vicsek' | 'mandelbrot' | 'julia' | 'hybrid' = 'hybrid';
  if (normalized.includes('sierpinski') || normalized.includes('triangle')) {
    primary_fractal = 'sierpinski';
  } else if (normalized.includes('koch') || normalized.includes('snowflake')) {
    primary_fractal = 'koch';
  } else if (normalized.includes('vicsek')) {
    primary_fractal = 'vicsek';
  } else if (normalized.includes('mandelbrot')) {
    primary_fractal = 'mandelbrot';
  } else if (normalized.includes('julia')) {
    primary_fractal = 'julia';
  }

  // Detect intensity keywords
  const intensityKeywords = {
    'soft': 0.3, 'gentle': 0.3, 'subtle': 0.3,
    'medium': 0.6, 'moderate': 0.6, 'balanced': 0.6,
    'intense': 0.9, 'vivid': 0.9, 'explosive': 1.0, 'extreme': 1.0
  };
  let intensity = 0.7;
  for (const [keyword, value] of Object.entries(intensityKeywords)) {
    if (normalized.includes(keyword)) {
      intensity = value;
      break;
    }
  }

  // Detect complexity/depth
  const complexityKeywords = {
    'simple': 0.2, 'basic': 0.2,
    'detailed': 0.6, 'intricate': 0.6,
    'ultra-detailed': 0.95, 'infinite': 1.0, 'complex': 0.8
  };
  let complexity = 0.65;
  for (const [keyword, value] of Object.entries(complexityKeywords)) {
    if (normalized.includes(keyword)) {
      complexity = value;
      break;
    }
  }

  // Detect color temperature
  let color_temperature: 'cool' | 'warm' | 'balanced' = 'balanced';
  if (normalized.includes('cool') || normalized.includes('cyan') || normalized.includes('blue') || normalized.includes('void')) {
    color_temperature = 'cool';
  } else if (normalized.includes('warm') || normalized.includes('magenta') || normalized.includes('red') || normalized.includes('fire')) {
    color_temperature = 'warm';
  }

  // Extract emotion
  const emotionKeywords = ['quantum', 'cosmic', 'void', 'neon', 'mystical', 'ethereal', 'dark', 'luminous', 'geometric', 'mathematical'];
  const emotion = emotionKeywords.find(kw => normalized.includes(kw)) || 'quantum';

  // Generate 4D configuration
  const config = generateFractalConfig(primary_fractal, intensity, complexity, color_temperature);

  return {
    primary_fractal,
    intensity,
    complexity,
    color_temperature,
    emotion,
    config
  };
}

/**
 * Generate fractal configuration from parsed parameters
 */
function generateFractalConfig(
  fractal_type: string,
  intensity: number,
  complexity: number,
  color_temperature: 'cool' | 'warm' | 'balanced'
): FractalConfig {
  // Base configurations for each fractal type
  const baseConfigs: Record<string, Partial<FractalConfig>> = {
    sierpinski: {
      sierpinski_depth: Math.round(5 + complexity * 8),
      koch_iterations: 2,
      vicsek_scale: 0.3,
      mandelbrot_iterations: 20,
      symmetry: 3, // triangular symmetry
      blend_mode: 'overlay'
    },
    koch: {
      sierpinski_depth: 2,
      koch_iterations: Math.round(3 + complexity * 5),
      vicsek_scale: 0.5,
      mandelbrot_iterations: 15,
      symmetry: 6, // hexagonal symmetry
      blend_mode: 'screen'
    },
    vicsek: {
      sierpinski_depth: 3,
      koch_iterations: 2,
      vicsek_scale: 1 - (0.3 * complexity),
      mandelbrot_iterations: 25,
      symmetry: 5, // pentagonal
      blend_mode: 'multiply'
    },
    mandelbrot: {
      sierpinski_depth: 3,
      koch_iterations: 2,
      vicsek_scale: 0.4,
      mandelbrot_zoom: Math.pow(2, 2 + complexity * 8),
      mandelbrot_iterations: Math.round(50 + complexity * 200),
      symmetry: 1,
      blend_mode: 'soft-light'
    },
    julia: {
      sierpinski_depth: 2,
      koch_iterations: 1,
      vicsek_scale: 0.5,
      mandelbrot_zoom: Math.pow(2, 1 + complexity * 6),
      mandelbrot_iterations: Math.round(60 + complexity * 190),
      julia_constant_real: -0.7269 + (intensity * 0.1),
      julia_constant_imag: 0.1889 + (intensity * 0.1),
      symmetry: 1,
      blend_mode: 'overlay'
    },
    hybrid: {
      sierpinski_depth: Math.round(3 + complexity * 5),
      koch_iterations: Math.round(2 + complexity * 3),
      vicsek_scale: 0.4 + (intensity * 0.3),
      mandelbrot_zoom: Math.pow(2, 1 + complexity * 5),
      mandelbrot_iterations: Math.round(40 + complexity * 150),
      julia_constant_real: -0.7 + (intensity * 0.15),
      julia_constant_imag: 0.15 + (intensity * 0.15),
      symmetry: 4,
      blend_mode: 'overlay'
    }
  };

  const baseConfig = baseConfigs[fractal_type] || baseConfigs.hybrid;

  // Color palettes based on temperature
  const palettes: Record<string, string[]> = {
    cool: ['#000000', '#0a1a3a', '#1a4d7a', '#00d4ff', '#00ffff', '#00d4ff', '#0a1a3a'],
    warm: ['#000000', '#2a0a0a', '#7a1a1a', '#ff00ff', '#ff0080', '#ff00ff', '#2a0a0a'],
    balanced: ['#000000', '#1a1a3a', '#3a3a7a', '#00d4ff', '#ff00ff', '#ff00ff', '#1a1a3a']
  };

  return {
    sierpinski_depth: baseConfig.sierpinski_depth || 5,
    koch_iterations: baseConfig.koch_iterations || 2,
    vicsek_scale: baseConfig.vicsek_scale || 0.4,
    mandelbrot_zoom: baseConfig.mandelbrot_zoom || 1,
    mandelbrot_iterations: baseConfig.mandelbrot_iterations || 50,
    julia_constant_real: baseConfig.julia_constant_real || -0.7269,
    julia_constant_imag: baseConfig.julia_constant_imag || 0.1889,
    blend_mode: baseConfig.blend_mode || 'overlay',
    color_palette: palettes[color_temperature],
    symmetry: baseConfig.symmetry || 1,
    rotation: Math.random() * Math.PI * 2,
    scale: 0.9 + (intensity * 0.1)
  };
}

/**
 * Convert FractalConfig to optimized prompt for image generation
 * This is the string that goes to the AI image generator
 */
export function fractalConfigToPrompt(config: FractalConfig, emotion: string): string {
  const fractals: string[] = [];

  // Build fractal descriptions
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

  const colorDesc = config.color_palette[0] === '#000000' && config.color_palette[3]?.includes('00d4') 
    ? 'cyan magenta neon edges on black void'
    : 'vibrant quantum gradient';

  const symmetryDesc = config.symmetry === 1 ? '' : `, ${config.symmetry}-fold rotational symmetry`;

  const blendDesc = config.blend_mode === 'multiply' ? 'layered overlapping fractals' : 'merged fractal geometries';

  const prompt = `4D ${emotion} fractal composite: ${fractals.join(', or ')}. ${blendDesc} with ${colorDesc}, perfectly centered square t-shirt print${symmetryDesc}, ethereal luminous glow with deep mathematical precision, high contrast dark void background, ${config.scale > 0.95 ? 'large scale' : 'dynamic scaling'}, intricate self-similar organic patterns, professional merch-ready design, 8k resolution, cinematic volumetric lighting, mystical quantum aesthetic`;

  return prompt;
}

/**
 * Generate negative prompt to prevent unwanted elements
 */
export function generateFractalNegativePrompt(intensity: number): string {
  const baseNegative = "blurry, low quality, artifacts, deformed, text, watermark, realistic photo, cartoonish, dull flat colors, poor centering, split designs, duplicated elements, disconnected patterns, multiple isolated shapes, low contrast, bright white background, solid filled areas, generic gradient, ui background, plain design";
  
  if (intensity > 0.8) {
    return baseNegative + ", oversaturated, washed out, faded, dim, underexposed";
  } else if (intensity < 0.4) {
    return baseNegative + ", overly complex, chaotic, unreadable, too detailed";
  }
  
  return baseNegative;
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
  const prompt = fractalConfigToPrompt(parsed.config, parsed.emotion);
  const negative_prompt = generateFractalNegativePrompt(parsed.intensity);

  return {
    prompt,
    negative_prompt,
    config: parsed
  };
}

/**
 * Generate HTML Canvas visualization of fractal configuration
 * Useful for previewing before sending to AI generator
 */
export function generateCanvasPrompt(config: FractalConfig, width: number = 512, height: number = 512): string {
  // This returns canvas instructions as a string that could be used for SVG or canvas rendering
  return `Canvas ${width}x${height}: Apply ${config.symmetry}-fold rotational symmetry with ${config.blend_mode} blend. Layer fractals at rotation ${(config.rotation * 180 / Math.PI).toFixed(1)}°, scale ${(config.scale * 100).toFixed(0)}%`;
}
