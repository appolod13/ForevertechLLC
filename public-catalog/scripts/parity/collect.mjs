import fs from "fs";
import path from "path";
import dns from "dns";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "parity");

dns.setDefaultResultOrder("ipv4first");

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function isRecord(v) {
  return typeof v === "object" && v !== null;
}

async function fetchWithTiming(url, options) {
  const t0 = performance.now();
  const res = await fetch(url, options);
  const t1 = performance.now();
  return { res, ms: t1 - t0 };
}

function pickHeaders(headers, keys) {
  const out = {};
  for (const k of keys) {
    const v = headers.get(k);
    if (v !== null) out[k] = v;
  }
  return out;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

async function sampleLatency({ baseUrl, pathName, method = "GET", body, headers, n = 30, timeoutMs = 8000 }) {
  const samples = [];
  for (let i = 0; i < n; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const { ms } = await fetchWithTiming(`${baseUrl}${pathName}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: controller.signal,
      });
      samples.push(ms);
    } catch {
      samples.push(Number.POSITIVE_INFINITY);
    } finally {
      clearTimeout(timeout);
    }
  }
  const finite = samples.filter((v) => Number.isFinite(v));
  return {
    count: n,
    okCount: finite.length,
    p50Ms: percentile(finite, 50),
    p95Ms: percentile(finite, 95),
    p99Ms: percentile(finite, 99),
  };
}

async function collectOne(name, baseUrl) {
  const result = {
    name,
    baseUrl,
    collectedAt: nowIso(),
    http: {},
    latency: {},
  };

  try {
    const studio = await fetchWithTiming(`${baseUrl}/studio`, { cache: "no-store" });
    const studioText = await studio.res.text();
    result.http.studio = {
      status: studio.res.status,
      headers: pickHeaders(studio.res.headers, [
        "cache-control",
        "content-type",
        "x-nextjs-cache",
        "x-nextjs-prerender",
        "cf-cache-status",
        "server",
      ]),
      containsStudioMarker: studioText.includes("AI Asset Generator") || studioText.includes("Quantum Mode"),
    };
  } catch (e) {
    result.http.studio = { status: 0, error: String(e?.message || e) };
  }

  try {
    const health = await fetchWithTiming(`${baseUrl}/api/health`, { cache: "no-store" });
    result.http.health = {
      status: health.res.status,
      headers: pickHeaders(health.res.headers, ["cache-control", "content-type"]),
    };
  } catch (e) {
    result.http.health = { status: 0, error: String(e?.message || e) };
  }

  try {
    const gen = await fetchWithTiming(`${baseUrl}/api/generate/image`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "parity smoke", width: 1024, height: 1024, quantum_mode: false, ipfs_upload: false }),
      cache: "no-store",
    });
    const genJson = await gen.res.json().catch(() => ({}));
    result.http.generateImage = {
      status: gen.res.status,
      headers: pickHeaders(gen.res.headers, ["cache-control", "content-type"]),
      success: isRecord(genJson) ? Boolean(genJson.success) : false,
    };
  } catch (e) {
    result.http.generateImage = { status: 0, error: String(e?.message || e) };
  }

  result.latency.health = await sampleLatency({ baseUrl, pathName: "/api/health", n: 40, timeoutMs: 3000 });
  result.latency.generateImage = await sampleLatency({
    baseUrl,
    pathName: "/api/generate/image",
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { prompt: "parity latency", width: 1024, height: 1024, quantum_mode: false, ipfs_upload: false },
    n: 20,
    timeoutMs: 12000,
  });

  return result;
}

function toRow(delta) {
  return `| ${delta.area} | ${delta.prod} | ${delta.local} | ${delta.severity} | ${delta.domain} | ${delta.notes} |`;
}

function buildMatrix({ prod, local }) {
  const deltas = [];

  const prodCC = prod.http?.studio?.headers?.["cache-control"] || "";
  const localCC = local.http?.studio?.headers?.["cache-control"] || "";
  if (prodCC !== localCC) {
    deltas.push({
      area: "Caching: /studio Cache-Control",
      prod: prodCC || "(missing)",
      local: localCC || "(missing)",
      severity: "critical",
      domain: "infrastructure/configuration",
      notes: "Prod is cacheable (s-maxage) while local is no-store. This can cause stale Studio UI and runtime behavior mismatches.",
    });
  }

  const prodNextCache = prod.http?.studio?.headers?.["x-nextjs-cache"] || "";
  const localNextCache = local.http?.studio?.headers?.["x-nextjs-cache"] || "";
  if (prodNextCache && prodNextCache !== localNextCache) {
    deltas.push({
      area: "Caching: Next.js cache signal",
      prod: prodNextCache,
      local: localNextCache || "(missing)",
      severity: "major",
      domain: "infrastructure",
      notes: "Prod indicates cached response; local dev does not. Validate headers() config is deployed and purge CDN.",
    });
  }

  const prodStudioMarker = String(prod.http?.studio?.containsStudioMarker);
  const localStudioMarker = String(local.http?.studio?.containsStudioMarker);
  if (prodStudioMarker !== localStudioMarker) {
    deltas.push({
      area: "UI: Studio marker in HTML",
      prod: prodStudioMarker,
      local: localStudioMarker,
      severity: "major",
      domain: "code/rendering",
      notes: "Curl HTML content differs; check client-side rendering and route fallback behavior.",
    });
  }

  const prodHealth = prod.http?.health?.status;
  const localHealth = local.http?.health?.status;
  if (prodHealth !== localHealth) {
    deltas.push({
      area: "API: /api/health status",
      prod: String(prodHealth),
      local: String(localHealth),
      severity: "critical",
      domain: "infrastructure/code",
      notes: "Health mismatch blocks parity testing.",
    });
  }

  const prodGen = prod.http?.generateImage?.status;
  const localGen = local.http?.generateImage?.status;
  if (prodGen !== localGen) {
    deltas.push({
      area: "API: /api/generate/image status",
      prod: String(prodGen),
      local: String(localGen),
      severity: "critical",
      domain: "configuration/third-party",
      notes: "If prod fails but local succeeds, env vars for quantum/ipfs/LLM are missing in container.",
    });
  }

  const prodP95 = prod.latency?.health?.p95Ms ?? null;
  const localP95 = local.latency?.health?.p95Ms ?? null;
  if (prodP95 !== null && localP95 !== null && (prodP95 > localP95 * 2 || prodP95 > 150)) {
    deltas.push({
      area: "Performance: /api/health latency p95",
      prod: `${Math.round(prodP95)}ms`,
      local: `${Math.round(localP95)}ms`,
      severity: "minor",
      domain: "network/infrastructure",
      notes: "Baseline p95 differs; verify TLS/CDN overhead and origin performance.",
    });
  }

  return deltas;
}

function renderReport({ prod, local, deltas }) {
  const header = [
    "# Studio Parity Report",
    "",
    `Generated: ${nowIso()}`,
    "",
    "## Baselines",
    "",
    "```json",
    JSON.stringify({ production: prod, local }, null, 2),
    "```",
    "",
    "## Traceability Matrix",
    "",
    "| Area | Production | Local | Severity | Domain | Notes |",
    "|---|---|---|---|---|---|",
    ...(deltas.length ? deltas.map(toRow) : ["| (none) | (none) | (none) | - | - | No deltas detected by this harness. |"]),
    "",
  ].join("\n");

  return header;
}

async function main() {
  ensureDir(OUT_DIR);

  const localBase = process.env.LOCAL_BASE_URL || "http://127.0.0.1:3001";
  const prodBase = process.env.PROD_BASE_URL || "https://foreverteck.com";

  const prod = await collectOne("production", prodBase);
  const local = await collectOne("local", localBase);

  const deltas = buildMatrix({ prod, local });
  const report = renderReport({ prod, local, deltas });
  fs.writeFileSync(path.join(OUT_DIR, "studio-parity-report.md"), report);
  fs.writeFileSync(path.join(OUT_DIR, "studio-parity-report.json"), JSON.stringify({ prod, local, deltas }, null, 2));

  process.stdout.write(`wrote ${path.join("parity", "studio-parity-report.md")}\n`);
}

main().catch((e) => {
  process.stderr.write(String(e?.stack || e) + "\n");
  process.exit(1);
});
