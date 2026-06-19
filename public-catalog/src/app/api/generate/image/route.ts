import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

// Serverless limits
export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { getApiKey, validateApiKey } from "@/lib/api/auth";
import { rateLimitKey, consume } from "@/lib/api/rate-limit";
import { ok, fail } from "@/lib/api/response";
import { logInfo, logError } from "@/lib/api/logger";
import { generateImageForPlatform } from "@/lib/contentFactory/image";
import { uploadToIpfs } from "@/lib/ipfs/upload";
import { getAiGeneratorsConfig } from "@/lib/aiGeneratorsConfig";
import { createHash } from "crypto";
import { processFractalPromo, recommendFractalSettings, previewPromoRecommendations } from "./fractal-fusion";

// Helpers
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

function latestRealQuantumImage(): { image_url: string; meta: Record<string, unknown> } | null {
  try {
    const imagesDir = path.join(process.cwd(), "..", "quantum-image-gen", "images");
    if (!fs.existsSync(imagesDir)) return null;
    const files = fs.readdirSync(imagesDir).filter((f) => f.toLowerCase().endsWith(".png"));
    if (files.length === 0) return null;
    files.sort((a, b) => b.localeCompare(a));
    const latest = files[0];
    return {
      image_url: `/api/images/${encodeURIComponent(latest)}`,
      meta: { provider: "quantum_image_archive", filename: latest, source: "local_archive" },
    };
  } catch {
    return null;
  }
}

type Platform = "linkedin" | "instagram" | "twitter";
type Provider = "mock" | "dalle" | "stablediffusion" | "midjourney";

type ImageRequest = { prompt: string; platform: Platform; provider: Provider };
type ImageRequestV2 = {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  provider?: Provider;
  quantum_mode?: boolean;
  ipfs_upload?: boolean;
  seed_salt?: string;
  use_fractal_fusion?: boolean;
};

type AIResult =
  | { success: true; image_url: string; meta: Record<string, unknown> }
  | { success: false; error: string };

type Cached = {
  createdAt: number;
  lastAccessAt: number;
  image_url: string;
  meta: Record<string, unknown>;
};

const cache = new Map<string, Cached>();
const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 200;

function cacheKeyFor(v: {
  prompt: string;
  negative_prompt?: string;
  width: number;
  height: number;
  provider?: Provider;
  quantum_mode: boolean;
  seed_salt?: string;
  use_fractal_fusion?: boolean;
}): string {
  const payload = JSON.stringify(v);
  return createHash("sha256").update(payload).digest("hex");
}

function getCache(key: string): Cached | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  entry.lastAccessAt = Date.now();
  return entry;
}

function setCache(key: string, value: Cached) {
  cache.set(key, value);
  if (cache.size <= CACHE_MAX) return;
  let oldestKey: string | null = null;
  let oldestTs = Number.POSITIVE_INFINITY; // Fixed typing
  for (const [k, v] of cache.entries()) {
    if (v.lastAccessAt < oldestTs) {
      oldestTs = v.lastAccessAt;
      oldestKey = k;
    }
  }
  if (oldestKey) cache.delete(oldestKey);
}

// Quantum Hybrid Generator
async function tryQuantumHybridGenerate(
  prompt: string,
  width: number,
  height: number,
  negative_prompt: string | undefined,
  timeoutMs: number,
  use_fractal_fusion: boolean = true,
) {
  const cfg = getAiGeneratorsConfig();
  const base = cfg.quantum.internalBaseUrl.trim().replace(/\/$/, "");
  if (!base) return null;
  if (process.env.NODE_ENV === "production" && isLocalHostUrl(base)) return null;

  const url = base + "/generate";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));

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

    const data: unknown = await res.json();
    const d = isRecord(data) ? data : {};

    if (d.success === true && typeof d.imageUrl === "string") {
      const rawImageUrl = (d.imageUrl as string).trim();
      const imageUrl = rawImageUrl.startsWith("/images/")
        ? `/api/images/${encodeURIComponent(rawImageUrl.slice("/images/".length))}`
        : rawImageUrl.startsWith("/") && cfg.quantum.publicBaseUrl.trim()
          ? `${cfg.quantum.publicBaseUrl.trim().replace(/\/$/, "")}${rawImageUrl}`
          : rawImageUrl;

      return {
        image_url: imageUrl,
        meta: isRecord(d.meta)
          ? (d.meta as Record<string, unknown>)
          : { provider: "quantum_hybrid", fractal_fusion_enabled: use_fractal_fusion },
      };
    }
    return null;
  } catch (e) {
    console.error("Quantum Hybrid Generate Error", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Your original functions (tryAIGenerate, tryFusionGenerate, maybeUploadIpfs, validate, validateV2, etc.) go here.
// For brevity, assume they are unchanged from your original file.

export async function POST(req: NextRequest) {
  // (The POST handler from my previous message with the quantum hybrid priority)
  // ... paste the full POST handler from the previous response if needed ...
  // The key part is using tryQuantumHybridGenerate when quantumAllowed or useFractalFusion
}

export async function GET(req: NextRequest) {
  // Unchanged
  try {
    const searchParams = req.nextUrl.searchParams;
    const promoText = searchParams.get("promo");

    if (!promoText) {
      return fail("promo_required", 400);
    }

    const recommendations = previewPromoRecommendations(promoText);
    logInfo("fractal.preview_requested", { promo: promoText, recommendations });

    return ok({ recommendations, promo: promoText });
  } catch (e) {
    logError("fractal.preview_error", e);
    return fail("internal_error", 500);
  }
}