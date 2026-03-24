import { NextRequest } from "next/server";
import { getApiKey, validateApiKey } from "@/lib/api/auth";
import { rateLimitKey, consume } from "@/lib/api/rate-limit";
import { ok, fail } from "@/lib/api/response";
import { logInfo, logError } from "@/lib/api/logger";
import { generateImageForPlatform } from "@/lib/contentFactory/image";
import { uploadToIpfs } from "@/lib/ipfs/upload";
import { createHash } from "crypto";
import { setLatestImage } from "@/lib/runtimeState/latestImage";

type Platform = "linkedin" | "instagram" | "twitter";
type Provider = "mock" | "dalle" | "stablediffusion" | "midjourney";

type ImageRequest = { prompt: string; platform: Platform; provider: Provider };
type ImageRequestV2 = { prompt: string; negative_prompt?: string; width?: number; height?: number; provider?: Provider; quantum_mode?: boolean; ipfs_upload?: boolean };

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

function cacheKeyFor(v: { prompt: string; negative_prompt?: string; width: number; height: number; provider?: Provider; quantum_mode: boolean }): string {
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
  if (errors.length) return { valid: false, errors };
  return { valid: true, errors: [], parsed: { prompt, negative_prompt, width: w, height: h, provider, quantum_mode, ipfs_upload } };
}

async function tryAIGenerate(
  prompt: string,
  width: number,
  height: number,
  quantum_mode: boolean,
  ipfs_upload: boolean,
  timeoutMs: number,
): Promise<AIResult> {
  const base = (process.env.AI_IMAGE_GEN_URL || "http://localhost:5328").trim();
  const url = base.replace(/\/$/, "") + "/v1/images/generations";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, width, height, steps: 30, quantum_mode, ipfs_upload }),
      signal: controller.signal,
      cache: "no-store",
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
    const publicQuantumBase = (process.env.NEXT_PUBLIC_QUANTUM_API_URL || "").trim().replace(/\/$/, "");
    const imageUrl =
      rawImageUrl.startsWith("/") && publicQuantumBase
        ? `${publicQuantumBase}${rawImageUrl}`
        : rawImageUrl;

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
    if (name === "AbortError") {
      return { success: false, error: "timeout" };
    }
    return { success: false, error: message || "network_error" };
  } finally {
    clearTimeout(timeout);
  }
}

async function tryFusionGenerate(prompt: string, width: number, height: number, negative_prompt?: string) {
  const base = (process.env.FUSION_SERVICE_URL || "").trim();
  if (!base) return null;
  const url = base.replace(/\/$/, "") + "/generate";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, negative_prompt, width, height, steps: 30, seed: -1, guidance_scale: 7.5 }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const d = isRecord(data) ? data : {};
    if (d.success === true && typeof d.imageUrl === "string") {
      return { image_url: d.imageUrl as string, meta: isRecord(d.meta) ? (d.meta as Record<string, unknown>) : { provider: "fusion" } };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function maybeUploadIpfs(params: { image_url: string; requestId: string }): Promise<Record<string, unknown>> {
  const internalQuantumBase = (process.env.AI_IMAGE_GEN_URL || "").trim().replace(/\/$/, "");
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
      setLatestImage({ imageUrl: result.image_url, meta: result.meta });
      return ok({ image_url: result.image_url, meta: result.meta, requestId });
    }

    const v2 = validateV2(body);
    if (!v2.valid) return fail("validation_error", 400, v2.errors);
    const parsed = v2.parsed as ImageRequestV2;
    const width = parsed.width ?? 512;
    const height = parsed.height ?? 512;
    logInfo("image.generate.request", { requestId, prompt: parsed.prompt, width, height, provider: parsed.provider || "auto", quantum_mode: parsed.quantum_mode, ipfs_upload: parsed.ipfs_upload });
    
    const stdTimeoutMs = asPositiveInt(process.env.AI_IMAGE_TIMEOUT_STD_MS) ?? 30_000;
    const quantumTimeoutMs = asPositiveInt(process.env.AI_IMAGE_TIMEOUT_QUANTUM_MS) ?? 120_000;
    const timeoutMs = parsed.quantum_mode ? quantumTimeoutMs : stdTimeoutMs;

    const cacheKey = cacheKeyFor({ prompt: parsed.prompt, negative_prompt: parsed.negative_prompt, width, height, provider: parsed.provider, quantum_mode: Boolean(parsed.quantum_mode) });
    const cached = getCache(cacheKey);
    if (cached) {
      if (parsed.ipfs_upload && typeof cached.meta.ipfs_url !== "string") {
        const ipfsMeta = await maybeUploadIpfs({ image_url: cached.image_url, requestId });
        cached.meta = { ...cached.meta, ...ipfsMeta };
        setCache(cacheKey, cached);
      }
      setLatestImage({ imageUrl: cached.image_url, meta: cached.meta });
      return ok({ image_url: cached.image_url, meta: cached.meta, requestId, cached: true });
    }

    if (parsed.quantum_mode) {
      const aiService = await tryAIGenerate(
        parsed.prompt,
        width,
        height,
        true,
        parsed.ipfs_upload || false,
        timeoutMs,
      );
      
      if (aiService.success) {
        const meta = { ...(aiService.meta || {}) };
        if (parsed.ipfs_upload) {
          const ipfsMeta = await maybeUploadIpfs({ image_url: aiService.image_url, requestId });
          Object.assign(meta, ipfsMeta);
        }
        logInfo("image.generate.success", { requestId, meta });
        setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: aiService.image_url, meta });
        setLatestImage({ imageUrl: aiService.image_url, meta });
        return ok({ image_url: aiService.image_url, meta, requestId });
      }

      logError("image.generate.quantum_failed", { requestId, error: aiService.error });
      const degraded = await tryAIGenerate(
        parsed.prompt,
        width,
        height,
        false,
        false,
        timeoutMs,
      );
      if (degraded.success) {
        const meta = { ...(degraded.meta || {}), degraded_from_quantum: true, degraded_reason: aiService.error || "unknown" };
        if (parsed.ipfs_upload) {
          const ipfsMeta = await maybeUploadIpfs({ image_url: degraded.image_url, requestId });
          Object.assign(meta, ipfsMeta);
        }
        setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: degraded.image_url, meta });
        setLatestImage({ imageUrl: degraded.image_url, meta });
        return ok({
          image_url: degraded.image_url,
          meta,
          requestId,
        });
      }

      const result = await generateImageForPlatform("mock", parsed.prompt, "twitter");
      const meta = { ...result.meta, fallback: true, degraded_from_quantum: true };
      setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: result.image_url, meta });
      setLatestImage({ imageUrl: result.image_url, meta });
      return ok({ image_url: result.image_url, meta, requestId });
    }

    // Try Fusion first if quantum_mode is false
    const fusion = await tryFusionGenerate(parsed.prompt, width, height, parsed.negative_prompt);
    if (fusion) {
      const meta = { ...(fusion.meta || {}) };
      if (parsed.ipfs_upload) {
        const ipfsMeta = await maybeUploadIpfs({ image_url: fusion.image_url, requestId });
        Object.assign(meta, ipfsMeta);
      }
      logInfo("image.generate.success", { requestId, meta });
      setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: fusion.image_url, meta });
      setLatestImage({ imageUrl: fusion.image_url, meta });
      return ok({ image_url: fusion.image_url, meta, requestId });
    }

    // Fallback to Mock/Quantum (Rule 30) if Fusion fails
    const aiService = await tryAIGenerate(
      parsed.prompt,
      width,
      height,
      false, 
      parsed.ipfs_upload || false,
      timeoutMs,
    );
    
    if (aiService.success) {
      const meta = { ...(aiService.meta || {}) };
      if (parsed.ipfs_upload) {
        const ipfsMeta = await maybeUploadIpfs({ image_url: aiService.image_url, requestId });
        Object.assign(meta, ipfsMeta);
      }
      logInfo("image.generate.success", { requestId, meta });
      setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: aiService.image_url, meta });
      setLatestImage({ imageUrl: aiService.image_url, meta });
      return ok({ image_url: aiService.image_url, meta, requestId });
    }
    const result = await generateImageForPlatform("mock", parsed.prompt, "twitter");
    const meta = { ...result.meta, fallback: true };
    setCache(cacheKey, { createdAt: Date.now(), lastAccessAt: Date.now(), image_url: result.image_url, meta });
    setLatestImage({ imageUrl: result.image_url, meta });
    return ok({ image_url: result.image_url, meta, requestId });
  } catch (e) {
    logError("image.generate.error", e);
    return fail("internal_error", 500);
  }
}
