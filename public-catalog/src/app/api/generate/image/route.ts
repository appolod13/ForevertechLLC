import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";

// Serverless limits
export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { logError } from "@/lib/api/logger";
import { generateImageForPlatform } from "@/lib/contentFactory/image";
import { uploadToIpfs } from "@/lib/ipfs/upload";
import { getAiGeneratorsConfig } from "@/lib/aiGeneratorsConfig";
import { previewPromoRecommendations } from "./fractal-fusion";
import { getQuantumSeed } from "@/lib/quantum-seed";
import { calculateFractalDimension } from "@/lib/fractal-dimension";
import { paletteProfileFromPrompt } from "@/lib/paletteProfile";
import { buildNarrativeRenderSettings, type NarrativeRenderSettings } from "@/lib/narrativeRenderSettings";

// === HELPERS ===
function isLocalHostUrl(value: string): boolean {
  try {
    const u = new URL(value);
    const h = u.hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  } catch {
    return false;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

type Platform = "linkedin" | "instagram" | "twitter";
type Provider = "mock" | "dalle" | "stablediffusion" | "midjourney";
type GenerationResult = Record<string, unknown> & { image_url?: string; meta?: Record<string, unknown> };

function asPlatform(v: unknown): Platform {
  return v === "instagram" ? "instagram" : v === "twitter" ? "twitter" : "linkedin";
}

function asProvider(v: unknown): Provider {
  return v === "dalle" || v === "stablediffusion" || v === "midjourney" ? v : "mock";
}

function generateSeed(): number {
  return randomInt(0, 0x7fffffff);
}

// === QUANTUM HYBRID GENERATOR ===
async function tryQuantumHybridGenerate(
  prompt: string,
  width: number,
  height: number,
  negative_prompt: string | undefined,
  timeoutMs: number,
  use_fractal_fusion: boolean = true,
  palette_profile?: string,
  seed?: number,
  narrativeSettings?: NarrativeRenderSettings,
) {
  const cfg = getAiGeneratorsConfig();
  const base = cfg.quantum?.internalBaseUrl?.trim().replace(/\/$/, "");
  if (!base) return null;
  if (process.env.NODE_ENV === "production" && isLocalHostUrl(base)) return null;

  const url = base + "/generate";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt,
        width,
        height,
        negative_prompt: negative_prompt || "",
        use_fractal_fusion,
        palette_profile,
        seed,
        ...narrativeSettings,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data: unknown = await res.json();

    if (isRecord(data) && data.success === true && typeof data.imageUrl === "string") {
      const raw = data.imageUrl.trim();
      const imageUrl = raw.startsWith("/images/")
        ? `/api/images/${encodeURIComponent(raw.slice(8))}`
        : raw;

      return {
        image_url: imageUrl,
        meta: isRecord(data.meta) ? data.meta : { provider: "quantum_hybrid" },
      };
    }
    return null;
  } catch (e) {
    console.error("Quantum Hybrid Error:", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function tryFusionGenerate(
  prompt: string,
  width: number,
  height: number,
  negative_prompt: string | undefined,
  timeoutMs: number,
  palette_profile: string,
  seed: number,
  narrativeSettings: NarrativeRenderSettings,
) {
  const cfg = getAiGeneratorsConfig();
  const base = cfg.fusion?.internalBaseUrl?.trim().replace(/\/$/, "");
  if (!base) return null;
  if (process.env.NODE_ENV === "production" && isLocalHostUrl(base)) return null;

  const url = base + "/generate";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));

  try {
    const basePayload = {
      prompt,
      width,
      height,
      negative_prompt: negative_prompt || "",
      seed,
      palette_profile,
      quality: 2,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...basePayload,
        ...narrativeSettings,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    let finalRes = res;
    if (!finalRes.ok && (finalRes.status === 400 || finalRes.status === 422)) {
      finalRes = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(basePayload),
        cache: "no-store",
        signal: controller.signal,
      });
    }

    if (!finalRes.ok) return null;

    const data: unknown = await finalRes.json();

    if (isRecord(data) && data.success === true && typeof data.imageUrl === "string") {
      const raw = data.imageUrl.trim();
      const imageUrl = raw.startsWith("/")
        ? `/api/fusion-image?path=${encodeURIComponent(raw)}`
        : raw;

      return {
        image_url: imageUrl,
        meta: isRecord(data.meta) ? data.meta : { provider: "fusion" },
      };
    }
    return null;
  } catch (e) {
    console.error("Fusion Generate Error:", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// === MAIN POST HANDLER ===
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
    }

    const prompt: string = body.prompt;
    const width: number = body.width || 1024;
    const height: number = body.height || 1024;
    const negative_prompt: string | undefined = body.negative_prompt;
    const use_fractal_fusion: boolean = body.use_fractal_fusion !== false;
    const useQuantumSeed: boolean = body.use_quantum_seed === true;
    const orderId: string = body.orderId || `gen_${Date.now()}`;
    const platform = asPlatform(body.platform);
    const provider = typeof body.provider === "string" ? body.provider.trim() : "";
    const fallbackProvider = asProvider(provider);
    const derivedPalette = paletteProfileFromPrompt(prompt);
    const palette_profile = derivedPalette === "quantum" ? "magma" : derivedPalette;
    const seed: number = typeof body.seed === "number" ? body.seed : generateSeed();
    const narrativeSettings = buildNarrativeRenderSettings({
      prompt,
      seed,
      paletteProfile: palette_profile,
    });

    let result: GenerationResult | null = null;

    if (provider === "mock") {
      const mock = await generateImageForPlatform("mock", prompt, platform);
      return NextResponse.json({ success: true, ...mock });
    }

    // 1. Try Fusion (Multi-Fractal Wormhole)
    try {
      result = await tryFusionGenerate(
        prompt,
        width,
        height,
        negative_prompt,
        45000,
        palette_profile,
        seed,
        narrativeSettings,
      );
    } catch (quantumErr) {
      logError("quantum.hybrid.failed", quantumErr);
    }

    // 2. Try Quantum Hybrid
    if (!result) {
      try {
        result = await tryQuantumHybridGenerate(
          prompt,
          width,
          height,
          negative_prompt,
          45000,
          use_fractal_fusion,
          palette_profile,
          seed,
          narrativeSettings,
        );
      } catch (fallbackErr) {
        logError("fallback.generate.failed", fallbackErr);
      }
    }

    // 3. Fallback (final type fix)
    if (!result) {
      try {
        result = await generateImageForPlatform(fallbackProvider, prompt, platform);
      } catch (fallbackErr) {
        logError("fallback.generate.failed", fallbackErr);
      }
    }

    // 4. Attach Quantum Seed (IBM Quantum hardware) if requested
    if (useQuantumSeed && result) {
      try {
        const seedResult = await getQuantumSeed(orderId, "fractal_generation");
        if (seedResult.success && seedResult.data) {
          result.quantum_provenance = {
            provider: seedResult.data.provider,
            jobId: seedResult.data.jobId,
            backend: seedResult.data.backend,
            seed: seedResult.data.seed,
            shots: seedResult.data.shots,
            createdAt: seedResult.data.createdAt,
          };
          result.quantumSeed = seedResult.data.seed;
        }
      } catch (seedErr) {
        logError("quantum.seed.failed", seedErr);
      }
    }

    // 5. Add Fractal Dimension (NEW)
    if (result) {
      const dim = calculateFractalDimension(prompt);
      result.fractal_dimension = {
        value: parseFloat(dim.value.toFixed(4)),
        method: dim.method,
        label: dim.label
      };
      result.meta = {
        ...(isRecord(result.meta) ? result.meta : {}),
        palette_profile,
        narrative_settings: narrativeSettings,
      };
    }

    // 6. Final safety check
    if (!result) {
      return NextResponse.json({ 
        success: false, 
        error: "Image generation failed" 
      }, { status: 500 });
    }

    if (!result.image_url) {
      result.image_url = "/api/images/placeholder.png";
    }

    // Optional IPFS upload
    if (body.ipfs_upload) {
      try {
        const safeFilename = `${orderId}`.replace(/[^a-z0-9_.-]+/gi, "_") + ".png";
        const ipfs = await uploadToIpfs({
          imageUrl: result.image_url,
          filename: safeFilename,
          internalBaseUrl: req.nextUrl.origin,
        });
        result.ipfs = ipfs;
      } catch (ipfsErr) {
        logError("ipfs.upload.failed", ipfsErr);
      }
    }

    return NextResponse.json({ success: true, ...result });

  } catch (error: unknown) {
    logError("image.generate.critical", error);
    console.error("Critical error in /api/generate/image:", error);
    const message =
      typeof error === "object" && error !== null && "message" in error && typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "Internal server error";
    return NextResponse.json({ 
      success: false, 
      error: message 
    }, { status: 500 });
  }
}

// === GET HANDLER ===
export async function GET(req: NextRequest) {
  try {
    const promoText = req.nextUrl.searchParams.get("promo");
    if (!promoText) {
      return NextResponse.json({ error: "promo_required" }, { status: 400 });
    }
    const recommendations = previewPromoRecommendations(promoText);
    return NextResponse.json({ recommendations, promo: promoText });
  } catch (e) {
    logError("fractal.preview_error", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
