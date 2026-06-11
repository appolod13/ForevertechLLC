import fs from "fs";
import path from "path";
import { getAiGeneratorsConfig } from "@/lib/aiGeneratorsConfig";

type Provider = "mock" | "local" | "fusion";

export interface AssetRequest {
  provider: Provider;
  type: "thumbnail" | "sprite" | "bundle";
  prompt?: string;
}

export interface AssetResult {
  asset_url: string;
  meta: Record<string, unknown>;
}

// Recommended output dimensions per asset type.
const DIMENSIONS: Record<AssetRequest["type"], { width: number; height: number }> = {
  thumbnail: { width: 1280, height: 720 },
  sprite: { width: 512, height: 512 },
  bundle: { width: 1024, height: 1024 },
};

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

// Call the quantum-image-gen service to render real Julia/Mandelbrot fractal art.
async function tryQuantumAsset(
  prompt: string,
  width: number,
  height: number,
  timeoutMs: number,
): Promise<AssetResult | null> {
  const cfg = getAiGeneratorsConfig();
  if (!cfg.quantum.enabled) return null;
  const base = cfg.quantum.internalBaseUrl.trim().replace(/\/$/, "");
  if (!base) return null;
  if (process.env.NODE_ENV === "production" && isLocalHostUrl(base)) return null;
  const url = base + "/v1/images/generations";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, width, height, steps: 30, quantum_mode: true }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const d = isRecord(data) ? data : {};
    if (d.success !== true || typeof d.imageUrl !== "string" || !d.imageUrl.trim()) return null;
    const rawImageUrl = (d.imageUrl as string).trim();
    const assetUrl = rawImageUrl.startsWith("/images/")
      ? `/api/images/${encodeURIComponent(rawImageUrl.slice("/images/".length))}`
      : rawImageUrl.startsWith("/") && cfg.quantum.publicBaseUrl.trim()
        ? `${cfg.quantum.publicBaseUrl.trim().replace(/\/$/, "")}${rawImageUrl}`
        : rawImageUrl;
    return {
      asset_url: assetUrl,
      meta: { ...(isRecord(d.meta) ? d.meta : {}), provider: "quantum", source: "quantum-image-gen" },
    };
  } catch (e) {
    console.error("Quantum Asset Error", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Call the fusion-service /generate endpoint to render a real image asset.
async function tryFusionAsset(
  prompt: string,
  width: number,
  height: number,
  timeoutMs: number,
): Promise<AssetResult | null> {
  const cfg = getAiGeneratorsConfig();
  if (!cfg.fusion.enabled) return null;
  const base = cfg.fusion.internalBaseUrl.trim();
  if (!base) return null;
  if (process.env.NODE_ENV === "production" && isLocalHostUrl(base)) return null;
  const url = base.replace(/\/$/, "") + "/generate";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, width, height, steps: 30, seed: -1, guidance_scale: 7.5 }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const d = isRecord(data) ? data : {};
    if (d.success !== true || typeof d.imageUrl !== "string" || !d.imageUrl.trim()) return null;
    const rawImageUrl = (d.imageUrl as string).trim();
    const assetUrl = rawImageUrl.startsWith("/images/")
      ? `/api/images/${encodeURIComponent(rawImageUrl.slice("/images/".length))}`
      : rawImageUrl.startsWith("/") && cfg.fusion.publicBaseUrl.trim()
        ? `${cfg.fusion.publicBaseUrl.trim().replace(/\/$/, "")}${rawImageUrl}`
        : rawImageUrl;
    return {
      asset_url: assetUrl,
      meta: { ...(isRecord(d.meta) ? d.meta : {}), provider: "fusion", source: "fusion-service" },
    };
  } catch (e) {
    console.error("Fusion Asset Error", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Fallback to the most recent real quantum-generated image when fusion is down.
function latestRealQuantumImage(): AssetResult | null {
  try {
    const imagesDir = path.join(process.cwd(), "..", "quantum-image-gen", "images");
    if (!fs.existsSync(imagesDir)) return null;
    const files = fs.readdirSync(imagesDir).filter((f) => f.toLowerCase().endsWith(".png"));
    if (files.length === 0) return null;
    files.sort((a, b) => b.localeCompare(a));
    const latest = files[0];
    return {
      asset_url: `/api/images/${encodeURIComponent(latest)}`,
      meta: { provider: "quantum_image_archive", source: "local_archive", filename: latest, fallback: true },
    };
  } catch {
    return null;
  }
}

export async function generateAsset(req: AssetRequest): Promise<AssetResult> {
  const prompt = (req.prompt || "").trim() || `${req.type} asset`;
  const { width, height } = DIMENSIONS[req.type] ?? DIMENSIONS.thumbnail;
  const cfg = getAiGeneratorsConfig();

  // 1) Try the real quantum-image-gen service (Julia/Mandelbrot fractal art).
  const quantum = await tryQuantumAsset(prompt, width, height, cfg.timeouts.quantumMs);
  if (quantum) {
    return { asset_url: quantum.asset_url, meta: { ...quantum.meta, type: req.type, prompt } };
  }

  // 2) Try the live fusion-service.
  const fusion = await tryFusionAsset(prompt, width, height, cfg.timeouts.stdMs);
  if (fusion) {
    return { asset_url: fusion.asset_url, meta: { ...fusion.meta, type: req.type, prompt } };
  }

  // 3) Fall back to a real archived quantum image so the asset still renders.
  const archive = latestRealQuantumImage();
  if (archive) {
    return { asset_url: archive.asset_url, meta: { ...archive.meta, type: req.type, prompt } };
  }

  // 3) Last resort: a descriptive metadata record (no image available).
  const id = Math.random().toString(36).slice(2);
  return {
    asset_url: `/assets/generated/${req.type}/${id}.json`,
    meta: { provider: req.provider, type: req.type, id, prompt, fallback: true, note: "no_image_source_available" },
  };
}
