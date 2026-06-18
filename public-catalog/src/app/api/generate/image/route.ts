import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

// The Render fusion-service can take ~30s to render fractal art; raise the
// serverless function limit so the deployed site doesn't kill the request early.
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

// When the live AI generation services are unavailable, prefer serving the most
// recent real quantum-generated image instead of a static "AI Image" placeholder.
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
  let oldestTs = Infinity;
  for (const [k, v] of cache.entries()) {
    if (v.lastAccessAt < oldestTs) {
      oldestTs = v.lastAccessAt;
      oldestKey = k;
    }
  }
  if (oldestKey) cache.delete(oldestKey);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isLocalHostUrl(value: string): boolean {
  try {
    const u = new URL(value);
    const h = u.hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  } catch {
    return false;
  }
}

function asPositiveInt(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  const i = Number.isFinite(n) ? Math.trunc(n) : NaN;
  return Number.isFinite(i) && i > 0 ? i : undefined;
}

function asInt(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function isSameOrigin(req: NextRequest): boolean {
  const host = (req.headers.get("host") || "").trim();
  const origin = (req.headers.get("origin") || "").trim();
  if (!host || !origin) return false;
  return origin === `https://${host}` || origin === `http://${host}`;
}

function validate(body: unknown): { valid: boolean; errors: string[]; parsed?: ImageRequest } {
  const errors: string[] = [];
  const p: Platform[] = ["linkedin", "instagram", "twitter"];
  const providers: Provider[] = ["mock", "dalle", "stablediffusion", "midjourney"];
  const b = isRecord(body) ? body : {};
  const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
  const platform = b.platform;
  const provider = b.provider;
  if (!prompt) errors.push("prompt required");
  if (!p.includes(platform as Platform)) errors.push("invalid platform");
  if (!providers.includes(provider as Provider)) errors.push("invalid provider");
  if (errors.length) return { valid: false, errors };
  return { valid: true, errors: [], parsed: { prompt, platform: platform as Platform, provider: provider as Provider } };
}

function validateV2(body: unknown): { valid: boolean; errors: string[]; parsed?: ImageRequestV2 } {
  const errors: string[] = [];
  const providers: Provider[] = ["mock", "dalle", "stablediffusion", "midjourney"];
  const b = isRecord(body) ? body : {};
  const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
  if (!prompt) errors.push("prompt required");
  const negative_prompt = typeof b.negative_prompt === "string" ? b.negative_prompt.trim() : undefined;
  const w = asInt(b.width);
  const h = asInt(b.height);
  if (typeof w === "number" && (w < 64 || w > 1536)) errors.push("width must be within 64..1536");
  if (typeof h === "number" && (h < 64 || h > 1536)) errors.push("height must be within 64..1536");
  const provider = typeof b.provider === "string" && providers.includes(b.provider as Provider) ? (b.provider as Provider) : undefined;
  const quantum_mode = Boolean(b.quantum_mode);
  const ipfs_upload = Boolean(b.ipfs_upload);
  const seed_salt_raw = typeof b.seed_salt === "string" ? b.seed_salt.trim() : "";
  const seed_salt = seed_salt_raw ? seed_salt_raw.replace(/\s+/g, " ").slice(0, 128) : undefined;
  const use_fractal_fusion = Boolean(b.use_fractal_fusion);
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    parsed: { prompt, negative_prompt, width: w, height: h, provider, quantum_mode, ipfs_upload, seed_salt, use_fractal_fusion },
  };
}

async function tryAIGenerate(
  prompt: string,
  width: number,
  height: number,
  quantum_mode: boolean,
  ipfs_upload: boolean,
  seed_salt: string | undefined,
  timeoutMs: number,
  params?: Record<string, unknown>,
): Promise<AIResult> {
  const cfg = getAiGeneratorsConfig();
  const base = cfg.quantum.internalBaseUrl.trim().replace(/\/$/, "");
  if (process.env.NODE_ENV === "production" && (!base || isLocalHostUrl(base))) {
    return { success: false, error: "ai_generator_not_configured" };
  }
  const url = base + "/v1/images/generations";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  try {
    const steps = params?.steps || 30;
    const guidance_scale = params?.guidance_scale || 7.5;
    const seed = params?.seed !== undefined ? params.seed : -1;

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, width, height, steps, quantum_mode, ipfs_upload, seed_salt, seed, guidance_scale }),
      cache: "no-store",
      signal: controller.signal,
    });
    const contentType = res.headers.get("content-type") || "";
    let data: unknown = null;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text().catch(() => "");
      data = { success: false, error: text || "non_json_response" };
    }
    const d = isRecord(data) ? data : {};

    if (!res.ok || d.success !== true) {
      const err = typeof d.error === "string" && d.error.trim() ? d.error.trim() : `HTTP_${res.status}`;
      return { success: false, error: err };
    }

    if (typeof d.imageUrl !== "string" || !d.imageUrl.trim()) {
      return { success: false, error: "invalid_response_missing_imageUrl" };
    }

    const rawImageUrl = d.imageUrl.trim();
    const imageUrl = (() => {
      if (rawImageUrl.startsWith("/images/")) {
        return `/api/images/${encodeURIComponent(rawImageUrl.slice("/images/".length))}`;
      }
      if (rawImageUrl.startsWith("http://") || rawImageUrl.startsWith("https://")) {
        try {
          const u = new URL(rawImageUrl);
          if (u.pathname.startsWith("/images/")) {
            const filename = u.pathname.slice("/images/".length);
            if (filename) return `/api/images/${encodeURIComponent(filename)}`;
          }
        } catch {
        }
        return rawImageUrl;
      }
      if (rawImageUrl.startsWith("/") && cfg.quantum.publicBaseUrl.trim()) {
        return `${cfg.quantum.publicBaseUrl.trim().replace(/\/$/, "")}${rawImageUrl}`;
      }
      return rawImageUrl;
    })();

    return {
      success: true,
      image_url: imageUrl,
      meta: isRecord(d.meta) ? (d.meta as Record<string, unknown>) : { provider: "ai_image_service" },
    };
  } catch (e: unknown) {
    console.error("AI Generate Error", e);
    const name =
      (isRecord(e) && typeof e.name === "string" && e.name) ||
      (e instanceof Error ? e.name : "") ||
      "";
    const message =
      (isRecord(e) && typeof e.message === "string" && e.message) ||
      (e instanceof Error ? e.message : "") ||
      (typeof e === "string" ? e : "");
    const err = name === "AbortError" ? "timeout" : message || "network_error";
    return { success: false, error: err };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Enhanced Fusion Generate with 4D Fractal Support
 * Leverages fractal-generator library for dynamic multi-pattern generation
 */
async function tryFusionGenerate(
  prompt: string,
  width: number,
  height: number,
  negative_prompt: string | undefined,
  timeoutMs: number,
  use_fractal_fusion: boolean = true,
) {
  const cfg = getAiGeneratorsConfig();
  const base = cfg.fusion.internalBaseUrl.trim();
  if (!base) return null;
  if (process.env.NODE_ENV === "production" && isLocalHostUrl(base)) return null;
  const url = base.replace(/\/$/, "") + "/generate";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));

  try {
    let enhancedPrompt = prompt;
    let enhancedNegative = negative_prompt || "";
    let settings = { steps: 203, guidance_scale: 1.2, seed: 1 };
    let renderParams: Record<string, unknown> = {};
    let quality: number | undefined;
    let iterations: number | undefined;
    let paletteIndex: number | undefined;
    let rotation: number | undefined;
    let zoomLevel: number | undefined;
    let centerX: number | undefined;
    let centerY: number | undefined;

    // === NEW: Process through fractal-fusion for dynamic pattern generation ===
    if (use_fractal_fusion) {
      const fractalFusion = processFractalPromo({
        prompt,
        negative_prompt,
        width,
        height,
        use_fractal_fusion: true,
      });
      enhancedPrompt = fractalFusion.prompt;
      enhancedNegative = fractalFusion.negative_prompt;
      renderParams = fractalFusion.render_params;

      const recommendations = recommendFractalSettings(prompt);
      settings = {
        steps: Math.round(recommendations.steps * 1.35), // Scale up for fusion
        guidance_scale: recommendations.guidance_scale * 1.15,
        seed: recommendations.seed ?? 1,
      };
      const complexity = Number(fractalFusion.fractal_config.complexity ?? 0.5);
      quality = Number.isFinite(complexity) ? Math.max(0.5, Math.min(2.0, 0.9 + complexity)) : undefined;
      iterations = typeof renderParams.mandelbrot_max_iterations === "number" ? Math.trunc(renderParams.mandelbrot_max_iterations as number) : settings.steps;
      paletteIndex = typeof renderParams.color_seed === "number" ? Math.abs(Math.trunc(renderParams.color_seed as number)) % 12 : undefined;
      rotation = typeof renderParams.sierpinski_rotation === "number" ? Number(renderParams.sierpinski_rotation) : undefined;
      zoomLevel =
        typeof renderParams.mandelbrot_zoom === "number"
          ? Number(renderParams.mandelbrot_zoom)
          : typeof renderParams.julia_zoom === "number"
            ? Number(renderParams.julia_zoom)
            : undefined;
      centerX = typeof renderParams.mandelbrot_pan_x === "number" ? Number(renderParams.mandelbrot_pan_x) : undefined;
      centerY = typeof renderParams.mandelbrot_pan_y === "number" ? Number(renderParams.mandelbrot_pan_y) : undefined;

      logInfo("fractal_fusion.applied", {
        original_prompt: prompt,
        fractal_type: fractalFusion.fractal_config.primary_fractal,
        emotion: fractalFusion.fractal_config.emotion,
        settings,
      });
    } else {
      // === FALLBACK: Original static enhancer ===
      const styleEnhancer = `, vibrant quantum nebula fractal mandala, intricate self-similar organic patterns with glowing electric cyan magenta violet neon edges and luminous boundaries, deep p[...]`;
      const backgroundVariation = Math.random() > 0.4
        ? `, subtle dynamic nebula clouds and distant star specks`
        : `, pure deep cosmic black void for maximum contrast`;

      const emotionKeywords = ["calm", "peaceful", "serene", "dark", "mysterious", "energetic", "vibrant", "cosmic", "void", "emotional"];
      const hasEmotion = emotionKeywords.some((kw) => (prompt || "").toLowerCase().includes(kw));
      const finalBackground = hasEmotion ? `, consistent deep cosmic void matching emotional tone` : backgroundVariation;

      enhancedPrompt = (prompt || "").trim()
        ? `${prompt.trim()}${styleEnhancer}${finalBackground}`
        : `vibrant glowing quantum nebula fractal mandala with cyan magenta neon edges on dark cosmic background${styleEnhancer}${finalBackground}`;

      enhancedNegative =
        (negative_prompt || "") +
        `, blurry, low quality, artifacts, deformed, text, watermark, oversaturated bright colors, light background, realistic photo, cartoonish, dull flat colors, poor centering, split designs`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        negative_prompt: enhancedNegative,
        width,
        height,
        steps: settings.steps,
        seed: settings.seed,
        guidance_scale: settings.guidance_scale,
        quality,
        iterations,
        palette_index: paletteIndex,
        rotation,
        zoom_level: zoomLevel,
        center_x: centerX,
        center_y: centerY,
        render_params: renderParams,
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
        : rawImageUrl.startsWith("/") && cfg.fusion.publicBaseUrl.trim()
          ? `${cfg.fusion.publicBaseUrl.trim().replace(/\/$/, "")}${rawImageUrl}`
          : rawImageUrl;
      return {
        image_url: imageUrl,
        meta: isRecord(d.meta)
          ? (d.meta as Record<string, unknown>)
          : { provider: "fusion", fractal_fusion_enabled: use_fractal_fusion },
      };
    }
    return null;
  } catch (e) {
    console.error("Fusion Generate Error", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function maybeUploadIpfs(params: { image_url: string; requestId: string }): Promise<Record<string, unknown>> {
  const cfg = getAiGeneratorsConfig();
  const internalQuantumBase = cfg.quantum.internalBaseUrl.trim().replace(/\/$/, "");
  const result = await uploadToIpfs({
    imageUrl: params.image_url,
    filename: `generated_${params.requestId}.png`,
    internalBaseUrl: internalQuantumBase || undefined,
  });
  if (result.status === "disabled") return { ipfs_status: "disabled" };
  if (result.status === "failed") return { ipfs_status: "failed", ipfs_error: result.error };
  return { ipfs_status: "uploaded", ipfs_url: result.ipfsUrl, ipfs_gateway: result.gatewayUrl, ipfs_cid: result.cid };
}

export async function POST(req: NextRequest) {
  try {
    const requestId = globalThis.crypto?.randomUUID?.() || String(Date.now());
    const apiKeyHeader = getApiKey(req.headers);
    if (!validateApiKey(apiKeyHeader)) {
      if (!isSameOrigin(req)) return fail("unauthorized", 401);
    }
    const rl = consume(rateLimitKey(req.headers), { windowMs: 60_000, max: 60 });
    if (!rl.allowed) return fail("rate_limited", 429, { resetAt: rl.resetAt });
    const body: unknown = await req.json();
    const b = isRecord(body) ? body : {};
    const hasLegacyFields = "platform" in b || "provider" in b;
    if (hasLegacyFields) {
      const v = validate(body);
      if (!v.valid) return fail("validation_error", 400, v.errors);
      const parsed = v.parsed as ImageRequest;
      logInfo("image.generate.request", { requestId, prompt: parsed.prompt, platform: parsed.platform, provider: parsed.provider });
      const result = await generateImageForPlatform(parsed.provider, parsed.prompt, parsed.platform);
      logInfo("image.generate.success", { requestId, meta: result.meta });
      return ok({ image_url: result.image_url, meta: result.meta, requestId });
    }

    const v2 = validateV2(body);
    if (!v2.valid) return fail("validation_error", 400, v2.errors);
    const parsed = v2.parsed as ImageRequestV2;
    const width = parsed.width ?? 512;
    const height = parsed.height ?? 512;
    logInfo("image.generate.request", {
      requestId,
      prompt: parsed.prompt,
      width,
      height,
      provider: parsed.provider || "auto",
      quantum_mode: parsed.quantum_mode,
      ipfs_upload: parsed.ipfs_upload,
      use_fractal_fusion: parsed.use_fractal_fusion,
    });

    const cfg = getAiGeneratorsConfig();
    const stdTimeoutMs = cfg.timeouts.stdMs;
    const quantumTimeoutMs = cfg.timeouts.quantumMs;
    const requestedQuantum = Boolean(parsed.quantum_mode);
    const quantumAllowed = requestedQuantum && cfg.quantum.enabled;
    const timeoutMs = requestedQuantum ? quantumTimeoutMs : stdTimeoutMs;
    const useFractalFusion = parsed.use_fractal_fusion ?? true; // Default to fractal fusion

    const cacheKey = cacheKeyFor({
      prompt: parsed.prompt,
      negative_prompt: parsed.negative_prompt,
      width,
      height,
      provider: parsed.provider,
      quantum_mode: Boolean(parsed.quantum_mode),
      seed_salt: parsed.seed_salt,
      use_fractal_fusion: useFractalFusion,
    });

    if (quantumAllowed) {
      const aiService = await tryAIGenerate(
        parsed.prompt,
        width,
        height,
        true,
        parsed.ipfs_upload || false,
        parsed.seed_salt,
        timeoutMs,
        recommendFractalSettings(parsed.prompt),
      );

      if (aiService.success) {
        const meta = { ...(aiService.meta || {}) };
        if (parsed.ipfs_upload) {
          const ipfsMeta = await maybeUploadIpfs({ image_url: aiService.image_url, requestId });
          Object.assign(meta, ipfsMeta);
        }
        logInfo("image.generate.success", { requestId, meta });
        setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: aiService.image_url, meta });
        return ok({ image_url: aiService.image_url, meta, requestId });
      }

      logError("image.generate.quantum_failed", { requestId, error: aiService.error });
      const degraded = await tryAIGenerate(
        parsed.prompt,
        width,
        height,
        false,
        false,
        parsed.seed_salt,
        timeoutMs,
        recommendFractalSettings(parsed.prompt),
      );
      if (degraded.success) {
        const meta = { ...(degraded.meta || {}), degraded_from_quantum: true, degraded_reason: aiService.error || "unknown" };
        if (parsed.ipfs_upload) {
          const ipfsMeta = await maybeUploadIpfs({ image_url: degraded.image_url, requestId });
          Object.assign(meta, ipfsMeta);
        }
        logInfo("image.generate.success", { requestId, meta, note: "degraded" });
        setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: degraded.image_url, meta });
        return ok({
          image_url: degraded.image_url,
          meta,
          requestId,
        });
      }

      const archive = latestRealQuantumImage();
      if (archive) {
        const meta = { ...archive.meta, fallback: true, degraded_from_quantum: true, degraded_reason: aiService.error || "unknown" };
        logInfo("image.generate.success", { requestId, meta, note: "quantum_archive_fallback" });
        return ok({ image_url: archive.image_url, meta, requestId });
      }
      const result = await generateImageForPlatform("mock", parsed.prompt, "twitter");
      const meta = { ...result.meta, fallback: true, degraded_from_quantum: true };
      logInfo("image.generate.success", { requestId, meta, note: "quantum_mock_fallback" });
      setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: result.image_url, meta });
      return ok({ image_url: result.image_url, meta, requestId });
    }

    // === NEW: Use Fusion with Fractal Support ===
    const fusion = cfg.fusion.enabled ? await tryFusionGenerate(parsed.prompt, width, height, parsed.negative_prompt, timeoutMs, useFractalFusion) : null;
    if (fusion) {
      const meta = { ...(fusion.meta || {}) };
      if (parsed.ipfs_upload) {
        const ipfsMeta = await maybeUploadIpfs({ image_url: fusion.image_url, requestId });
        Object.assign(meta, ipfsMeta);
      }
      logInfo("image.generate.success", { requestId, meta });
      setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: fusion.image_url, meta });
      return ok({ image_url: fusion.image_url, meta, requestId });
    }

    const aiService = cfg.quantum.enabled
      ? await tryAIGenerate(parsed.prompt, width, height, false, parsed.ipfs_upload || false, parsed.seed_salt, timeoutMs, recommendFractalSettings(parsed.prompt))
      : ({ success: false, error: "disabled" } as AIResult);

    if (aiService.success) {
      const meta = { ...(aiService.meta || {}) };
      if (parsed.ipfs_upload) {
        const ipfsMeta = await maybeUploadIpfs({ image_url: aiService.image_url, requestId });
        Object.assign(meta, ipfsMeta);
      }
      logInfo("image.generate.success", { requestId, meta });
      setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: aiService.image_url, meta });
      return ok({ image_url: aiService.image_url, meta, requestId });
    }
    const archive = latestRealQuantumImage();
    if (archive) {
      const meta = { ...archive.meta, fallback: true };
      logInfo("image.generate.success", { requestId, meta, note: "archive_fallback" });
      return ok({ image_url: archive.image_url, meta, requestId });
    }
    const result = await generateImageForPlatform("mock", parsed.prompt, "twitter");
    const meta = { ...result.meta, fallback: true };
    logInfo("image.generate.success", { requestId, meta, note: "mock_fallback" });
    setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: result.image_url, meta });
    return ok({ image_url: result.image_url, meta, requestId });
  } catch (e) {
    logError("image.generate.error", e);
    return fail("internal_error", 500);
  }
}

/**
 * GET endpoint for promo preview recommendations
 * Allows frontend to show recommendations before generation
 */
export async function GET(req: NextRequest) {
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
