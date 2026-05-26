export type QuantumStatus = { available: boolean; provider: "ibm" | "disabled"; reason?: string };

export type QuantumProof = {
  provider: "ibm";
  jobId: string;
  backend: string;
  seed: string;
  shots?: number;
  createdAt: string;
};

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeAuth(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(bearer|basic)\s/i.test(trimmed)) return trimmed;
  return `Bearer ${trimmed}`;
}

export function getQuantumStatus(): QuantumStatus {
  const url = asNonEmptyString(process.env.IBM_QUANTUM_SEED_SERVICE_URL);
  if (!url) return { available: false, provider: "disabled", reason: "missing_IBM_QUANTUM_SEED_SERVICE_URL" };
  return { available: true, provider: "ibm" };
}

export async function requestIbmQuantumProof(params: { orderId: string; purpose: "seed"; timeoutMs: number }): Promise<QuantumProof> {
  const url = asNonEmptyString(process.env.IBM_QUANTUM_SEED_SERVICE_URL);
  if (!url) throw new Error("quantum_disabled");

  const auth = normalizeAuth(process.env.IBM_QUANTUM_SEED_SERVICE_AUTH || "");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) headers.authorization = auth;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, params.timeoutMs));
  try {
    const res = await fetch(url.replace(/\/$/, "") + "/seed", {
      method: "POST",
      headers,
      body: JSON.stringify({ orderId: params.orderId, purpose: params.purpose }),
      cache: "no-store",
      signal: controller.signal,
    });

    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`quantum_http_${res.status}`);

    const r = isRecord(json) ? json : {};
    if (r.success !== true) throw new Error(typeof r.error === "string" ? r.error : "quantum_failed");
    const data = isRecord(r.data) ? (r.data as Record<string, unknown>) : {};

    const jobId = asNonEmptyString(data.jobId) || asNonEmptyString(r.jobId) || "";
    const backend = asNonEmptyString(data.backend) || asNonEmptyString(r.backend) || "";
    const seed = asNonEmptyString(data.seed) || asNonEmptyString(r.seed) || "";
    const createdAt = asNonEmptyString(data.createdAt) || new Date().toISOString();
    const shots = typeof data.shots === "number" ? data.shots : undefined;

    if (!jobId || !backend || !seed) throw new Error("quantum_invalid_response");

    return { provider: "ibm", jobId, backend, seed, shots, createdAt };
  } finally {
    clearTimeout(timer);
  }
}

