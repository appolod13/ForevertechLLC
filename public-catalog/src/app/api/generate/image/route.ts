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

// Helper functions (restored + added)
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