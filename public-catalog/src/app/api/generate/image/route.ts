import { NextRequest } from "next/server";
import { getApiKey, validateApiKey } from "@/lib/api/auth";
import { rateLimitKey, consume } from "@/lib/api/rate-limit";
import { ok, fail } from "@/lib/api/response";
import { logInfo, logError } from "@/lib/api/logger";
import { generateImageForPlatform } from "@/lib/contentFactory/image";

type Platform = "linkedin" | "instagram" | "twitter";
type Provider = "mock" | "dalle" | "stablediffusion" | "midjourney";

function validate(body: any) {
  const errors: string[] = [];
  const p: Platform[] = ["linkedin", "instagram", "twitter"];
  const providers: Provider[] = ["mock", "dalle", "stablediffusion", "midjourney"];
  if (typeof body?.prompt !== "string" || !body.prompt.trim()) errors.push("prompt required");
  if (!p.includes(body?.platform)) errors.push("invalid platform");
  if (!providers.includes(body?.provider)) errors.push("invalid provider");
  return { valid: errors.length === 0, errors };
}

export async function POST(req: NextRequest) {
  try {
    const key = getApiKey(req.headers);
    if (!validateApiKey(key)) return fail("unauthorized", 401);
    const rl = consume(rateLimitKey(req.headers), { windowMs: 60_000, max: 60 });
    if (!rl.allowed) return fail("rate_limited", 429, { resetAt: rl.resetAt });
    const body = await req.json();
    const v = validate(body);
    if (!v.valid) return fail("validation_error", 400, v.errors);
    logInfo("image.generate.request", { prompt: body.prompt, platform: body.platform, provider: body.provider });
    const result = await generateImageForPlatform(body.provider, body.prompt, body.platform);
    logInfo("image.generate.success", { meta: result.meta });
    return ok({ image_url: result.image_url, meta: result.meta });
  } catch (e) {
    logError("image.generate.error", e);
    return fail("internal_error", 500);
  }
}
