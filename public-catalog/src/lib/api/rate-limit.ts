type Key = string;

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

const buckets = new Map<Key, { count: number; resetAt: number }>();

export function consume(key: Key, opts: RateLimitOptions): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.max - 1, resetAt };
  }
  if (bucket.count >= opts.max) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.count += 1;
  return { allowed: true, remaining: opts.max - bucket.count, resetAt: bucket.resetAt };
}

export function rateLimitKey(headers: Headers): string {
  const ip = headers.get("x-forwarded-for") || headers.get("X-Forwarded-For") || "unknown";
  const ua = headers.get("user-agent") || "unknown";
  return `${ip}|${ua}`;
}
