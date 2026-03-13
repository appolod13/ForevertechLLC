import { consume, rateLimitKey } from "@/lib/api/rate-limit";
import { ok, fail } from "@/lib/api/response";

export async function GET(request: Request) {
  const rl = consume(rateLimitKey(new Headers(request.headers)), { windowMs: 60_000, max: 10 });
  if (!rl.allowed) return fail("rate_limited", 429, { resetAt: rl.resetAt });
  return ok({ remaining: rl.remaining, resetAt: rl.resetAt });
}
