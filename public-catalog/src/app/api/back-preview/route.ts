import { NextRequest, NextResponse } from "next/server";
import { getPrintifyBackTextConfig, renderBackAbstractPngBuffer, renderBackTextPngBuffer } from "@/lib/printifyBackText";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import sharp from "sharp";
import QRCode from "qrcode";
import path from "path";
import { readFile } from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function sanitizeBannerText(text: string, maxChars = 96): string {
  const t = (text || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim();
  return t.slice(0, Math.max(1, maxChars));
}

function sanitizeCustomerBackText(text: string, maxChars = 64): string {
  const t = (text || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^A-Za-z0-9 .,'"!?:;@#&()/-]/g, "")
    .trim();
  return t.slice(0, Math.max(0, maxChars));
}

type VectorGlyph = { adv: number; strokes: Array<Array<[number, number]>> };

const VECTOR_GLYPHS: Record<string, VectorGlyph> = {
  " ": { adv: 0.55, strokes: [] },
  ".": { adv: 0.4, strokes: [[[0.2, 0.92], [0.2, 0.96]]] },
  "-": { adv: 0.6, strokes: [[[0.05, 0.55], [0.95, 0.55]]] },
  "/": { adv: 0.7, strokes: [[[0.05, 0.98], [0.95, 0.02]]] },
  ":": { adv: 0.4, strokes: [[[0.2, 0.35], [0.2, 0.39]], [[0.2, 0.75], [0.2, 0.79]]] },
  "'": { adv: 0.35, strokes: [[[0.2, 0.05], [0.2, 0.25]]] },
  "0": { adv: 1.0, strokes: [[[0.2, 0.1], [0.8, 0.1], [1, 0.3], [1, 0.7], [0.8, 0.9], [0.2, 0.9], [0, 0.7], [0, 0.3], [0.2, 0.1]]] },
  "1": { adv: 0.75, strokes: [[[0.4, 0.2], [0.6, 0.1], [0.6, 0.9]], [[0.35, 0.9], [0.85, 0.9]]] },
  "2": { adv: 1.0, strokes: [[[0.1, 0.25], [0.2, 0.1], [0.8, 0.1], [1, 0.25], [0.1, 0.9], [1, 0.9]]] },
  "3": { adv: 1.0, strokes: [[[0.15, 0.15], [0.85, 0.15], [0.6, 0.5], [0.85, 0.85], [0.15, 0.85]]] },
  "4": { adv: 1.0, strokes: [[[0.85, 0.1], [0.85, 0.9]], [[0.1, 0.55], [0.95, 0.55]], [[0.1, 0.55], [0.7, 0.1]]] },
  "5": { adv: 1.0, strokes: [[[0.95, 0.1], [0.15, 0.1], [0.15, 0.5], [0.8, 0.5], [1, 0.7], [0.8, 0.9], [0.15, 0.9]]] },
  "6": { adv: 1.0, strokes: [[[0.9, 0.15], [0.25, 0.15], [0.05, 0.35], [0.05, 0.75], [0.25, 0.9], [0.8, 0.9], [1, 0.75], [0.8, 0.6], [0.2, 0.6]]] },
  "7": { adv: 1.0, strokes: [[[0.05, 0.1], [0.95, 0.1], [0.3, 0.9]]] },
  "8": { adv: 1.0, strokes: [[[0.25, 0.1], [0.75, 0.1], [0.95, 0.3], [0.75, 0.5], [0.25, 0.5], [0.05, 0.3], [0.25, 0.1]], [[0.25, 0.5], [0.75, 0.5], [0.95, 0.7], [0.75, 0.9], [0.25, 0.9], [0.05, 0.7], [0.25, 0.5]]] },
  "9": { adv: 1.0, strokes: [[[0.8, 0.4], [0.2, 0.4], [0, 0.25], [0.2, 0.1], [0.8, 0.1], [1, 0.25], [1, 0.65], [0.8, 0.9], [0.2, 0.9]]] },
  A: { adv: 1.0, strokes: [[[0, 1], [0.5, 0], [1, 1]], [[0.2, 0.6], [0.8, 0.6]]] },
  B: { adv: 1.0, strokes: [[[0, 0], [0, 1]], [[0, 0], [0.75, 0.1], [0.75, 0.45], [0, 0.5]], [[0, 0.5], [0.75, 0.55], [0.75, 0.9], [0, 1]]] },
  C: { adv: 1.0, strokes: [[[0.9, 0.1], [0.2, 0.1], [0, 0.3], [0, 0.7], [0.2, 0.9], [0.9, 0.9]]] },
  D: { adv: 1.0, strokes: [[[0, 0], [0, 1], [0.7, 0.85], [0.95, 0.5], [0.7, 0.15], [0, 0]]] },
  E: { adv: 1.0, strokes: [[[0.9, 0.1], [0, 0.1], [0, 0.9], [0.9, 0.9]], [[0, 0.5], [0.7, 0.5]]] },
  F: { adv: 1.0, strokes: [[[0.9, 0.1], [0, 0.1], [0, 0.9]], [[0, 0.5], [0.7, 0.5]]] },
  G: { adv: 1.0, strokes: [[[0.9, 0.1], [0.2, 0.1], [0, 0.3], [0, 0.7], [0.2, 0.9], [0.9, 0.9], [0.9, 0.6], [0.55, 0.6]]] },
  H: { adv: 1.0, strokes: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]] },
  I: { adv: 0.9, strokes: [[[0, 0.1], [1, 0.1]], [[0.5, 0.1], [0.5, 0.9]], [[0, 0.9], [1, 0.9]]] },
  J: { adv: 1.0, strokes: [[[0, 0.1], [1, 0.1]], [[1, 0.1], [1, 0.75], [0.8, 0.95], [0.2, 0.95], [0, 0.75]]] },
  K: { adv: 1.0, strokes: [[[0, 0], [0, 1]], [[1, 0], [0, 0.55], [1, 1]]] },
  L: { adv: 1.0, strokes: [[[0, 0.1], [0, 0.9], [1, 0.9]]] },
  M: { adv: 1.15, strokes: [[[0, 1], [0, 0], [0.5, 0.6], [1, 0], [1, 1]]] },
  N: { adv: 1.05, strokes: [[[0, 1], [0, 0], [1, 1], [1, 0]]] },
  O: { adv: 1.0, strokes: [[[0.2, 0.1], [0.8, 0.1], [1, 0.3], [1, 0.7], [0.8, 0.9], [0.2, 0.9], [0, 0.7], [0, 0.3], [0.2, 0.1]]] },
  P: { adv: 1.0, strokes: [[[0, 1], [0, 0], [0.8, 0.05], [1, 0.25], [0.8, 0.45], [0, 0.45]]] },
  Q: { adv: 1.0, strokes: [[[0.2, 0.1], [0.8, 0.1], [1, 0.3], [1, 0.7], [0.8, 0.9], [0.2, 0.9], [0, 0.7], [0, 0.3], [0.2, 0.1]], [[0.6, 0.6], [1, 1]]] },
  R: { adv: 1.0, strokes: [[[0, 1], [0, 0], [0.8, 0.05], [1, 0.25], [0.8, 0.45], [0, 0.45]], [[0, 0.45], [1, 1]]] },
  S: { adv: 1.0, strokes: [[[1, 0.2], [0.8, 0.05], [0.2, 0.05], [0, 0.25], [0.2, 0.45], [0.8, 0.55], [1, 0.75], [0.8, 0.95], [0.2, 0.95], [0, 0.8]]] },
  T: { adv: 1.0, strokes: [[[0, 0.1], [1, 0.1]], [[0.5, 0.1], [0.5, 1]]] },
  U: { adv: 1.0, strokes: [[[0, 0.1], [0, 0.75], [0.2, 0.95], [0.8, 0.95], [1, 0.75], [1, 0.1]]] },
  V: { adv: 1.0, strokes: [[[0, 0.1], [0.5, 1], [1, 0.1]]] },
  W: { adv: 1.25, strokes: [[[0, 0.1], [0.25, 1], [0.5, 0.6], [0.75, 1], [1, 0.1]]] },
  X: { adv: 1.0, strokes: [[[0, 0.1], [1, 0.95]], [[1, 0.1], [0, 0.95]]] },
  Y: { adv: 1.0, strokes: [[[0, 0.1], [0.5, 0.55], [1, 0.1]], [[0.5, 0.55], [0.5, 1]]] },
  Z: { adv: 1.0, strokes: [[[0, 0.1], [1, 0.1], [0, 0.95], [1, 0.95]]] },
};

function normalizeVectorText(input: string) {
  return (input || "")
    .toUpperCase()
    .split("")
    .map((c) => (VECTOR_GLYPHS[c] ? c : " "))
    .join("");
}

function measureVectorTextWidth(text: string, size: number, tracking: number) {
  const t = normalizeVectorText(text);
  let w = 0;
  for (let i = 0; i < t.length; i++) {
    const g = VECTOR_GLYPHS[t[i]!] || VECTOR_GLYPHS[" "]!;
    w += g.adv * size;
    if (i !== t.length - 1) w += tracking * size;
  }
  return w;
}

function strokeVectorText(params: {
  ctx: any;
  text: string;
  x: number;
  y: number;
  size: number;
  tracking: number;
  lineWidth: number;
  strokeStyle: string;
}) {
  const { ctx } = params;
  const t = normalizeVectorText(params.text);
  let penX = params.x;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.strokeStyle = params.strokeStyle;
  ctx.lineWidth = Math.max(1, params.lineWidth);

  for (let i = 0; i < t.length; i++) {
    const ch = t[i]!;
    const g = VECTOR_GLYPHS[ch] || VECTOR_GLYPHS[" "]!;
    for (const stroke of g.strokes) {
      if (!stroke.length) continue;
      ctx.beginPath();
      const [x0, y0] = stroke[0]!;
      ctx.moveTo(penX + x0 * params.size, params.y + y0 * params.size);
      for (let j = 1; j < stroke.length; j++) {
        const [px, py] = stroke[j]!;
        ctx.lineTo(penX + px * params.size, params.y + py * params.size);
      }
      ctx.stroke();
    }
    penX += g.adv * params.size + params.tracking * params.size;
  }

  ctx.restore();
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
  const base = await sharp({
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

  const img = await loadImage(base);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const centerX = 8 + stampSide / 2;
  const urlFontSize = Math.max(12, Math.min(26, Math.round(stampSide * 0.034)));
  const quantumFontSize = Math.max(18, Math.min(46, Math.round(stampSide * 0.072)));
  const urlY = 8 + stampSide - Math.max(14, Math.round(border * 0.65));
  const quantumY = urlY - Math.round(quantumFontSize * 0.95);

  const label1 = "Quantum Verified";
  const label2 = verificationUrl;
  const track1 = 0.06;
  const track2 = 0.04;
  const yQuantumTop = quantumY - quantumFontSize;
  const yUrlTop = urlY - urlFontSize;

  ctx.save();
  ctx.globalAlpha = 0.96;
  const w1 = measureVectorTextWidth(label1, quantumFontSize, track1);
  strokeVectorText({
    ctx,
    text: label1,
    x: centerX - w1 / 2,
    y: yQuantumTop,
    size: quantumFontSize,
    tracking: track1,
    lineWidth: Math.max(2, Math.round(quantumFontSize * 0.22)),
    strokeStyle: "rgba(0,0,0,0.55)",
  });
  strokeVectorText({
    ctx,
    text: label1,
    x: centerX - w1 / 2,
    y: yQuantumTop,
    size: quantumFontSize,
    tracking: track1,
    lineWidth: Math.max(1, Math.round(quantumFontSize * 0.14)),
    strokeStyle: "rgba(255,255,255,0.92)",
  });

  const w2 = measureVectorTextWidth(label2, urlFontSize, track2);
  strokeVectorText({
    ctx,
    text: label2,
    x: centerX - w2 / 2,
    y: yUrlTop,
    size: urlFontSize,
    tracking: track2,
    lineWidth: Math.max(1, Math.round(urlFontSize * 0.18)),
    strokeStyle: "rgba(0,0,0,0.35)",
  });
  strokeVectorText({
    ctx,
    text: label2,
    x: centerX - w2 / 2,
    y: yUrlTop,
    size: urlFontSize,
    tracking: track2,
    lineWidth: Math.max(1, Math.round(urlFontSize * 0.12)),
    strokeStyle: "rgba(255,255,255,0.86)",
  });
  ctx.restore();

  return canvas.toBuffer("image/png");
}

async function buildTopTextOverlayPng(params: { panelW: number; panelH: number; text: string }) {
  const panelW = Math.max(360, Math.trunc(params.panelW));
  const panelH = Math.max(600, Math.trunc(params.panelH));
  const text = sanitizeCustomerBackText(params.text || "", 64);
  if (!text) return null;

  const canvas = createCanvas(panelW, panelH);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, panelW, panelH);

  const paddingX = Math.max(12, Math.round(panelW * 0.02));
  const y = Math.max(18, Math.round(panelH * 0.04));
  const maxW = Math.max(120, panelW - paddingX * 2);

  const tracking = 0.08;
  let size = Math.max(58, Math.min(220, Math.round(panelW * 0.12)));
  let w = measureVectorTextWidth(text, size, tracking);
  let fit = maxW / Math.max(1, w);
  for (let i = 0; i < 12; i++) {
    if (fit >= 0.9 || size <= 36) break;
    size = Math.max(36, Math.floor(size * 0.93));
    w = measureVectorTextWidth(text, size, tracking);
    fit = maxW / Math.max(1, w);
  }

  const scaleX = Math.max(0.7, Math.min(3.6, fit));
  const scaleY = 1.18;

  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.translate(panelW / 2, y);
  ctx.scale(scaleX, scaleY);
  strokeVectorText({
    ctx,
    text,
    x: -w / 2,
    y: 0,
    size,
    tracking,
    lineWidth: Math.max(2, Math.round(size * 0.22)) / Math.max(scaleX, scaleY),
    strokeStyle: "rgba(0,0,0,0.62)",
  });
  strokeVectorText({
    ctx,
    text,
    x: -w / 2,
    y: 0,
    size,
    tracking,
    lineWidth: Math.max(1, Math.round(size * 0.14)) / Math.max(scaleX, scaleY),
    strokeStyle: "rgba(255,255,255,0.96)",
  });
  ctx.restore();

  return canvas.toBuffer("image/png");
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
    const customerText = sanitizeCustomerBackText(q.get("customerText") || "", 64);

    const backText = sanitizeBannerText(textRaw, cfg.render.maxChars) || "CUSTOM";
    const salted = seedSaltRaw ? { ...cfg, version: `${cfg.version}|${seedSaltRaw}` } : cfg;

    const r = cfg.render;
    const width = r.width;
    const height = r.height;
    const bgW = Math.min(r.bgW, width);
    const bgH = Math.min(r.bgH, height);
    const bgX = Math.floor((width - bgW) / 2);
    const bgY = Math.floor((height - bgH) / 2);

    const panelW = bgW;
    const panelH = bgH;

    const stampSide = Math.max(420, Math.min(680, Math.round(panelW * 0.34)));
    const margin = Math.max(36, Math.round(panelW * 0.04));
    const left = Math.max(0, panelW - stampSide - margin);
    const top = Math.max(0, panelH - stampSide - margin);

    const targetUrl = qrUrl || (() => {
      const u = new URL("/pixelqrypt", origin);
      u.searchParams.set("src", "shirt");
      return u.toString();
    })();

    const stamp = await buildQrStampPng({ url: targetUrl, stampSide, backgroundColor: cfg.render.backgroundColor });
    const baseFull = style === "abstract" ? await renderBackAbstractPngBuffer(backText, salted) : await renderBackTextPngBuffer(backText, salted);
    const basePanel = await sharp(baseFull).extract({ left: bgX, top: bgY, width: bgW, height: bgH }).png().toBuffer();
    const customerHeaderOverlay = customerText ? await buildTopTextOverlayPng({ panelW, panelH, text: customerText }) : null;

    const out = await sharp(basePanel)
      .composite([
        ...(customerHeaderOverlay ? [{ input: customerHeaderOverlay, left: 0, top: 0 }] : []),
        { input: stamp, left, top },
      ])
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(out), {
      status: 200,
      headers: {
        "content-type": "image/png",
        "cache-control": "private, no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate",
        "cdn-cache-control": "no-store",
        "surrogate-control": "no-store",
        pragma: "no-cache",
        expires: "0",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e || "unknown_error");
    return new NextResponse(msg, { status: 500 });
  }
}
