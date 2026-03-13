import { NextRequest } from "next/server";
import { getApiKey, validateApiKey } from "@/lib/api/auth";
import { rateLimitKey, consume } from "@/lib/api/rate-limit";
import { ok, fail } from "@/lib/api/response";
import { logInfo, logError } from "@/lib/api/logger";
import { generateAsset } from "@/lib/contentFactory/asset";

export async function POST(req: NextRequest) {
  try {
    const key = getApiKey(req.headers);
    if (!validateApiKey(key)) return fail("unauthorized", 401);
    const rl = consume(rateLimitKey(req.headers), { windowMs: 60_000, max: 120 });
    if (!rl.allowed) return fail("rate_limited", 429, { resetAt: rl.resetAt });
    const body = await req.json();
    if (!["thumbnail", "sprite", "bundle"].includes(body?.type)) {
      return fail("validation_error", 400, ["type must be thumbnail|sprite|bundle"]);
    }
    const provider = body?.provider || "mock";
    logInfo("asset.generate.request", { type: body.type, provider });
    const result = await generateAsset({ provider, type: body.type, prompt: body?.prompt });
    logInfo("asset.generate.success", { meta: result.meta });
    return ok(result);
  } catch (e) {
    logError("asset.generate.error", e);
    return fail("internal_error", 500);
  }
}
