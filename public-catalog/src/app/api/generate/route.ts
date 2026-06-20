// ================================================
// DYNAMIC QUANTUM HYBRID FRACTAL GENERATOR v4.0
// Force real shape + pattern changes based on ANY words
// No more locked Mandelbrot stripes!
// Edited by Grok - June 2026 for appolod13
// ================================================

import { NextRequest, NextResponse } from "next/server";
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

// === CACHE ===
const cache = new Map<string, any>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function cacheKeyFor(v: any): string {
 return createHash("sha256").update(JSON.stringify(v)).digest("hex");
}

// === DYNAMIC FRACTAL SELECTOR - THIS IS THE KEY FIX ===
function getFractalType(prompt: string): string {
 const lower = prompt.toLowerCase();
 if (lower.includes("sierpinski") || lower.includes("carpet")) return "sierpinski";
 if (lower.includes("koch")) return "koch";
 if (lower.includes("quantum") || lower.includes("dark matter")) return "quantum";
 if (lower.includes("julia")) return "julia";
 if (lower.includes("ancient") || lower.includes("girih")) return "ancient";
 return "hybrid"; // default dynamic blend
}

// === MAIN POST HANDLER ===
export async function POST(req: NextRequest) {
 try {
 const body = await req.json().catch(() => ({}));
 const prompt = (body.prompt || "").toString().trim();

 if (!prompt) {
 return NextResponse.json({ success: false, error: "Prompt is required" }, { status: 400 });
 }

 const width = body.width || 1024;
 const height = body.height || 1024;
 const use_fractal_fusion = body.use_fractal_fusion !== false;

 const fractalType = getFractalType(prompt);
 logInfo("fractal.generate", { prompt: prompt.substring(0, 100), fractalType, width, height });

 // Force dynamic generation
 const result = await generateImageForPlatform("quantum", prompt, "twitter", {
 fractal_type: fractalType,
 width,
 height,
 use_fractal_fusion,
 });

 if (result && result.image_url) {
 return NextResponse.json({ success: true, image_url: result.image_url, meta: result.meta || {} });
 }

 // Fallback
 const fallback = await generateImageForPlatform("mock", prompt, "twitter");
 return NextResponse.json({ success: true, image_url: fallback.image_url, meta: { note: "fallback" } });

 } catch (error: any) {
 logError("image.generate.error", error);
 return NextResponse.json({ success: false, error: error.message || "Internal error" }, { status: 500 });
 }
}

// GET for promo preview
export async function GET(req: NextRequest) {
 const promo = req.nextUrl.searchParams.get("promo");
 if (!promo) return NextResponse.json({ error: "promo required" }, { status: 400 });
 const recs = previewPromoRecommendations(promo);
 return NextResponse.json({ recommendations: recs, promo });
}