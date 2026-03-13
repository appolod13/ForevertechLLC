import { NextRequest } from "next/server";
import { getApiKey, validateApiKey } from "@/lib/api/auth";
import { rateLimitKey, consume } from "@/lib/api/rate-limit";
import { ok, fail } from "@/lib/api/response";
import { logInfo, logError } from "@/lib/api/logger";
import { validateFactoryRequest, validateFactoryOutput } from "@/lib/contentFactory/validate";
import { ensureSafePrompt, filterPII, safeMetadata } from "@/lib/safety";
import { generateCaptions, generateAutoSocialCaptions } from "@/lib/contentFactory/text";
import { generateImageForPlatform } from "@/lib/contentFactory/image";

type Platform = "linkedin" | "instagram" | "twitter";
type Provider = "mock" | "dalle" | "stablediffusion" | "midjourney";

export async function POST(req: NextRequest) {
  try {
    const key = getApiKey(req.headers);
    if (!validateApiKey(key)) return fail("unauthorized", 401);
    const rl = consume(rateLimitKey(req.headers), { windowMs: 60_000, max: 60 });
    if (!rl.allowed) return fail("rate_limited", 429, { resetAt: rl.resetAt });
    const body = await req.json();
    const v = validateFactoryRequest(body);
    if (!v.valid) return fail("validation_error", 400, v.errors);
    const topic: string = String(body.topic || "");
    const platforms: Platform[] = Array.isArray(body.platforms) && body.platforms.length ? body.platforms : ["linkedin", "instagram", "twitter"];
    const provider: Provider = (body.imageProvider || "mock") as Provider;
    const safetyEnabled: boolean = Boolean(body.safetyEnabled ?? true);
    const autoSocialEnabled: boolean = Boolean(body.autoSocialEnabled ?? false);
    const mode: "full" | "image_only" = (body.mode || "full") as "full" | "image_only";
    const safeTopic = safetyEnabled ? ensureSafePrompt(topic) : topic;
    const captions: Partial<Record<Platform, string>> =
      mode === "image_only"
        ? {}
        : autoSocialEnabled
        ? generateAutoSocialCaptions(safeTopic, platforms)
        : generateCaptions(safeTopic, platforms);
    const items: Array<{ platform: Platform; text_content: string; image_url: string; generation_metadata: Record<string, unknown> }> = [];
    logInfo("content.generate.request", { topic: safeTopic, platforms, provider, mode });
    for (const p of platforms) {
      const text = mode === "image_only" ? filterPII(String(body.texts?.[p] || "")) : String(captions[p] || "");
      const img = await generateImageForPlatform(provider, safeTopic, p);
      const meta = safeMetadata({
        provider,
        platform: p,
        prompt: safeTopic,
        image: img.meta,
        safety: safetyEnabled,
        auto_social_enabled: autoSocialEnabled,
        timestamp: new Date().toISOString(),
      });
      items.push({ platform: p, text_content: text, image_url: img.image_url, generation_metadata: meta });
    }
    const out = validateFactoryOutput(items);
    if (!out.valid) return fail("output_validation_error", 500, out.errors);
    logInfo("content.generate.success", { count: items.length });
    return ok({ items });
  } catch (e) {
    logError("content.generate.error", e);
    return fail("internal_error", 500);
  }
}
