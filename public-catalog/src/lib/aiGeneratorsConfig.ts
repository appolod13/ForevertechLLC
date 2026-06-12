export type AiGeneratorsConfig = {
  fusion: { enabled: boolean; internalBaseUrl: string; publicBaseUrl: string };
  quantum: { enabled: boolean; internalBaseUrl: string; publicBaseUrl: string };
  timeouts: { stdMs: number; quantumMs: number };
};

type PartialDeep<T> = { [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K] };

// Default to the live Render-hosted fusion-service so image generation works in
// production even when FUSION_SERVICE_URL is not set. A local URL can still be
// provided via env to develop against a local service.
const DEFAULT_FUSION_INTERNAL = "https://fusion-service.onrender.com";
const DEFAULT_QUANTUM_INTERNAL = "http://127.0.0.1:5328";

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function asPositiveInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  return i > 0 ? i : null;
}

function sanitizeHttpUrl(value: unknown, fallback: string): string {
  const s = asNonEmptyString(value);
  if (!s) return fallback;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return fallback;
    return u.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

function initFromEnv(): AiGeneratorsConfig {
  const fusionInternal = sanitizeHttpUrl(process.env.FUSION_SERVICE_URL, DEFAULT_FUSION_INTERNAL);
  const quantumInternal = sanitizeHttpUrl(process.env.AI_IMAGE_GEN_URL, DEFAULT_QUANTUM_INTERNAL);

  const fusionPublic = sanitizeHttpUrl(process.env.NEXT_PUBLIC_FUSION_API_URL, fusionInternal);
  const quantumPublic = sanitizeHttpUrl(process.env.NEXT_PUBLIC_QUANTUM_API_URL, quantumInternal);

  const stdMs = asPositiveInt(process.env.AI_IMAGE_TIMEOUT_STD_MS) ?? 40_000;
  const quantumMs = asPositiveInt(process.env.AI_IMAGE_TIMEOUT_QUANTUM_MS) ?? 60_000;

  return {
    fusion: { enabled: true, internalBaseUrl: fusionInternal, publicBaseUrl: fusionPublic },
    quantum: { enabled: true, internalBaseUrl: quantumInternal, publicBaseUrl: quantumPublic },
    timeouts: { stdMs, quantumMs },
  };
}

function getStore(): AiGeneratorsConfig {
  const g = globalThis as unknown as { __ftAiGeneratorsConfig?: AiGeneratorsConfig };
  if (!g.__ftAiGeneratorsConfig) g.__ftAiGeneratorsConfig = initFromEnv();
  return g.__ftAiGeneratorsConfig;
}

function setStore(next: AiGeneratorsConfig) {
  const g = globalThis as unknown as { __ftAiGeneratorsConfig?: AiGeneratorsConfig };
  g.__ftAiGeneratorsConfig = next;
}

export function getAiGeneratorsConfig(): AiGeneratorsConfig {
  return getStore();
}

export function updateAiGeneratorsConfig(patch: PartialDeep<AiGeneratorsConfig>): AiGeneratorsConfig {
  const cur = getStore();

  const next: AiGeneratorsConfig = {
    fusion: {
      enabled: typeof patch.fusion?.enabled === "boolean" ? patch.fusion.enabled : cur.fusion.enabled,
      internalBaseUrl: sanitizeHttpUrl(patch.fusion?.internalBaseUrl, cur.fusion.internalBaseUrl),
      publicBaseUrl: sanitizeHttpUrl(patch.fusion?.publicBaseUrl, cur.fusion.publicBaseUrl),
    },
    quantum: {
      enabled: typeof patch.quantum?.enabled === "boolean" ? patch.quantum.enabled : cur.quantum.enabled,
      internalBaseUrl: sanitizeHttpUrl(patch.quantum?.internalBaseUrl, cur.quantum.internalBaseUrl),
      publicBaseUrl: sanitizeHttpUrl(patch.quantum?.publicBaseUrl, cur.quantum.publicBaseUrl),
    },
    timeouts: {
      stdMs: asPositiveInt(patch.timeouts?.stdMs) ?? cur.timeouts.stdMs,
      quantumMs: asPositiveInt(patch.timeouts?.quantumMs) ?? cur.timeouts.quantumMs,
    },
  };

  setStore(next);
  return next;
}

export type AiGeneratorsConfigPatch = PartialDeep<AiGeneratorsConfig>;
