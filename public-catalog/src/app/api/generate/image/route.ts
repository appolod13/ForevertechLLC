import { NextRequest, NextResponse } from "next/server";
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

// Keep all your existing helper functions here (isLocalHostUrl, isRecord, latestRealQuantumImage, cache functions, tryQuantumHybridGenerate, etc.)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Basic validation
    if (!body.prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const prompt = body.prompt;
    const platform = body.platform || "linkedin";
    const provider = body.provider || "quantum";
    const useFractalFusion = body.use_fractal_fusion !== false;

    // Call your generation logic
    let result;
    try {
      result = await tryQuantumHybridGenerate(
        prompt,
        body.width || 1024,
        body.height || 1024,
        body.negative_prompt,
        45000,
        useFractalFusion
      );
    } catch (genError) {
      logError("quantum.generate.failed", genError);
      result = null;
    }

    // Fallback if quantum fails
    if (!result) {
      result = await generateImageForPlatform(prompt, platform, provider);
    }

    if (!result || !result.image_url) {
      return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
    }

    // Optional IPFS upload
    if (body.ipfs_upload) {
      try {
        const ipfsResult = await uploadToIpfs(result.image_url);
        result.ipfs = ipfsResult;
      } catch (ipfsErr) {
        logError("ipfs.upload.failed", ipfsErr);
      }
    }

    return NextResponse.json({ success: true, ...result });

  } catch (error: any) {
    logError("image.generate.error", error);
    console.error("Image generation error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const promoText = searchParams.get("promo");

    if (!promoText) {
      return NextResponse.json({ error: "promo_required" }, { status: 400 });
    }

    const recommendations = previewPromoRecommendations(promoText);
    logInfo("fractal.preview_requested", { promo: promoText, recommendations });

    return NextResponse.json({ recommendations, promo: promoText });
  } catch (e) {
    logError("fractal.preview_error", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}