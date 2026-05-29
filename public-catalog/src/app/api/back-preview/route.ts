import { NextRequest, NextResponse } from "next/server";
import { getPrintifyBackTextConfig, renderBackAbstractPngBuffer, renderBackTextPngBuffer } from "@/lib/printifyBackText";
import sharp from "sharp";
import QRCode from "qrcode";
import path from "path";
import { readFile } from "fs/promises";

export const runtime = "nodejs";

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

function getRequestOrigin(req: NextRequest): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (env) return env.replace(/\/$/, "");

  const hostHeader = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").trim();
  const host = hostHeader.split(",")[0]?.trim() || "";
  const protoHeader = (req.headers.get("x-forwarded-proto") || "").trim();
  const proto = protoHeader.split(",")[0]?.trim() || "";
  if (host) return `${proto || "https"}://${host}`;

  const origin = (req.headers.get("origin") || "").trim();
  if (origin) return origin.replace(/\/$/, "");

  return process.env.NODE_ENV !== "production" ? "http://localhost:3001" : "";
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

  const verificationUrl = "https://www.pixelqrypt.com";
  const centerX = 8 + stampSide / 2;

  const urlFontSize = Math.max(12, Math.min(26, Math.round(stampSide * 0.034)));
  const quantumFontSize = Math.max(18, Math.min(46, Math.round(stampSide * 0.072)));
  const urlY = 8 + stampSide - Math.max(14, Math.round(border * 0.65));
  const quantumY = urlY - Math.round(quantumFontSize * 0.95);

  const labelSvg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${stampSide + 24}" height="${stampSide + 24}">\n  <text x="${centerX}" y="${quantumY}" text-anchor="middle" font-family="Impact, Arial Black, Arial, sans-serif" font-weight="900" font-size="${quantumFontSize}" fill="rgba(255,255,255,0.92)" stroke="rgba(0,0,0,0.45)" stroke-width="${Math.max(2, Math.round(quantumFontSize * 0.06))}" paint-order="stroke">Quantum Verified</text>\n  <text x="${centerX}" y="${urlY}" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-weight="700" font-size="${urlFontSize}" fill="rgba(255,255,255,0.88)" stroke="rgba(0,0,0,0.25)" stroke-width="${Math.max(1, Math.round(urlFontSize * 0.06))}" paint-order="stroke">${verificationUrl}</text>\n</svg>`;

  const out = await sharp({
    create: { width: stampSide + 24, height: stampSide + 24, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: shadow, left: 18, top: 18 },
      { input: frame, left: 8, top: 8 },
      ...(logoFull ? [{ input: logoFull, left: 8 + qrLeft, top: 8 + qrTop }] : []),
      { input: qrModulesOnly, left: 8 + qrLeft, top: 8 + qrTop },
      { input: Buffer.from(labelSvg), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();

  return out;
}

function getBackStyle(raw: string | null): "words" | "abstract" {
  const v = (raw || "").trim().toLowerCase();
  if (v === "words") return "words";
  return "abstract";
}

export async function GET(req: NextRequest) {
  try {
    const cfg = getPrintifyBackTextConfig();
    const origin = getRequestOrigin(req);
    if (!origin) return new NextResponse("Missing site origin", { status: 400 });

    const q = req.nextUrl.searchParams;
    const textRaw = q.get("text") || "CUSTOM";
    const style = getBackStyle(q.get("style"));
    const seedSaltRaw = (q.get("seed") || "").trim().replace(/[^a-z0-9-]/gi, "").slice(0, 128);
    const qrUrl = normalizeCustomerQrUrl(q.get("qrUrl"));

    const backText = sanitizeBannerText(textRaw, cfg.render.maxChars) || "CUSTOM";
    const salted = seedSaltRaw ? { ...cfg, version: `${cfg.version}|${seedSaltRaw}` } : cfg;

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

    const targetUrl = qrUrl || (() => {
      const u = new URL("/pixelqrypt", origin);
      u.searchParams.set("src", "shirt");
      return u.toString();
    })();

    const stamp = await buildQrStampPng({ url: targetUrl, stampSide, backgroundColor: cfg.render.backgroundColor });
    const basePng = style === "abstract" ? await renderBackAbstractPngBuffer(backText, salted) : await renderBackTextPngBuffer(backText, salted);

    const out = await sharp(basePng)
      .composite([{ input: stamp, left, top }])
      .extract({ left: bgX, top: bgY, width: bgW, height: bgH })
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(out), {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e || "unknown_error");
    return new NextResponse(msg, { status: 500 });
  }
}
