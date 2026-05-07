import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getPrintifyBackTextConfig, renderBackAbstractPngBuffer, renderBackTextPngBuffer, resetPrintifyBackTextConfig, updatePrintifyBackTextConfig, type PrintifyBackTextConfigPatch } from "@/lib/printifyBackText";
import { getAiGeneratorsConfig } from "@/lib/aiGeneratorsConfig";
import sharp from "sharp";
import QRCode from "qrcode";
import path from "path";
import { readFile } from "fs/promises";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isSameOrigin(req: NextRequest): boolean {
  const host = (req.headers.get("host") || "").trim();
  const origin = (req.headers.get("origin") || "").trim();
  if (!host || !origin) return false;
  return origin === `https://${host}` || origin === `http://${host}`;
}

function sanitizeBannerText(text: string, maxChars = 96): string {
  const t = (text || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim();
  return t.slice(0, Math.max(1, maxChars));
}

function normalizeCustomerQrUrl(input: unknown): string {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return "";
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return "";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return "";
  const href = u.toString();
  return href.length > 350 ? href.slice(0, 350) : href;
}

function getBackStyle(input: unknown): "words" | "abstract" {
  const raw = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (raw === "abstract") return "abstract";
  const env = (process.env.PRINTIFY_BACK_STYLE || "").trim().toLowerCase();
  if (env === "abstract") return "abstract";
  return "words";
}

function clampByte(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex(rgb: { r: number; g: number; b: number }) {
  const to2 = (v: number) => clampByte(v).toString(16).padStart(2, "0");
  return `#${to2(rgb.r)}${to2(rgb.g)}${to2(rgb.b)}`;
}

function parseColorToRgb(input: string): { r: number; g: number; b: number } | null {
  const s = (input || "").trim();
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].toLowerCase();
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return { r, g, b };
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r, g, b };
  }

  const rgb = s.match(/^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(?:\s*,\s*([0-9.]+)\s*)?\)$/i);
  if (rgb) {
    return { r: clampByte(Number(rgb[1])), g: clampByte(Number(rgb[2])), b: clampByte(Number(rgb[3])) };
  }

  return null;
}

async function removeExactColorToAlpha(params: { input: Buffer; rgb: { r: number; g: number; b: number } }) {
  const { data, info } = await sharp(params.input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const r0 = clampByte(params.rgb.r);
  const g0 = clampByte(params.rgb.g);
  const b0 = clampByte(params.rgb.b);
  for (let i = 0; i < out.length; i += info.channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (r === r0 && g === g0 && b === b0) out[i + 3] = 0;
  }
  return sharp(out, { raw: info }).png().toBuffer();
}

async function removeNearWhiteToAlpha(input: Buffer) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += info.channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max >= 252 && max - min <= 8) out[i + 3] = 0;
  }
  return sharp(out, { raw: info }).png().toBuffer();
}

let cachedForevertechLogoJpg: Buffer | null | undefined;

async function getForevertechLogoJpg(): Promise<Buffer | null> {
  if (cachedForevertechLogoJpg !== undefined) return cachedForevertechLogoJpg;
  try {
    const p = path.join(process.cwd(), "public", "images", "Forevertech_logo.jpg");
    cachedForevertechLogoJpg = await readFile(p);
    return cachedForevertechLogoJpg;
  } catch {
    cachedForevertechLogoJpg = null;
    return null;
  }
}

function buildBackQrTargetUrl(origin: string, bannerText: string, qrUrl?: string) {
  const custom = normalizeCustomerQrUrl(qrUrl);
  if (custom) return custom;
  const clean = (sanitizeBannerText(bannerText) || "CUSTOM").toUpperCase();
  const u = new URL("/studio", origin);
  u.searchParams.set("back", clean);
  u.searchParams.set("src", "shirt");
  return u.toString();
}

async function buildQrStampPng(params: { url: string; stampSide: number; backgroundColor?: string }) {
  const stampSide = Math.max(220, Math.trunc(params.stampSide));
  const qrSide = Math.max(160, stampSide - 72);
  const logoJpg = await getForevertechLogoJpg();
  const bgRgb = parseColorToRgb(params.backgroundColor || "") || { r: 255, g: 31, b: 93 };
  const bgHex = rgbToHex(bgRgb);
  const qrFull = await QRCode.toBuffer(params.url, {
    errorCorrectionLevel: "H",
    width: qrSide,
    margin: 2,
    color: { dark: "#26000f", light: bgHex },
  });

  const qrModulesOnly = await removeExactColorToAlpha({ input: qrFull, rgb: bgRgb });

  const border = Math.max(12, Math.round(stampSide * 0.04));
  const corner = Math.max(18, Math.round(stampSide * 0.14));

  const stampBg = await sharp({
    create: {
      width: stampSide,
      height: stampSide,
      channels: 4,
      background: { r: bgRgb.r, g: bgRgb.g, b: bgRgb.b, alpha: 0.98 },
    },
  })
    .png()
    .toBuffer();

  const frame = await sharp(stampBg)
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${stampSide}" height="${stampSide}"><rect x="${border / 2}" y="${border / 2}" width="${stampSide - border}" height="${stampSide - border}" rx="${corner}" ry="${corner}" fill="rgba(255,255,255,0)" stroke="rgba(255,255,255,0.22)" stroke-width="${Math.max(2, Math.round(border * 0.22))}"/></svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();

  const qrLeft = Math.floor((stampSide - qrSide) / 2);
  const qrTop = Math.floor((stampSide - qrSide) / 2);

  let logoFull: Buffer | null = null;
  if (logoJpg) {
    const logoSized = await sharp(logoJpg)
      .resize(qrSide, qrSide, { fit: "contain", withoutEnlargement: true, background: { r: bgRgb.r, g: bgRgb.g, b: bgRgb.b, alpha: 0 } })
      .png()
      .toBuffer();
    logoFull = await removeNearWhiteToAlpha(logoSized);
  }

  const shadow = await sharp({
    create: {
      width: stampSide,
      height: stampSide,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${stampSide}" height="${stampSide}"><rect x="${border}" y="${border}" width="${stampSide - border * 2}" height="${stampSide - border * 2}" rx="${corner}" ry="${corner}" fill="rgba(0,0,0,0.32)"/></svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .blur(Math.max(6, Math.round(stampSide * 0.03)))
    .png()
    .toBuffer();

  const out = await sharp({
    create: { width: stampSide + 24, height: stampSide + 24, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: shadow, left: 18, top: 18 },
      { input: frame, left: 8, top: 8 },
      ...(logoFull ? [{ input: logoFull, left: 8 + qrLeft, top: 8 + qrTop }] : []),
      { input: qrModulesOnly, left: 8 + qrLeft, top: 8 + qrTop },
    ])
    .png()
    .toBuffer();

  return out;
}

async function renderBackQrStampBase64(params: { origin: string; text: string; backStyle: "words" | "abstract"; seedSalt?: string; qrUrl?: string }) {
  const cfg = getPrintifyBackTextConfig();
  const clean = sanitizeBannerText(params.text, cfg.render.maxChars) || "CUSTOM";
  const salted = params.seedSalt ? { ...cfg, version: `${cfg.version}|${params.seedSalt}` } : cfg;

  const r = cfg.render;
  const width = r.width;
  const height = r.height;
  const bgW = Math.min(r.bgW, width);
  const bgH = Math.min(r.bgH, height);
  const bgX = Math.floor((width - bgW) / 2);
  const bgY = Math.floor((height - bgH) / 2);

  const stampSide = Math.max(420, Math.min(680, Math.round(bgW * 0.34)));
  const margin = Math.max(36, Math.round(bgW * 0.04));
  const left = Math.max(0, bgX + bgW - stampSide - margin);
  const top = Math.max(0, bgY + bgH - stampSide - margin);

  const targetUrl = buildBackQrTargetUrl(params.origin, clean, params.qrUrl);
  const stamp = await buildQrStampPng({ url: targetUrl, stampSide, backgroundColor: cfg.render.backgroundColor });

  const basePng = params.backStyle === "abstract" ? await renderBackAbstractPngBuffer(clean, salted) : await renderBackTextPngBuffer(clean, salted);

  const out = await sharp(basePng)
    .composite([{ input: stamp, left, top }])
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
    .toBuffer();

  return out.toString("base64");
}

async function uploadImageToPrintify(fileName: string, base64Contents: string) {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) throw new Error("Missing PRINTIFY_API_TOKEN");

  const res = await fetch("https://api.printify.com/v1/uploads/images.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "public-catalog",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      file_name: fileName,
      contents: base64Contents,
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Printify API error (${res.status}): ${text}`);
  const json: unknown = text ? JSON.parse(text) : null;
  if (!isRecord(json) || typeof json.preview_url !== "string") throw new Error("Printify upload did not return preview_url");
  const id = getString(json.id);
  if (!id) throw new Error("Printify upload did not return id");
  return { id, previewUrl: json.preview_url as string };
}

async function printifyFetch(pathname: string, init?: RequestInit) {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) throw new Error("Missing PRINTIFY_API_TOKEN");
  const res = await fetch(`https://api.printify.com${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "public-catalog",
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Printify API error (${res.status}): ${text}`);
  return text ? (JSON.parse(text) as unknown) : null;
}

function getString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function getNumber(value: unknown) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : NaN;
}

type PrintifyTemplateVariant = { id?: unknown; sku?: unknown };
type PrintifyTemplatePlaceholderImage = { x?: unknown; y?: unknown; scale?: unknown; angle?: unknown };
type PrintifyTemplatePlaceholder = { position?: unknown; images?: unknown };
type PrintifyTemplatePrintArea = { variant_ids?: unknown; placeholders?: unknown };
type PrintifyTemplateProduct = { id?: unknown; title?: unknown; blueprint_id?: unknown; print_provider_id?: unknown; variants?: unknown; print_areas?: unknown };

async function getTemplateProduct(shopId: string): Promise<PrintifyTemplateProduct> {
  const templateProductId = (process.env.PRINTIFY_TEMPLATE_PRODUCT_ID || "").trim();
  if (templateProductId) {
    const p = (await printifyFetch(`/v1/shops/${shopId}/products/${templateProductId}.json`)) as unknown;
    if (isRecord(p)) return p as PrintifyTemplateProduct;
    throw new Error("Printify template product fetch failed");
  }

  const listed = (await printifyFetch(`/v1/shops/${shopId}/products.json?page=1&limit=20`)) as unknown;
  const data = isRecord(listed) && Array.isArray(listed.data) ? listed.data : [];
  const first = data.find((x) => isRecord(x) && typeof x.id !== "undefined") as unknown;
  if (!isRecord(first) || !first.id) throw new Error("No Printify products found to use as template");
  const id = String(first.id);
  const p = (await printifyFetch(`/v1/shops/${shopId}/products/${id}.json`)) as unknown;
  if (isRecord(p)) return p as PrintifyTemplateProduct;
  throw new Error("Printify template product fetch failed");
}

function placementScore(pos: string, want: "front" | "back") {
  const p = pos.toLowerCase();
  const w = want.toLowerCase();
  if (p === w) return 100;
  if (p.includes(w)) return 80;
  if (want === "front" && p.includes("chest")) return 70;
  if (want === "back" && p.includes("rear")) return 70;
  return 0;
}

function pickPlaceholderPosition(positions: string[], want: "front" | "back") {
  let best = positions[0] || "";
  let bestScore = -1;
  for (const p of positions) {
    const s = placementScore(p, want);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}

function getTransformFromTemplate(template: PrintifyTemplateProduct, variantId: number, placementKey: string) {
  const printAreasRaw = template.print_areas;
  if (!Array.isArray(printAreasRaw)) return { x: 0.5, y: 0.5, scale: 0.8, angle: 0 };
  for (const pa of printAreasRaw as PrintifyTemplatePrintArea[]) {
    if (!isRecord(pa)) continue;
    const ids = Array.isArray(pa.variant_ids) ? (pa.variant_ids as unknown[]) : [];
    if (!ids.some((id) => getNumber(id) === variantId)) continue;
    const placeholders = Array.isArray(pa.placeholders) ? (pa.placeholders as unknown[]) : [];
    for (const ph of placeholders as PrintifyTemplatePlaceholder[]) {
      if (!isRecord(ph)) continue;
      if (getString(ph.position) !== placementKey) continue;
      const images = Array.isArray(ph.images) ? (ph.images as unknown[]) : [];
      const first = images.find((x) => isRecord(x)) as PrintifyTemplatePlaceholderImage | undefined;
      const x = getNumber(first?.x);
      const y = getNumber(first?.y);
      const scale = getNumber(first?.scale);
      const angle = getNumber(first?.angle);
      return {
        x: Number.isFinite(x) ? x : 0.5,
        y: Number.isFinite(y) ? y : 0.5,
        scale: Number.isFinite(scale) ? scale : 0.8,
        angle: Number.isFinite(angle) ? angle : 0,
      };
    }
  }
  return { x: 0.5, y: 0.5, scale: 0.8, angle: 0 };
}

function getVariantIds(template: PrintifyTemplateProduct) {
  const variantsRaw = template.variants;
  if (!Array.isArray(variantsRaw)) throw new Error("Printify template product is missing variants");
  const ids: number[] = [];
  for (const v of variantsRaw as PrintifyTemplateVariant[]) {
    if (!isRecord(v)) continue;
    const id = getNumber(v.id);
    if (Number.isFinite(id)) ids.push(id);
  }
  if (!ids.length) throw new Error("No variants found on template product");
  return ids;
}

function getAllPlaceholderPositions(template: PrintifyTemplateProduct, variantId: number) {
  const printAreasRaw = template.print_areas;
  if (!Array.isArray(printAreasRaw)) return [];
  for (const pa of printAreasRaw as PrintifyTemplatePrintArea[]) {
    if (!isRecord(pa)) continue;
    const ids = Array.isArray(pa.variant_ids) ? (pa.variant_ids as unknown[]) : [];
    if (!ids.some((id) => getNumber(id) === variantId)) continue;
    const placeholders = Array.isArray(pa.placeholders) ? (pa.placeholders as unknown[]) : [];
    const positions: string[] = [];
    for (const ph of placeholders as PrintifyTemplatePlaceholder[]) {
      if (!isRecord(ph)) continue;
      const pos = getString(ph.position);
      if (pos) positions.push(pos);
    }
    return positions;
  }
  return [];
}

async function fetchAsBase64(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: HTTP_${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab).toString("base64");
}

async function generateQuantumImageUrl(params: { prompt: string; width: number; height: number }) {
  const cfg = getAiGeneratorsConfig();
  const base = (cfg.quantum.internalBaseUrl || "http://127.0.0.1:5328").replace(/\/$/, "");
  const url = `${base}/v1/images/generations`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: params.prompt, width: params.width, height: params.height, steps: 30, quantum_mode: true, ipfs_upload: false }),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok || !isRecord(json) || json.success !== true) {
    const err = isRecord(json) && typeof json.error === "string" ? json.error : `HTTP_${res.status}`;
    throw new Error(`quantum_generate_failed:${err}`);
  }
  const imageUrl = typeof json.imageUrl === "string" ? json.imageUrl : "";
  if (!imageUrl) throw new Error("quantum_generate_missing_imageUrl");
  return imageUrl.startsWith("/") ? `${base}${imageUrl}` : imageUrl;
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, data: { config: getPrintifyBackTextConfig() } }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as unknown));
  const b = body as { reset?: unknown; uploadSample?: unknown; createProductSample?: unknown; text?: unknown; origin?: unknown; prompt?: unknown; backStyle?: unknown; seedSalt?: unknown; qrUrl?: unknown };

  if (b && b.uploadSample === true) {
    const auth = requireAdmin(req);
    const devBypass = process.env.NODE_ENV !== "production" && isSameOrigin(req);
    if (!auth.ok && !devBypass) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
    try {
      const cfg = getPrintifyBackTextConfig();
      const originRaw = typeof b.origin === "string" && b.origin.trim() ? b.origin.trim() : "";
      const origin = originRaw || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
      const textRaw = typeof b.text === "string" ? b.text : "CUSTOM FUTURE TECH";
      const clean = sanitizeBannerText(textRaw, cfg.render.maxChars) || "CUSTOM";
      const backStyle = getBackStyle(b.backStyle);
      const qrUrl = normalizeCustomerQrUrl(b.qrUrl);
      const saltRaw = typeof b.seedSalt === "string" ? b.seedSalt.trim() : "";
      const seedSalt =
        saltRaw.replace(/[^a-z0-9]/gi, "").slice(0, 48) ||
        (backStyle === "abstract" ? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.replace(/[^a-z0-9]/gi, "").slice(0, 48) : "");
      const base64 = await renderBackQrStampBase64({ origin, text: clean, backStyle, seedSalt: seedSalt || undefined, qrUrl: qrUrl || undefined });
      const fileSafe = clean.replace(/\s+/g, "-").replace(/[^A-Za-z0-9-]/g, "").slice(0, 48) || "CUSTOM";
      const tag = Date.now().toString(36);
      const saltTag = seedSalt ? `-${seedSalt.slice(0, 10)}` : "";
      const uploaded = await uploadImageToPrintify(`back-qr-stamp-sample-${cfg.version}${saltTag}-${fileSafe}-${tag}.png`, base64);
      const previewUrl = uploaded.previewUrl;
      return NextResponse.json({ success: true, data: { previewUrl, origin, text: clean, backStyle, seedSalt: seedSalt || undefined, qrUrl: qrUrl || undefined } }, { status: 200 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e || "unknown_error");
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  if (b && b.createProductSample === true) {
    const auth = requireAdmin(req);
    const devBypass = process.env.NODE_ENV !== "production" && isSameOrigin(req);
    if (!auth.ok && !devBypass) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
    try {
      const shopId = (process.env.PRINTIFY_SHOP_ID || "").trim();
      if (!shopId) throw new Error("Missing PRINTIFY_SHOP_ID");

      const originRaw = typeof b.origin === "string" && b.origin.trim() ? b.origin.trim() : "";
      const origin = originRaw || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

      const cfg = getPrintifyBackTextConfig();
      const textRaw = typeof b.text === "string" ? b.text : "CUSTOM FUTURE TECH";
      const backText = sanitizeBannerText(textRaw, cfg.render.maxChars) || "CUSTOM";
      const backStyle = getBackStyle(b.backStyle);
      const qrUrl = normalizeCustomerQrUrl(b.qrUrl);

      const promptRaw = typeof b.prompt === "string" && b.prompt.trim() ? b.prompt.trim() : "Cinematic FUTURE CITY megacity skyline at golden hour, zeta pattern, ultra-detailed, photoreal lighting";
      const quantumImageUrl = await generateQuantumImageUrl({ prompt: promptRaw, width: 1024, height: 1024 });
      const frontBase64 = await fetchAsBase64(quantumImageUrl);

      const seedSalt = (typeof b.seedSalt === "string" ? b.seedSalt.trim().replace(/[^a-z0-9]/gi, "").slice(0, 48) : "") || Date.now().toString(36);
      const backBase64 = await renderBackQrStampBase64({ origin, text: backText, backStyle, seedSalt, qrUrl: qrUrl || undefined });

      const nowTag = Date.now().toString(36);
      const frontUploaded = await uploadImageToPrintify(`sample-front-${nowTag}.png`, frontBase64);
      const backUploaded = await uploadImageToPrintify(`sample-back-${nowTag}.png`, backBase64);

      const template = await getTemplateProduct(shopId);
      const blueprintId = getNumber(template.blueprint_id);
      const printProviderId = getNumber(template.print_provider_id);
      if (!Number.isFinite(blueprintId) || !Number.isFinite(printProviderId)) throw new Error("Template product missing blueprint_id/print_provider_id");

      const variantIds = getVariantIds(template);
      const primaryVariantId = variantIds[0];
      const positions = getAllPlaceholderPositions(template, primaryVariantId);
      const frontPos = pickPlaceholderPosition(positions, "front") || "front";
      const backPos = pickPlaceholderPosition(positions, "back") || "back";

      const frontTransform = getTransformFromTemplate(template, primaryVariantId, frontPos);
      const backTransform = getTransformFromTemplate(template, primaryVariantId, backPos);

      const title = `Quantum Sample ${nowTag}`.slice(0, 60);
      const bodyPayload = {
        title,
        description: `Auto-generated sample (quantum/Wolfram)\\nPrompt: ${promptRaw}`.slice(0, 500),
        blueprint_id: blueprintId,
        print_provider_id: printProviderId,
        variants: variantIds.slice(0, 50).map((id) => ({ id, price: 4999, is_enabled: true })),
        print_areas: [
          {
            variant_ids: variantIds.slice(0, 50),
            placeholders: [
              {
                position: frontPos,
                images: [{ id: frontUploaded.id, x: frontTransform.x, y: frontTransform.y, scale: frontTransform.scale, angle: frontTransform.angle }],
              },
              {
                position: backPos,
                images: [{ id: backUploaded.id, x: backTransform.x, y: backTransform.y, scale: backTransform.scale, angle: backTransform.angle }],
              },
            ],
          },
        ],
      };

      const created = (await printifyFetch(`/v1/shops/${shopId}/products.json`, {
        method: "POST",
        body: JSON.stringify(bodyPayload),
      })) as unknown;

      const id = isRecord(created) ? getString(created.id) : "";
      return NextResponse.json(
        {
          success: true,
          data: {
            productId: id,
            title,
            shopId,
            frontUploadUrl: frontUploaded.previewUrl,
            backUploadUrl: backUploaded.previewUrl,
            quantumImageUrl,
            backText,
            prompt: promptRaw,
            backStyle,
            positions: { front: frontPos, back: backPos },
          },
        },
        { status: 200 },
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e || "unknown_error");
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  const auth = requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

  const config = b && b.reset === true ? resetPrintifyBackTextConfig() : updatePrintifyBackTextConfig(body as PrintifyBackTextConfigPatch);
  return NextResponse.json({ success: true, data: { config } }, { status: 200 });
}
