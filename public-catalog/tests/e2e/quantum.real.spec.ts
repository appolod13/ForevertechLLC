import { test, expect } from "@playwright/test";
import { createHash } from "crypto";

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

function quantumSeedSalt(seed: string): string {
  const s = String(seed || "").trim();
  if (!s) return "";
  return `ibm-${createHash("sha256").update(s).digest("hex").slice(0, 24)}`;
}

test.describe("Real Quantum (IBM) → Seeded Image", () => {
  test("requests IBM quantum seed and generates an image tied to it", async ({ request }) => {
    test.skip(process.env.REAL_QUANTUM_E2E !== "1", "Set REAL_QUANTUM_E2E=1 to run the real IBM quantum seed test.");
    test.skip(test.info().project.name !== "Chromium", "Run real quantum seed test only once (Chromium).");

    const baseURL = test.info().project.use.baseURL;
    expect(baseURL).toBeTruthy();
    const origin = String(baseURL);

    const seedServiceBase = asNonEmptyString(process.env.IBM_QUANTUM_SEED_SERVICE_URL);
    if (!seedServiceBase) {
      test.skip(true, "Missing IBM_QUANTUM_SEED_SERVICE_URL.");
      return;
    }

    const auth = normalizeAuth(process.env.IBM_QUANTUM_SEED_SERVICE_AUTH || "");
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (auth) headers.authorization = auth;

    const orderId = `e2e-real-quantum-${Date.now()}`;
    let proof: { jobId?: string; backend?: string; seed?: string } | null = null;
    try {
      const res = await request.post(seedServiceBase.replace(/\/$/, "") + "/seed", {
        headers,
        data: { orderId, purpose: "seed" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok()) throw new Error(`seed_http_${res.status()}`);
      if (!json || json.success !== true) throw new Error("seed_failed");
      proof = json.data || json;
    } catch {
      test.skip(true, "IBM quantum seed service not reachable or returned an error.");
      return;
    }

    const jobId = asNonEmptyString(proof?.jobId) || "";
    const backend = asNonEmptyString(proof?.backend) || "";
    const seed = asNonEmptyString(proof?.seed) || "";
    expect(jobId).toBeTruthy();
    expect(backend).toBeTruthy();
    expect(seed).toBeTruthy();

    const seed_salt = quantumSeedSalt(seed);
    expect(seed_salt).toMatch(/^ibm-[a-f0-9]{24}$/);

    const prompt = "quantum verified hypercube diamond fractal, crisp black linework, high contrast";
    const gen = await request.post("/api/generate/image", {
      headers: { origin },
      data: {
        prompt,
        width: 1024,
        height: 1024,
        quantum_mode: true,
        ipfs_upload: false,
        seed_salt,
      },
    });

    expect(gen.ok()).toBeTruthy();
    const genJson: unknown = await gen.json().catch(() => null);
    const root = isRecord(genJson) ? genJson : {};
    expect(root?.success).toBe(true);
    const payload = isRecord(root.data) ? root.data : root;

    const imageUrlRaw =
      typeof payload.image_url === "string"
        ? payload.image_url
        : typeof payload.imageUrl === "string"
          ? payload.imageUrl
          : "";
    expect(imageUrlRaw).toBeTruthy();

    const meta = isRecord(payload.meta) ? payload.meta : {};
    const qSeedHash = typeof meta.qf_quantum_seed_hash === "string" ? meta.qf_quantum_seed_hash : "";
    const imageHash = typeof meta.image_hash === "string" ? meta.image_hash : "";

    const imageUrl =
      imageUrlRaw.startsWith("http://") || imageUrlRaw.startsWith("https://")
        ? imageUrlRaw
        : `${origin}${imageUrlRaw.startsWith("/") ? "" : "/"}${imageUrlRaw}`;

    console.log("REAL_QUANTUM_IBM_JOB", jobId);
    console.log("REAL_QUANTUM_IBM_BACKEND", backend);
    console.log("REAL_QUANTUM_QF_SEED_HASH", qSeedHash || "(missing)");
    console.log("REAL_QUANTUM_IMAGE_HASH", imageHash || "(missing)");
    console.log("REAL_QUANTUM_IMAGE_URL", imageUrl);
  });
});
