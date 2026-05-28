import { test, expect } from "@playwright/test";
import { createHash } from "crypto";

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
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

test.describe("Printify Sample", () => {
  test("creates two shirt sample products with abstract back", async ({ request }) => {
    test.skip(process.env.PRINTIFY_E2E !== "1", "Set PRINTIFY_E2E=1 to run live Printify sample creation.");
    test.skip(test.info().project.name !== "Chromium", "Run live Printify sample creation only once (Chromium).");

    const baseURL = test.info().project.use.baseURL;
    expect(baseURL).toBeTruthy();
    const origin = String(baseURL);

    const samples = [
      {
        prompt: "diamond hypercube fractal, dimensional gem, crisp lines",
        seedSalt: "e2e-printify-sample-diamond-1",
        label: "PRINTIFY_PRODUCT_URL_1",
      },
      {
        prompt: "turtle shell scutes, sacred geometry, bold black lines, futuristic",
        seedSalt: "e2e-printify-sample-turtle-2",
        label: "PRINTIFY_PRODUCT_URL_2",
      },
    ];

    for (const s of samples) {
      const res = await request.post("/api/admin/printify-back-text", {
        headers: { origin },
        data: {
          createProductSample: true,
          origin,
          prompt: s.prompt,
          text: "CUSTOM FUTURE TECH",
          backStyle: "abstract",
          seedSalt: s.seedSalt,
        },
      });

      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      expect(json?.success).toBe(true);
      expect(json?.data?.shopId).toBeTruthy();
      expect(json?.data?.productId).toBeTruthy();
      console.log(s.label, `https://printify.com/app/store/${json.data.shopId}/products/${json.data.productId}`);
    }
  });

  test("creates a shirt sample product with WORDS back + QR stamp (customer preview)", async ({ request }) => {
    test.skip(process.env.PRINTIFY_E2E !== "1", "Set PRINTIFY_E2E=1 to run live Printify sample creation.");
    test.skip(test.info().project.name !== "Chromium", "Run live Printify sample creation only once (Chromium).");
    test.setTimeout(180_000);

    const baseURL = test.info().project.use.baseURL;
    expect(baseURL).toBeTruthy();
    const origin = String(baseURL);

    const nowTag = Date.now().toString(36);
    const prompt = `customer sample ${nowTag}: julia + mandelbrot fusion, hypercube lattice, bold black linework, high contrast, print-ready`;
    const text = `PIXELQRYPT VERIFIED ${nowTag}`.toUpperCase();

    const res = await request.post("/api/admin/printify-back-text", {
      headers: { origin },
      data: {
        createProductSample: true,
        origin,
        prompt,
        text,
        backStyle: "words",
        seedSalt: `e2e-printify-customer-${nowTag}`,
      },
    });

    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json?.success).toBe(true);
    expect(json?.data?.shopId).toBeTruthy();
    expect(json?.data?.productId).toBeTruthy();
    expect(json?.data?.backStyle).toBe("words");

    console.log("PRINTIFY_CUSTOMER_PROMPT", prompt);
    console.log("PRINTIFY_CUSTOMER_BACK_TEXT", json?.data?.backText || text);
    console.log("PRINTIFY_CUSTOMER_FRONT_UPLOAD_PREVIEW", json?.data?.frontUploadUrl);
    console.log("PRINTIFY_CUSTOMER_BACK_UPLOAD_PREVIEW", json?.data?.backUploadUrl);
    console.log(
      "PRINTIFY_PRODUCT_URL_CUSTOMER",
      `https://printify.com/app/store/${json.data.shopId}/products/${json.data.productId}`,
    );
  });

  test("creates a shirt sample product with updated verification stamp (Pixel Crypted + QV square + pixelqrypt url)", async ({ request }) => {
    test.skip(process.env.PRINTIFY_E2E !== "1", "Set PRINTIFY_E2E=1 to run live Printify sample creation.");
    test.skip(test.info().project.name !== "Chromium", "Run live Printify sample creation only once (Chromium).");
    test.setTimeout(180_000);

    const baseURL = test.info().project.use.baseURL;
    expect(baseURL).toBeTruthy();
    const origin = String(baseURL);

    const nowTag = Date.now().toString(36);
    const prompt = `pixel-crypted stamp sample ${nowTag}: julia + mandelbrot fusion, crystal lattice, bold black linework, high contrast, print-ready`;
    const text = `PIXELQRYPT VERIFIED ${nowTag}`.toUpperCase();

    const res = await request.post("/api/admin/printify-back-text", {
      headers: { origin },
      data: {
        createProductSample: true,
        origin,
        prompt,
        text,
        backStyle: "words",
        seedSalt: `e2e-printify-pixel-crypted-${nowTag}`,
      },
    });

    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json?.success).toBe(true);
    expect(json?.data?.shopId).toBeTruthy();
    expect(json?.data?.productId).toBeTruthy();

    console.log("PRINTIFY_PIXEL_CRYPTED_PROMPT", prompt);
    console.log("PRINTIFY_PIXEL_CRYPTED_BACK_TEXT", json?.data?.backText || text);
    console.log("PRINTIFY_PIXEL_CRYPTED_FRONT_UPLOAD_PREVIEW", json?.data?.frontUploadUrl);
    console.log("PRINTIFY_PIXEL_CRYPTED_BACK_UPLOAD_PREVIEW", json?.data?.backUploadUrl);
    console.log(
      "PRINTIFY_PRODUCT_URL_PIXEL_CRYPTED",
      `https://printify.com/app/store/${json.data.shopId}/products/${json.data.productId}`,
    );
  });

  test("creates a shirt sample product seeded from real IBM quantum job", async ({ request }) => {
    test.skip(process.env.PRINTIFY_E2E !== "1", "Set PRINTIFY_E2E=1 to run live Printify sample creation.");
    test.skip(process.env.REAL_QUANTUM_E2E !== "1", "Set REAL_QUANTUM_E2E=1 to run the real IBM quantum seed + Printify test.");
    test.skip(test.info().project.name !== "Chromium", "Run live Printify sample creation only once (Chromium).");
    test.setTimeout(180_000);

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

    const orderId = `e2e-printify-real-quantum-${Date.now()}`;
    const seedRes = await request.post(seedServiceBase.replace(/\/$/, "") + "/seed", {
      headers,
      data: { orderId, purpose: "seed" },
    });
    expect(seedRes.ok()).toBeTruthy();
    const seedJson = await seedRes.json();
    expect(seedJson?.success).toBe(true);
    const proof = seedJson?.data || seedJson;
    const jobId = asNonEmptyString(proof?.jobId) || "";
    const backend = asNonEmptyString(proof?.backend) || "";
    const seed = asNonEmptyString(proof?.seed) || "";
    expect(jobId).toBeTruthy();
    expect(backend).toBeTruthy();
    expect(seed).toBeTruthy();

    const seedSalt = quantumSeedSalt(seed);
    expect(seedSalt).toMatch(/^ibm-[a-f0-9]{24}$/);

    const prompt = "qiskit + wolfram rule CA + julia+mandelbrot fusion, hypercube diamond, bold black linework, high contrast";
    const res = await request.post("/api/admin/printify-back-text", {
      headers: { origin },
      data: {
        createProductSample: true,
        origin,
        prompt,
        text: "QUANTUM VERIFIED",
        backStyle: "abstract",
        seedSalt,
      },
    });

    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json?.success).toBe(true);
    expect(json?.data?.shopId).toBeTruthy();
    expect(json?.data?.productId).toBeTruthy();
    console.log("REAL_QUANTUM_IBM_JOB", jobId);
    console.log("REAL_QUANTUM_IBM_BACKEND", backend);
    console.log("PRINTIFY_SAMPLE_SEED_SALT", seedSalt);
    console.log("PRINTIFY_SAMPLE_QF_ENGINE", json?.data?.quantumMeta?.qf_quantum_engine || "(missing)");
    console.log("PRINTIFY_PRODUCT_URL_REAL_QUANTUM", `https://printify.com/app/store/${json.data.shopId}/products/${json.data.productId}`);
  });
});
