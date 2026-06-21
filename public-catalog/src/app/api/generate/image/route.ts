import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

// Serverless limits
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// === IMPORTS ===
import { getApiKey, validateApiKey } from "@/lib/api/auth";
import { rateLimitKey, consume } from "@/lib/api/rate-limit";
import { ok, fail } from "@/lib/api/response";
import { logInfo, logError } from "@/lib/api/logger";
import { generateImageForPlatform } from "@/lib/contentFactory/image";
import { uploadToIpfs } from "@/lib/ipfs/upload";
import { getAiGeneratorsConfig } from "@/lib/aiGeneratorsConfig";
import { processFractalPromo, recommendFractalSettings, previewPromoRecommendations } from "./fractal-fusion";
import { getQuantumSeed } from "@/lib/quantum-seed";

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

// === CACHE ===
const cache = new Map<string, any>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function cacheKeyFor(v: any): string {
  return createHash("sha256").update(JSON.stringify(v)).digest("hex");
}

function getCache(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function setCache(key: string, value: any) {
  cache.set(key, { ...value, createdAt: Date.now() });
}

// === QUANTUM HYBRID GENERATOR ===
async function tryQuantumHybridGenerate(
  prompt: string,
  width: number,
  height: number,
  negative_prompt: string | undefined,
  timeoutMs: number,
  use_fractal_fusion: boolean = true
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
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data: any = await res.json();

    if (data.success === true && typeof data.imageUrl === "string") {
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

    let result: any = null;

    // 1. Try Quantum Hybrid
    try {
      result = await tryQuantumHybridGenerate(
        prompt,
        width,
        height,
        negative_prompt,
        45000,
        use_fractal_fusion
      );
    } catch (quantumErr) {
      logError("quantum.hybrid.failed", quantumErr);
    }

    // 2. Fallback (final type fix)
    if (!result) {
      try {
        result = await (generateImageForPlatform as any)(
          prompt,
          (body.platform || "linkedin") as any,
          (body.provider || "quantum") as any
        );
      } catch (fallbackErr) {
        logError("fallback.generate.failed", fallbackErr);
      }
    }

    // 3. Attach Quantum Seed (IBM Quantum hardware) if requested
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

    // 4. Final safety check
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
        const ipfs = await uploadToIpfs(result.image_url);
        result.ipfs = ipfs;
      } catch (ipfsErr) {
        logError("ipfs.upload.failed", ipfsErr);
      }
    }

    return NextResponse.json({ success: true, ...result });

  } catch (error: any) {
    logError("image.generate.critical", error);
    console.error("Critical error in /api/generate/image:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Internal server error" 
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
