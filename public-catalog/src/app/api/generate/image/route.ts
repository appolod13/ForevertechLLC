import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

// #The Render fusion-service can take ~30s to render fractal art; raise the
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

// NEW: Quantum Hybrid Generator Integration (full combined version)
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

  const url = base + "/generate"; // Calls the Python quantum backend with the full hybrid generator

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

// (Rest of your original functions remain unchanged - latestRealQuantumImage, validate, validateV2, tryAIGenerate, tryFusionGenerate, maybeUploadIpfs, etc.)

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
    const useFractalFusion = parsed.use_fractal_fusion ?? true;

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

    // === PRIORITIZE FULL QUANTUM HYBRID GENERATOR ===
    if (quantumAllowed || useFractalFusion) {
      const hybrid = await tryQuantumHybridGenerate(
        parsed.prompt,
        width,
        height,
        parsed.negative_prompt,
        timeoutMs,
        useFractalFusion
      );

      if (hybrid) {
        const meta = { ...(hybrid.meta || {}) };
        if (parsed.ipfs_upload) {
          const ipfsMeta = await maybeUploadIpfs({ image_url: hybrid.image_url, requestId });
          Object.assign(meta, ipfsMeta);
        }
        logInfo("image.generate.success", { requestId, meta, note: "quantum_hybrid" });
        setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: hybrid.image_url, meta });
        return ok({ image_url: hybrid.image_url, meta, requestId });
      }
    }

    // Fallback to original fusion / AI logic (your existing code)
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

    // (Rest of your original fallback logic remains unchanged)
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