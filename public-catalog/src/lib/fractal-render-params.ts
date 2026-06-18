/**
 * Fractal Render Parameters - Direct API Parameters for Fusion Render Service
 * These are ACTUAL parameters that change HOW the fractal is rendered, not just text descriptions
 */

export interface FractalRenderParams extends Record<string, unknown> {
  // Sierpinski Parameters
  sierpinski_depth?: number;
  sierpinski_rotation?: number;

  // Koch Parameters
  koch_iterations?: number;
  koch_angle?: number;
  koch_length_ratio?: number;

  // Vicsek Parameters
  vicsek_scale?: number;
  vicsek_iterations?: number;

  // Mandelbrot Parameters
  mandelbrot_zoom?: number;
  mandelbrot_pan_x?: number;
  mandelbrot_pan_y?: number;
  mandelbrot_max_iterations?: number;

  // Julia Parameters
  julia_c_real?: number;
  julia_c_imag?: number;
  julia_zoom?: number;
  julia_iterations?: number;

  // Burning Ship Parameters
  burning_ship_iterations?: number;
  burning_ship_bailout?: number;

  // Trinity Parameters
  trinity_param?: number;
  trinity_iterations?: number;

  // Lyapunov Parameters
  lyapunov_r_range_min?: number;
  lyapunov_r_range_max?: number;

  // Newton Parameters
  newton_iterations?: number;
  newton_polynomial?: string; // z^3-1, z^4-1, etc.

  // Rendering Parameters
  blend_mode?: 'add' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light';
  output_width?: number;
  output_height?: number;
  color_seed?: number;
  background_color?: string;

  // Quantum Field Parameters
  quantum_waves?: number;
  quantum_frequency?: number;
  quantum_amplitude?: number;
  quantum_phase_offset?: number;

  // Multi-Fractal Blending
  fractal_layers?: Array<{
    fractal_type: 'sierpinski' | 'koch' | 'vicsek' | 'mandelbrot' | 'julia' | 'burning_ship' | 'trinity' | 'lyapunov' | 'newton';
    opacity?: number;
    offset_x?: number;
    offset_y?: number;
    scale?: number;
    params?: Record<string, number | string>;
  }>;
}

/**
 * Generate diverse render parameters for each fractal type
 */
export function generateFractalRenderParams(
  fractals: string[],
  complexity: number,
  intensity: number,
  seed: number = Math.random() * 10000
): FractalRenderParams {
  const params: FractalRenderParams = {
    output_width: 1024,
    output_height: 1024,
    color_seed: Math.floor(seed),
    blend_mode: 'overlay',
    quantum_waves: 3 + complexity * 5,
    quantum_frequency: 2 + complexity * 8,
    quantum_amplitude: 0.2 + intensity * 0.6,
    quantum_phase_offset: Math.random() * Math.PI * 2,
  };

  // Generate layers for each selected fractal
  params.fractal_layers = fractals.map((fractal, index) => {
    const layerSeed = seed + index * 1000;
    const layerParams: Record<string, number | string> = {};

    switch (fractal) {
      case 'sierpinski':
        params.sierpinski_depth = Math.round(5 + complexity * 10);
        params.sierpinski_rotation = (layerSeed % 360);
        layerParams.depth = params.sierpinski_depth;
        layerParams.rotation = params.sierpinski_rotation;
        break;

      case 'koch':
        params.koch_iterations = Math.round(3 + complexity * 6);
        params.koch_angle = 60 + (layerSeed % 30);
        params.koch_length_ratio = 0.3 + (intensity * 0.2);
        layerParams.iterations = params.koch_iterations;
        layerParams.angle = params.koch_angle;
        layerParams.length_ratio = params.koch_length_ratio;
        break;

      case 'vicsek':
        params.vicsek_scale = 1 - (0.3 * complexity);
        params.vicsek_iterations = Math.round(2 + complexity * 5);
        layerParams.scale = params.vicsek_scale;
        layerParams.iterations = params.vicsek_iterations;
        break;

      case 'mandelbrot':
        params.mandelbrot_zoom = Math.pow(2, 2 + complexity * 10);
        params.mandelbrot_pan_x = -0.5 + ((layerSeed % 1000) / 1000) * 0.5;
        params.mandelbrot_pan_y = ((layerSeed % 500) / 500) * 0.5;
        params.mandelbrot_max_iterations = Math.round(80 + complexity * 250);
        layerParams.zoom = params.mandelbrot_zoom;
        layerParams.pan_x = params.mandelbrot_pan_x;
        layerParams.pan_y = params.mandelbrot_pan_y;
        layerParams.max_iterations = params.mandelbrot_max_iterations;
        break;

      case 'julia':
        // Different Julia sets based on seed
        params.julia_c_real = -0.7269 + ((layerSeed % 1000) / 1000) * 0.3;
        params.julia_c_imag = 0.1889 + ((layerSeed % 500) / 500) * 0.3;
        params.julia_zoom = 1 + intensity * 0.5;
        params.julia_iterations = Math.round(80 + complexity * 200);
        layerParams.c_real = params.julia_c_real;
        layerParams.c_imag = params.julia_c_imag;
        layerParams.zoom = params.julia_zoom;
        layerParams.iterations = params.julia_iterations;
        break;

      case 'burning_ship':
        params.burning_ship_iterations = Math.round(60 + complexity * 200);
        params.burning_ship_bailout = 2 + intensity * 2;
        layerParams.iterations = params.burning_ship_iterations;
        layerParams.bailout = params.burning_ship_bailout;
        break;

      case 'trinity':
        params.trinity_param = 0.85 + ((layerSeed % 100) / 100) * 0.1;
        params.trinity_iterations = Math.round(40 + complexity * 80);
        layerParams.param = params.trinity_param;
        layerParams.iterations = params.trinity_iterations;
        break;

      case 'lyapunov':
        params.lyapunov_r_range_min = 2.5 + ((layerSeed % 100) / 100);
        params.lyapunov_r_range_max = 4.0 + ((layerSeed % 100) / 100);
        layerParams.r_range_min = params.lyapunov_r_range_min;
        layerParams.r_range_max = params.lyapunov_r_range_max;
        break;

      case 'newton':
        params.newton_iterations = 20 + Math.round(complexity * 10);
        // Vary polynomial based on intensity
        const polynomials = ['z^3-1', 'z^4-1', 'z^5-1', 'z^3+1'];
        params.newton_polynomial = polynomials[Math.floor((layerSeed % 1000) / 250)];
        layerParams.iterations = params.newton_iterations;
        layerParams.polynomial = params.newton_polynomial;
        break;
    }

    return {
      fractal_type: fractal as 'sierpinski' | 'koch' | 'vicsek' | 'mandelbrot' | 'julia' | 'burning_ship' | 'trinity' | 'lyapunov' | 'newton',
      opacity: 0.7 + ((index / fractals.length) * 0.3),
      offset_x: (index * 0.1) * (Math.random() > 0.5 ? 1 : -1),
      offset_y: (index * 0.15) * (Math.random() > 0.5 ? 1 : -1),
      scale: 1 - (index * 0.05),
      params: layerParams,
    };
  });

  return params;
}

/**
 * Format render parameters for Fusion API call
 */
export function formatFusionRenderRequest(
  prompt: string,
  negative_prompt: string,
  fractals: string[],
  complexity: number,
  intensity: number,
  width: number = 1024,
  height: number = 1024
): {
  prompt: string;
  negative_prompt: string;
  render_params: FractalRenderParams;
  fractal_types: string[];
  metadata: Record<string, unknown>;
} {
  const renderParams = generateFractalRenderParams(fractals, complexity, intensity);
  renderParams.output_width = width;
  renderParams.output_height = height;

  return {
    prompt,
    negative_prompt,
    render_params: renderParams,
    fractal_types: fractals,
    metadata: {
      fractal_count: fractals.length,
      complexity_level: complexity,
      intensity_level: intensity,
      blending: 'multi-layer-overlay',
      generated_at: new Date().toISOString(),
    },
  };
}

/**
 * Convert render params to query string for REST API
 */
export function renderParamsToQueryString(params: FractalRenderParams): string {
  const queryParts: string[] = [];

  // Simple params
  if (params.sierpinski_depth) queryParts.push(`sierpinski_depth=${params.sierpinski_depth}`);
  if (params.koch_iterations) queryParts.push(`koch_iterations=${params.koch_iterations}`);
  if (params.vicsek_scale) queryParts.push(`vicsek_scale=${params.vicsek_scale?.toFixed(2)}`);
  if (params.mandelbrot_zoom) queryParts.push(`mandelbrot_zoom=${params.mandelbrot_zoom?.toFixed(2)}`);
  if (params.julia_c_real) queryParts.push(`julia_c_real=${params.julia_c_real?.toFixed(4)}`);
  if (params.julia_c_imag) queryParts.push(`julia_c_imag=${params.julia_c_imag?.toFixed(4)}`);
  if (params.output_width) queryParts.push(`width=${params.output_width}`);
  if (params.output_height) queryParts.push(`height=${params.output_height}`);
  if (params.color_seed) queryParts.push(`seed=${params.color_seed}`);
  if (params.blend_mode) queryParts.push(`blend_mode=${params.blend_mode}`);

  // Fractal layers as JSON
  if (params.fractal_layers && params.fractal_layers.length > 0) {
    queryParts.push(`layers=${encodeURIComponent(JSON.stringify(params.fractal_layers))}`);
  }

  return queryParts.join('&');
}

/**
 * Generate unique seed for each request to ensure different outputs
 */
export function generateUniqueSeed(): number {
  return Math.floor(Math.random() * 999999);
}
