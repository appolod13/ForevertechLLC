/**
 * Fractal Fusion Integration - Enhanced 4D Multi-Fractal Generator
 * Integrates Sierpinski, Koch, Vicsek, Mandelbrot, Julia, Burning Ship, Trinity, Lyapunov, Newton
 * With Quantum Field Dynamics and Emotion-Based Prompt Processing
 */

import { promoToImagePrompt, getQuantumFieldMetadata } from "@/lib/fractal-generator";

export interface FractalFusionRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  use_fractal_fusion?: boolean;
  quantum_emotion?: string;
}

export interface FractalFusionResponse {
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  fractal_config: Record<string, unknown>;
  quantum_metadata: Record<string, unknown>;
}

/**
 * Process promo string through fractal-fusion pipeline
 * Converts one-line promo text into full multi-fractal configuration
 */
export function processFractalPromo(request: FractalFusionRequest): FractalFusionResponse {
  if (!request.use_fractal_fusion) {
    return {
      prompt: request.prompt,
      negative_prompt: request.negative_prompt || "",
      width: request.width || 512,
      height: request.height || 512,
      fractal_config: {},
      quantum_metadata: {},
    };
  }

  // Convert promo string to full 4D fractal configuration
  const { prompt, negative_prompt, config } = promoToImagePrompt(request.prompt);

  // Get quantum field metadata for visualization/debugging
  const quantum_metadata = getQuantumFieldMetadata(config.emotion);

  return {
    prompt,
    negative_prompt,
    width: request.width || 512,
    height: request.height || 512,
    fractal_config: {
      primary_fractal: config.primary_fractal,
      intensity: config.intensity,
      complexity: config.complexity,
      color_temperature: config.color_temperature,
      emotion: config.emotion,
      quantum_emotion: config.quantum_emotion,
      config: config.config,
    },
    quantum_metadata,
  };
}

/**
 * Recommend optimal settings based on promo content
 */
export function recommendFractalSettings(promoText: string): {
  steps: number;
  guidance_scale: number;
  seed: number | null;
  timeout_multiplier: number;
} {
  const normalized = promoText.toLowerCase();
  const hasComplex = normalized.includes("ultra") || normalized.includes("infinite") || normalized.includes("detailed");
  const hasQuantum = normalized.includes("quantum") || normalized.includes("void") || normalized.includes("ethereal");
  const hasIntense = normalized.includes("intense") || normalized.includes("explosive") || normalized.includes("extreme");
  const isUrgent = normalized.includes("fast") || normalized.includes("quick");

  return {
    steps: hasComplex ? 250 : hasQuantum ? 200 : 150,
    guidance_scale: hasIntense ? 5.5 : hasQuantum ? 4.5 : 3.5,
    seed: hasQuantum ? null : -1, // Use random seed for quantum, fixed for others
    timeout_multiplier: isUrgent ? 0.8 : hasComplex ? 1.5 : 1.0,
  };
}

/**
 * Fusion generator that chains fractal processing with AI image generation
 */
export async function fusionGenerateImage(
  request: FractalFusionRequest,
  generatorFn: (prompt: string, negative_prompt: string, width: number, height: number, params?: Record<string, unknown>) => Promise<{ success: boolean; image_url?: string; error?: string }>,
): Promise<{ success: boolean; image_url?: string; meta?: Record<string, unknown>; error?: string }> {
  try {
    // Process through fractal fusion pipeline
    const fusion = processFractalPromo(request);
    const settings = recommendFractalSettings(request.prompt);

    // Call the actual image generator with optimized parameters
    const result = await generatorFn(
      fusion.prompt,
      fusion.negative_prompt,
      fusion.width,
      fusion.height,
      {
        steps: settings.steps,
        guidance_scale: settings.guidance_scale,
        seed: settings.seed,
      },
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || "generation_failed",
      };
    }

    return {
      success: true,
      image_url: result.image_url,
      meta: {
        provider: "fractal_fusion",
        ...fusion.fractal_config,
        quantum_metadata: fusion.quantum_metadata,
        settings,
      },
    };
  } catch (e) {
    console.error("Fractal Fusion Error", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "unknown_error",
    };
  }
}

/**
 * Parse promo for quick recommendations without full generation
 * Useful for UI previews and promo validation
 */
export function previewPromoRecommendations(promoText: string) {
  const { config } = promoToImagePrompt(promoText);
  const settings = recommendFractalSettings(promoText);
  const metadata = getQuantumFieldMetadata(config.emotion);

  return {
    fractal_type: config.primary_fractal,
    emotion: config.emotion,
    quantum_emotion: config.quantum_emotion,
    intensity: config.intensity,
    complexity: config.complexity,
    color_palette: config.config.color_palette,
    recommended_settings: settings,
    quantum_field: {
      distortion_mode: config.config.quantum_field.distortion_mode,
      morphing_speed: config.config.quantum_field.morphing_speed,
      rotation_velocity: config.config.quantum_field.rotation_velocity,
    },
    metadata,
  };
}
