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

// ... (all your helper functions remain unchanged) ...

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // ... your existing validation and logic ...

    // Example of safe handling (adapt to your full code)
    if (!body.prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Your quantum hybrid, fusion, etc. calls...

    const result = await tryQuantumHybridGenerate(...) || /* fallback */;

    if (!result) {
      return NextResponse.json({ error: "Generation failed" }, { status: 500 });
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