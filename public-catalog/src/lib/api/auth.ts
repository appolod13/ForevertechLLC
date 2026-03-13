export function getApiKey(headers: Headers): string | null {
  const auth = headers.get("authorization") || headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  const key = headers.get("x-api-key") || headers.get("X-API-Key");
  return key?.trim() || null;
}

export function validateApiKey(key: string | null): boolean {
  const required = (process.env.PUBLIC_CATALOG_API_KEY || "").trim();
  if (!required) return true; // if not set, allow local/dev calls
  return key === required;
}
