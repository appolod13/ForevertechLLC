// Canonical production site. All Stripe success/cancel/return URLs (including the
// hosted-checkout "back" arrow) must resolve here — never to a mistyped or
// alternate host such as the misspelled "pixelcrypt.com".
export const CANONICAL_SITE_URL = 'https://pixelqrypt.com';

// Hosts that should always be rewritten to the canonical site. Add aliases here.
const CANONICAL_HOSTS = new Set([
  'pixelqrypt.com',
  'pixelcrypt.com', // common misspelling / legacy alias
]);

/**
 * Normalizes any resolved origin so that the canonical hosts (and their bare/www
 * variants) always map back to CANONICAL_SITE_URL. Non-canonical hosts (e.g. a
 * Vercel preview URL or localhost) are returned unchanged (trailing slash removed).
 */
export function normalizeOrigin(rawOrigin: string): string {
  const cleaned = (rawOrigin || '').trim().replace(/\/$/, '');
  if (!cleaned) return cleaned;
  try {
    const url = new URL(cleaned);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (CANONICAL_HOSTS.has(host)) return CANONICAL_SITE_URL;
    return cleaned;
  } catch {
    return cleaned;
  }
}

/**
 * Resolves the request origin from env or forwarded headers and normalizes it to
 * the canonical site. Falls back to localhost in dev and the canonical site in prod.
 */
export function getRequestOrigin(request: Request): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (env) return normalizeOrigin(env);

  const hostHeader = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').trim();
  const host = hostHeader.split(',')[0]?.trim() || '';
  const protoHeader = (request.headers.get('x-forwarded-proto') || '').trim();
  const proto = protoHeader.split(',')[0]?.trim() || '';
  if (host) return normalizeOrigin(`${proto || 'https'}://${host}`);

  const origin = (request.headers.get('origin') || '').trim();
  if (origin) return normalizeOrigin(origin);

  return process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : CANONICAL_SITE_URL;
}
