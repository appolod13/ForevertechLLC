// public-catalog/src/lib/fractal-generator.ts
// Stub for fractal prompt enhancement - matches your current API style

export function promoToImagePrompt(basePrompt: string): string {
  return `${basePrompt}, vibrant quantum nebula fractal mandala, intricate self-similar organic patterns with glowing electric cyan magenta violet neon edges, deep cosmic void background, symmetrical centered t-shirt design, professional merch ready`;
}

export function getQuantumFieldMetadata(prompt: string) {
  return {
    style: "quantum-nebula",
    voids: "high",
    colors: "cyan magenta violet",
    complexity: "medium",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Fractal Generator Integration - Helper Utilities
 * Usage examples and client-side integration for FusionAI component
 */

/**
 * Example 1: Simple promo-based generation
 * User types: "quantum void sierpinski"
 */
export async function generateFromPromo(promo: string) {
  const response = await fetch("/api/generate/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: promo,
      width: 512,
      height: 512,
      use_fractal_fusion: true, // Enable 4D fractal processing
    }),
  });

  if (!response.ok) throw new Error(`Generation failed: ${response.statusText}`);
  return response.json();
}

/**
 * Example 2: Preview recommendations before generation
 * Shows what fractals/emotions will be used
 */
export async function previewFractalRecommendations(promo: string) {
  const response = await fetch(`/api/generate/image?promo=${encodeURIComponent(promo)}`);
  if (!response.ok) throw new Error("Preview failed");
  return response.json();
}

/**
 * Example 3: Advanced generation with custom parameters
 */
export async function generateAdvanced(options: {
  promo: string;
  width?: number;
  height?: number;
  use_fractal_fusion?: boolean;
  quantum_mode?: boolean;
  ipfs_upload?: boolean;
  seed_salt?: string;
}) {
  const response = await fetch("/api/generate/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: options.promo,
      width: options.width || 512,
      height: options.height || 512,
      use_fractal_fusion: options.use_fractal_fusion !== false,
      quantum_mode: options.quantum_mode || false,
      ipfs_upload: options.ipfs_upload || false,
      seed_salt: options.seed_salt,
    }),
  });

  if (!response.ok) throw new Error("Generation failed");
  return response.json();
}

/**
 * Example 4: Batch generation with different emotions
 */
export async function generateMultipleEmotions(basePromo: string, emotions: string[]) {
  const results = await Promise.all(
    emotions.map((emotion) =>
      generateFromPromo(`${basePromo} ${emotion}`).catch((err) => ({
        error: err.message,
        emotion,
      })),
    ),
  );
  return results;
}

/**
 * Recommended promo templates for best results
 */
export const PROMO_TEMPLATES = {
  minimal: "quantum fractal",
  detailed: "ultra-detailed quantum void sierpinski with ethereal quantum field",
  intense: "intense explosive burning ship with chaotic quantum energy",
  calm: "peaceful serene ethereal mandala with flowing quantum field",
  cosmic: "cosmic nebula julia set with luminous crystalline quantum field",
  geometric: "geometric mathematical koch snowflake with harmonic quantum field",
  organic: "organic flowing vicsek with pulsing quantum field",
  dark: "dark void trinity fractal with mysterious quantum field",
  neon: "neon electric acidic lyapunov with chaotic quantum field",
};

/**
 * Client-side integration example for React component
 */
export function useFractalGenerator() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [image, setImage] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState<Record<string, unknown> | null>(null);

  const generate = async (promo: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateFromPromo(promo);
      if (result.image_url) {
        setImage(result.image_url);
        setMeta(result.meta);
      } else {
        throw new Error("No image URL in response");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const preview = async (promo: string) => {
    try {
      return await previewFractalRecommendations(promo);
    } catch (err) {
      console.error("Preview failed:", err);
      return null;
    }
  };

  return { generate, preview, loading, error, image, meta };
}

/**
 * Emotion keywords reference
 */
export const EMOTION_KEYWORDS_REFERENCE = {
  calm: ["peaceful", "serene", "tranquil", "meditative"],
  intense: ["intense", "vivid", "explosive", "chaotic"],
  dark: ["void", "dark", "ominous", "shadow", "abyss"],
  cosmic: ["quantum", "cosmic", "ethereal", "luminous", "radiant", "nebula"],
  organic: ["organic", "flowing", "fractured", "crystalline"],
  emotional: ["angry", "melancholic", "joyful", "dreamlike", "mysterious"],
  textural: ["smooth", "rough", "sharp", "electric"],
  mathematical: ["geometric", "mathematical", "algorithmic", "recursive"],
};

/**
 * Fractal type reference
 */
export const FRACTAL_TYPES = {
  sierpinski: {
    description: "Recursive triangular patterns",
    best_for: "geometric, symmetrical designs",
  },
  koch: {
    description: "Intricate branching snowflake patterns",
    best_for: "organic, detailed designs",
  },
  vicsek: {
    description: "Cross-shaped self-similar scaling",
    best_for: "balanced, centered compositions",
  },
  mandelbrot: {
    description: "Classic infinite boundary complexity",
    best_for: "infinite detail, mathematical beauty",
  },
  julia: {
    description: "Organic flowing patterns from complex functions",
    best_for: "fluid, dynamic designs",
  },
  burning_ship: {
    description: "Fire-like recursive structures",
    best_for: "intense, energetic designs",
  },
  trinity: {
    description: "Three-fold symmetric patterns",
    best_for: "balanced, sacred geometry",
  },
  lyapunov: {
    description: "Chaos theory visualization",
    best_for: "complex, dynamic patterns",
  },
  newton: {
    description: "Basin of attraction dynamics",
    best_for: "intricate boundary details",
  },
};

/**
 * Color palette reference
 */
export const COLOR_TEMPERATURES = {
  cool: "Cyan, blue, and cool neon",
  warm: "Magenta, red, and warm fire",
  balanced: "Mix of cyan and magenta on black",
  neon: "Electric bright neon colors",
  cosmic: "Space-inspired purples and cyans",
  void: "Deep blacks with minimal neon",
  ethereal: "Mystical purples and cyans",
  acidic: "Nuclear green and yellow",
};

/**
 * Quantum field distortion modes
 */
export const QUANTUM_DISTORTION_MODES = {
  ripple: "Wave-like concentric distortion",
  turbulence: "Chaotic turbulent flows",
  vortex: "Spinning spiral vortex",
  spiral: "Rotating spiral patterns",
  wave: "Smooth wave propagation",
  chaos: "Chaotic dynamic morphing",
  crystalline: "Sharp crystalline formations",
};

/**
 * Full promo composition guide
 */
export const PROMO_COMPOSITION_GUIDE = `
# 4D Fractal Promo Composition Guide

## Formula:
[emotion] [fractal_type] [quantum_emotion] [optional_modifiers]

## Examples:

1. Basic (Recommended for quick results):
   - "quantum sierpinski"
   - "cosmic julia"
   - "ethereal koch"

2. Intermediate:
   - "intense explosive burning ship with chaotic quantum field"
   - "peaceful serene mandala with flowing quantum field"
   - "dark void trinity with mysterious quantum field"

3. Advanced (Maximum variety):
   - "ultra-detailed quantum void sierpinski with ethereal recursive quantum field and crystalline distortion"
   - "intense chaotic burning ship with electric neon edges and turbulent quantum morphing"

## What happens in the backend:

1. Promo is parsed for keywords
2. Fractal type is detected (default: hybrid)
3. Emotion determines color palette and quantum field
4. Intensity/complexity are calculated from keywords
5. Quantum field gets distortion mode and animation speed
6. Everything is merged into a 4D configuration
7. Optimized image generation parameters are recommended
8. API sends everything to the AI image generator

## Pro Tips:

- Emotions are case-insensitive
- Multiple emotion keywords can be used
- Longer promos = more specific results
- Quantum emotions control distortion: flowing, spiraling, pulsing, crystalline, chaotic, harmonic
- Color temperatures: cool, warm, balanced, neon, cosmic, void, ethereal, acidic
`;

/**
 * Debug utility: Log what will be generated
 */
export async function debugPromo(promo: string) {
  const preview = await previewFractalRecommendations(promo);
  console.log("=== Fractal Generation Preview ===");
  console.log("Input Promo:", promo);
  console.log("Recommendations:", preview?.recommendations);
  return preview?.recommendations;
}
