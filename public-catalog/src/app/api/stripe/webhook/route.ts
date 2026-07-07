import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { addOrder, clearCart, getCart, type OrderLineItem, type OrderRecord } from '@/lib/cartStore';
import { getPrintifyBackTextConfig, renderBackAbstractPngBuffer, renderBackTextPngBuffer } from '@/lib/printifyBackText';
import { requestIbmQuantumProof, type QuantumProof } from '@/lib/quantumVerified';
import { getAiGeneratorsConfig } from '@/lib/aiGeneratorsConfig';
import { expandAopPlacementKeys, resolveTemplateProductIdForItem } from '@/lib/printifyProductMode';
import { getServiceSupabase } from '@/lib/supabase';
import sharp from 'sharp';
import QRCode from 'qrcode';
import path from 'path';
import { readFile } from 'fs/promises';
import { createHash } from 'crypto';
import { createCanvas, loadImage } from '@napi-rs/canvas';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(secretKey);
}

type PrintifyAddressTo = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
};

type PrintifyPrintAreaInfo = {
  src: string;
  x: number;
  y: number;
  scale: number;
  angle: number;
};

type PrintifyLineItem = {
  print_provider_id: number;
  blueprint_id: number;
  variant_id: number;
  quantity: number;
  print_areas: Record<string, PrintifyPrintAreaInfo[]>;
  external_id?: string;
};

type CartItem = {
  id?: string;
  quantity?: number;
  size?: string;
  imageUrl?: string;
  image?: string;
  metadata?: Record<string, unknown>;
};

type PrintifyItemMeta = {
  sku?: unknown;
  blueprintId?: unknown;
  printProviderId?: unknown;
  variantId?: unknown;
  placementKey?: unknown;
};

type PrintifyTemplateVariant = {
  id?: unknown;
  sku?: unknown;
};

type PrintifyTemplatePlaceholderImage = {
  x?: unknown;
  y?: unknown;
  scale?: unknown;
  angle?: unknown;
};

type PrintifyTemplatePlaceholder = {
  position?: unknown;
  images?: unknown;
};

type PrintifyTemplatePrintArea = {
  variant_ids?: unknown;
  placeholders?: unknown;
};

type PrintifyTemplateProduct = {
  blueprint_id?: unknown;
  print_provider_id?: unknown;
  variants?: unknown;
  print_areas?: unknown;
};

let cachedTemplateProductId: string | undefined;
const cachedTemplateProducts = new Map<string, PrintifyTemplateProduct>();
let cachedLogoPreviewUrl: string | undefined;
let cachedLogoPreviewUrlAt = 0;
const cachedBackWordPreviewUrls = new Map<string, { url: string; at: number }>();
let cachedForevertechLogoJpg: Buffer | null | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const PROMPT_STOPWORDS = new Set([
  'a','an','the','and','or','but','with','without','to','of','in','on','for','from','by','at','as','is','are','was','were','be','been','being',
  'this','that','these','those','it','its','your','my','our','their','you','me','we','they','them','i',
  'image','design','shirt','tshirt','tee','print','graphic','art','logo','text','words','watermark','high','quality','ultra','hd','4k','8k'
]);

const PROMPT_STYLEWORDS = new Set([
  'neon','cinematic','futuristic','cyberpunk','sci','scifi','sci-fi','photoreal','photorealistic','realistic','render','rendered',
  'rainy','foggy','moody','dramatic','wide','closeup','close-up','portrait','landscape','macro','bokeh','volumetric','lighting','haze',
  'ultra','high','quality','detailed','detail','sharp','8k','4k','hd'
]);

function sanitizeKeyword(word: string): string {
  const w = (word || '').trim().replace(/[^A-Za-z0-9]/g, '');
  return w.slice(0, 18);
}

function sanitizeBannerText(text: string): string {
  const t = (text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim();
  return t.slice(0, 96);
}

function sanitizeCustomerBackText(text: string): string {
  const t = (text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Za-z0-9 .,'"!?:;@#&()/-]/g, '')
    .trim();
  return t.slice(0, 64);
}

type VectorGlyph = { adv: number; strokes: Array<Array<[number, number]>> };
type VectorCanvasContext = {
  save: () => void;
  restore: () => void;
  beginPath: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  stroke: () => void;
  lineCap: string;
  lineJoin: string;
  miterLimit: number;
  strokeStyle: unknown;
  lineWidth: number;
};

const VECTOR_GLYPHS: Record<string, VectorGlyph> = {
  ' ': { adv: 0.55, strokes: [] },
  '.': { adv: 0.4, strokes: [[[0.2, 0.92], [0.2, 0.96]]] },
  '-': { adv: 0.6, strokes: [[[0.05, 0.55], [0.95, 0.55]]] },
  '/': { adv: 0.7, strokes: [[[0.05, 0.98], [0.95, 0.02]]] },
  ':': { adv: 0.4, strokes: [[[0.2, 0.35], [0.2, 0.39]], [[0.2, 0.75], [0.2, 0.79]]] },
  "'": { adv: 0.35, strokes: [[[0.2, 0.05], [0.2, 0.25]]] },
  '0': { adv: 1.0, strokes: [[[0.2, 0.1], [0.8, 0.1], [1, 0.3], [1, 0.7], [0.8, 0.9], [0.2, 0.9], [0, 0.7], [0, 0.3], [0.2, 0.1]]] },
  '1': { adv: 0.75, strokes: [[[0.4, 0.2], [0.6, 0.1], [0.6, 0.9]], [[0.35, 0.9], [0.85, 0.9]]] },
  '2': { adv: 1.0, strokes: [[[0.1, 0.25], [0.2, 0.1], [0.8, 0.1], [1, 0.25], [0.1, 0.9], [1, 0.9]]] },
  '3': { adv: 1.0, strokes: [[[0.15, 0.15], [0.85, 0.15], [0.6, 0.5], [0.85, 0.85], [0.15, 0.85]]] },
  '4': { adv: 1.0, strokes: [[[0.85, 0.1], [0.85, 0.9]], [[0.1, 0.55], [0.95, 0.55]], [[0.1, 0.55], [0.7, 0.1]]] },
  '5': { adv: 1.0, strokes: [[[0.95, 0.1], [0.15, 0.1], [0.15, 0.5], [0.8, 0.5], [1, 0.7], [0.8, 0.9], [0.15, 0.9]]] },
  '6': { adv: 1.0, strokes: [[[0.9, 0.15], [0.25, 0.15], [0.05, 0.35], [0.05, 0.75], [0.25, 0.9], [0.8, 0.9], [1, 0.75], [0.8, 0.6], [0.2, 0.6]]] },
  '7': { adv: 1.0, strokes: [[[0.05, 0.1], [0.95, 0.1], [0.3, 0.9]]] },
  '8': { adv: 1.0, strokes: [[[0.25, 0.1], [0.75, 0.1], [0.95, 0.3], [0.75, 0.5], [0.25, 0.5], [0.05, 0.3], [0.25, 0.1]], [[0.25, 0.5], [0.75, 0.5], [0.95, 0.7], [0.75, 0.9], [0.25, 0.9], [0.05, 0.7], [0.25, 0.5]]] },
  '9': { adv: 1.0, strokes: [[[0.8, 0.4], [0.2, 0.4], [0, 0.25], [0.2, 0.1], [0.8, 0.1], [1, 0.25], [1, 0.65], [0.8, 0.9], [0.2, 0.9]]] },
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
  return (input || '')
    .toUpperCase()
    .split('')
    .map((c) => (VECTOR_GLYPHS[c] ? c : ' '))
    .join('');
}

function measureVectorTextWidth(text: string, size: number, tracking: number) {
  const t = normalizeVectorText(text);
  let w = 0;
  for (let i = 0; i < t.length; i++) {
    const g = VECTOR_GLYPHS[t[i]!] || VECTOR_GLYPHS[' ']!;
    w += g.adv * size;
    if (i !== t.length - 1) w += tracking * size;
  }
  return w;
}

function strokeVectorText(params: {
  ctx: VectorCanvasContext;
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
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = params.strokeStyle;
  ctx.lineWidth = Math.max(1, params.lineWidth);

  for (let i = 0; i < t.length; i++) {
    const ch = t[i]!;
    const g = VECTOR_GLYPHS[ch] || VECTOR_GLYPHS[' ']!;
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
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return '';
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return '';
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
  const href = u.toString();
  return href.length > 350 ? href.slice(0, 350) : href;
}

function fnv1a32Hex(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function buildBackSeedSalt(params: { sessionId: string; itemId: string; imageUrl: string; quantumSeed?: string | null }) {
  const s = `${params.sessionId}|${params.itemId}|${params.imageUrl}|${params.quantumSeed || ''}`;
  return fnv1a32Hex(s);
}

function quantumSeedSalt(seed: string): string {
  const s = String(seed || '').trim();
  if (!s) return '';
  return `ibm-${createHash('sha256').update(s).digest('hex').slice(0, 24)}`;
}

async function generateQuantumFrontImageUrl(params: { prompt: string; quantumSeed: string }): Promise<{
  url: string;
  meta: { seed_salt?: string; qf_quantum_seed_hash?: string; image_hash?: string; derived_prompt?: string };
} | null> {
  const prompt = (params.prompt || '').trim();
  const quantumSeed = (params.quantumSeed || '').trim();
  if (!prompt || !quantumSeed) return null;

  const cfg = getAiGeneratorsConfig();
  if (!cfg.quantum.enabled) return null;
  const base = cfg.quantum.internalBaseUrl.trim().replace(/\/$/, '');
  if (!base) return null;

  const url = `${base}/v1/images/generations`;
  const timeoutMs = Math.max(1, cfg.timeouts.quantumMs);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const seed_salt = quantumSeedSalt(quantumSeed);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, width: 1024, height: 1024, steps: 30, quantum_mode: true, ipfs_upload: false, seed_salt }),
      cache: 'no-store',
      signal: controller.signal,
    });
    const json: unknown = await res.json().catch(() => null);
    const r = isRecord(json) ? json : {};
    if (!res.ok || r.success !== true) return null;
    const imageUrlRaw = typeof r.imageUrl === 'string' ? r.imageUrl.trim() : '';
    if (!imageUrlRaw) return null;
    const metaRaw = isRecord(r.meta) ? (r.meta as Record<string, unknown>) : {};
    const outMeta = {
      seed_salt: typeof metaRaw.seed_salt === 'string' ? metaRaw.seed_salt : seed_salt,
      qf_quantum_seed_hash: typeof metaRaw.qf_quantum_seed_hash === 'string' ? metaRaw.qf_quantum_seed_hash : undefined,
      image_hash: typeof metaRaw.image_hash === 'string' ? metaRaw.image_hash : undefined,
      derived_prompt: typeof metaRaw.derived_prompt === 'string' ? metaRaw.derived_prompt : undefined,
    };

    let finalUrl = imageUrlRaw;
    if (!(finalUrl.startsWith('http://') || finalUrl.startsWith('https://'))) {
      if (finalUrl.startsWith('/')) finalUrl = `${base}${finalUrl}`;
      else finalUrl = `${base}/${finalUrl}`;
    }

    return { url: finalUrl, meta: outMeta };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function titleCaseWord(word: string): string {
  const w = (word || '').trim();
  if (!w) return '';
  return w.slice(0, 1).toUpperCase() + w.slice(1);
}

function summarizePromptToOneWord(prompt: string): string {
  const p = (prompt || '').toLowerCase();
  const tokens = p.match(/[a-z0-9]+/g) || [];
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (PROMPT_STOPWORDS.has(t)) continue;
    if (PROMPT_STYLEWORDS.has(t)) continue;
    return t.slice(0, 24);
  }

  const counts = new Map<string, number>();

  for (const t of tokens) {
    if (t.length < 3) continue;
    if (PROMPT_STOPWORDS.has(t)) continue;
    counts.set(t, (counts.get(t) || 0) + 1);
  }

  let best = '';
  let bestScore = -1;
  for (const [t, c] of counts.entries()) {
    const score = c * 100 + Math.min(t.length, 24);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  const fallback = tokens.find((t) => t.length >= 3) || 'custom';
  return (best || fallback).slice(0, 24);
}

function promptFromCartItem(item: CartItem, metadata: Record<string, unknown>): string {
  const direct = (item as unknown as { originalPrompt?: unknown }).originalPrompt;
  if (typeof direct === 'string' && direct.trim()) return direct;
  const mp = metadata['originalPrompt'] ?? metadata['prompt'] ?? metadata['title'];
  if (typeof mp === 'string' && mp.trim()) return mp;
  if (mp) {
    try {
      return JSON.stringify(mp);
    } catch {
      return String(mp);
    }
  }
  return '';
}

function keywordFromCartItem(item: CartItem, metadata: Record<string, unknown>): string {
  const prompt = promptFromCartItem(item, metadata);
  const one = titleCaseWord(summarizePromptToOneWord(prompt));
  return one || 'Custom';
}

function summarizePromptToBannerText(prompt: string): string {
  const p = (prompt || '').toLowerCase();
  const tokens = p.match(/[a-z0-9]+/g) || [];
  const words: string[] = [];
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (PROMPT_STOPWORDS.has(t)) continue;
    if (PROMPT_STYLEWORDS.has(t)) continue;
    words.push(t.slice(0, 12));
    if (words.length >= 12) break;
  }
  if (!words.length) {
    const one = summarizePromptToOneWord(prompt);
    return one || 'CUSTOM';
  }
  return words.join(' ');
}

function bannerTextFromCartItem(item: CartItem, metadata: Record<string, unknown>): string {
  const cfg = getPrintifyBackTextConfig();
  if (cfg.textMode === 'custom' && cfg.customText.trim()) {
    const clean = sanitizeBannerText(cfg.customText) || 'CUSTOM';
    return clean.toUpperCase();
  }
  const prompt = promptFromCartItem(item, metadata);
  const phrase = summarizePromptToBannerText(prompt);
  return phrase ? phrase.toUpperCase() : 'CUSTOM';
}

function customerBackTextFromCartItem(metadata: Record<string, unknown>): string {
  const raw = metadata['backCustomerText'];
  return typeof raw === 'string' ? sanitizeCustomerBackText(raw) : '';
}

function customerBackImageFromCartItem(metadata: Record<string, unknown>): string {
  const raw = metadata['backImageDataUrl'];
  if (typeof raw !== 'string') return '';
  const v = raw.trim();
  if (!v.startsWith('data:image/')) return '';
  return v.length > 1_500_000 ? '' : v;
}

async function buildCustomerBackImageOverlayPng(params: {
  bgX: number;
  bgY: number;
  bgW: number;
  bgH: number;
  dataUrl: string;
}) {
  const dataUrl = String(params.dataUrl || '').trim();
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
  if (dataUrl.length > 1_500_000) return null;

  const match = dataUrl.match(/^data:([A-Za-z0-9+./-]+);base64,(.+)$/);
  if (!match || match.length < 3) return null;
  const mime = match[1] || '';
  if (!mime.startsWith('image/')) return null;
  const b64 = match[2] || '';
  if (!b64) return null;

  let input: Buffer;
  try {
    input = Buffer.from(b64, 'base64');
  } catch {
    return null;
  }

  const bgX = Math.max(0, Math.trunc(params.bgX));
  const bgY = Math.max(0, Math.trunc(params.bgY));
  const bgW = Math.max(1, Math.trunc(params.bgW));
  const bgH = Math.max(1, Math.trunc(params.bgH));

  const boxX = bgX + Math.max(18, Math.round(bgW * 0.06));
  const boxY = bgY + Math.max(22, Math.round(bgH * 0.14));
  const boxW = Math.max(64, Math.round(bgW * 0.72));
  const boxH = Math.max(64, Math.round(bgH * 0.66));

  const resizedBuf = await sharp(input)
    .rotate()
    .resize({
      width: boxW,
      height: boxH,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const meta = await sharp(resizedBuf).metadata();
  const w = typeof meta.width === 'number' && Number.isFinite(meta.width) ? meta.width : 0;
  const h = typeof meta.height === 'number' && Number.isFinite(meta.height) ? meta.height : 0;
  if (w <= 0 || h <= 0) return null;

  const left = boxX + Math.max(0, Math.round((boxW - w) / 2));
  const top = boxY + Math.max(0, Math.round((boxH - h) / 2));

  return { input: resizedBuf, left, top };
}

async function buildCustomerBackTextOverlayPng(params: { width: number; height: number; bgX: number; bgY: number; bgW: number; bgH: number; text: string }) {
  const text = sanitizeCustomerBackText(params.text || '');
  if (!text) return null;

  const width = Math.max(64, Math.trunc(params.width));
  const height = Math.max(64, Math.trunc(params.height));
  const bgX = Math.max(0, Math.trunc(params.bgX));
  const bgY = Math.max(0, Math.trunc(params.bgY));
  const bgW = Math.max(1, Math.trunc(params.bgW));
  const bgH = Math.max(1, Math.trunc(params.bgH));

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);

  const x = bgX + bgW / 2;
  const y = bgY + Math.max(18, Math.round(bgH * 0.04));
  const paddingX = Math.max(18, Math.round(bgW * 0.06));
  const maxW = Math.max(120, bgW - paddingX * 2);
  const tracking = 0.08;
  let size = Math.max(58, Math.min(220, Math.round(bgW * 0.12)));
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
  ctx.globalAlpha = 0.92;
  ctx.translate(x, y);
  ctx.scale(scaleX, scaleY);
  strokeVectorText({
    ctx,
    text,
    x: -w / 2,
    y: 0,
    size,
    tracking,
    lineWidth: Math.max(2, Math.round(size * 0.28)) / Math.max(scaleX, scaleY),
    strokeStyle: 'rgba(0,0,0,0.70)',
  });
  strokeVectorText({
    ctx,
    text,
    x: -w / 2,
    y: 0,
    size,
    tracking,
    lineWidth: Math.max(1, Math.round(size * 0.19)) / Math.max(scaleX, scaleY),
    strokeStyle: 'rgba(255,255,255,0.96)',
  });
  ctx.restore();

  return canvas.toBuffer('image/png');
}

async function renderBackBannerBase64(text: string, seedSalt?: string) {
  const cfg = getPrintifyBackTextConfig();
  const clean = sanitizeBannerText(text) || 'CUSTOM';
  const salted = seedSalt ? { ...cfg, version: `${cfg.version}|${seedSalt}` } : cfg;
  const png = await renderBackTextPngBuffer(clean, salted);

  return png.toString('base64');
}

async function renderBackAbstractBase64(seedText: string, seedSalt?: string) {
  const cfg = getPrintifyBackTextConfig();
  const clean = sanitizeBannerText(seedText) || 'CUSTOM';
  const salted = seedSalt ? { ...cfg, version: `${cfg.version}|${seedSalt}` } : cfg;
  const png = await renderBackAbstractPngBuffer(clean, salted);
  return png.toString('base64');
}

function getBackMode(): 'collage' | 'qr_stamp' {
  const raw = (process.env.PRINTIFY_BACK_MODE || '').trim().toLowerCase();
  if (raw === 'collage') return 'collage';
  return 'qr_stamp';
}

function getBackStyle(): 'words' | 'abstract' {
  const raw = (process.env.PRINTIFY_BACK_STYLE || '').trim().toLowerCase();
  if (raw === 'abstract') return 'abstract';
  return 'abstract';
}

function buildBackQrTargetUrl(origin: string, bannerText: string, qrUrl?: string, qrDisabled?: boolean) {
  if (qrDisabled) return '';
  const custom = normalizeCustomerQrUrl(qrUrl);
  if (custom) return custom;
  const clean = (sanitizeBannerText(bannerText) || 'CUSTOM').toUpperCase();
  const u = new URL('/studio', origin);
  u.searchParams.set('back', clean);
  u.searchParams.set('src', 'shirt');
  return u.toString();
}

function clampByte(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex(rgb: { r: number; g: number; b: number }) {
  const to2 = (v: number) => clampByte(v).toString(16).padStart(2, '0');
  return `#${to2(rgb.r)}${to2(rgb.g)}${to2(rgb.b)}`;
}

function parseColorToRgb(input: string): { r: number; g: number; b: number } | null {
  const s = (input || '').trim();
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

async function getForevertechLogoJpg(): Promise<Buffer | null> {
  if (cachedForevertechLogoJpg !== undefined) return cachedForevertechLogoJpg;
  try {
    const p = path.join(process.cwd(), 'public', 'images', 'Forevertech_logo.jpg');
    cachedForevertechLogoJpg = await readFile(p);
    return cachedForevertechLogoJpg;
  } catch {
    cachedForevertechLogoJpg = null;
    return null;
  }
}

async function buildQrStampPng(params: { url: string; stampSide: number; backgroundColor?: string }) {
  const stampSide = Math.max(220, Math.trunc(params.stampSide));
  const logoJpg = await getForevertechLogoJpg();
  const bgRgb = parseColorToRgb(params.backgroundColor || '') || { r: 255, g: 31, b: 93 };
  const bgHex = rgbToHex(bgRgb);
  const border = Math.max(12, Math.round(stampSide * 0.04));
  const topPad = Math.max(16, Math.round(border * 0.9));
  const gap = Math.max(10, Math.round(border * 0.75));
  const bottomPad = Math.max(18, Math.round(border * 0.9));
  const urlFontSize = Math.max(11, Math.min(22, Math.round(stampSide * 0.03)));
  const quantumFontSize = Math.max(16, Math.min(34, Math.round(stampSide * 0.06)));
  const labelGap = Math.max(6, Math.round(gap * 0.7));
  const labelAreaH = quantumFontSize + labelGap + urlFontSize;
  const qrSide = Math.max(160, Math.round(stampSide - topPad - gap - labelAreaH - bottomPad));
  const corner = Math.max(18, Math.round(stampSide * 0.14));

  const qrFull = await QRCode.toBuffer(params.url, {
    errorCorrectionLevel: 'H',
    width: qrSide,
    margin: 2,
    color: { dark: '#26000f', light: bgHex },
  });

  const qrModulesOnly = await removeExactColorToAlpha({ input: qrFull, rgb: bgRgb });

  const stampBg = await sharp({
    create: {
      width: stampSide,
      height: stampSide,
      channels: 4,
      background: { r: bgRgb.r, g: bgRgb.g, b: bgRgb.b, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const frame = await sharp(stampBg)
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${stampSide}" height="${stampSide}"><rect x="${border / 2}" y="${border / 2}" width="${stampSide - border}" height="${stampSide - border}" rx="${corner}" ry="${corner}" fill="rgba(255,255,255,0)" stroke="rgba(255,255,255,0.10)" stroke-width="${border}"/><rect x="${border / 2}" y="${border / 2}" width="${stampSide - border}" height="${stampSide - border}" rx="${corner}" ry="${corner}" fill="rgba(255,255,255,0)" stroke="rgba(255,255,255,0.22)" stroke-width="${Math.max(2, Math.round(border * 0.22))}"/></svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toBuffer();

  const qrLeft = Math.floor((stampSide - qrSide) / 2);
  const qrTop = topPad;

  let logoFull: Buffer | null = null;
  if (logoJpg) {
    const logoSized = await sharp(logoJpg)
      .resize(qrSide, qrSide, { fit: 'contain', withoutEnlargement: true, background: { r: bgRgb.r, g: bgRgb.g, b: bgRgb.b, alpha: 0 } })
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
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const verificationUrl = 'www.pixelqrypt.com';
  const centerX = 8 + stampSide / 2;
  const label1Y = 8 + qrTop + qrSide + gap;
  const label2Y = label1Y + quantumFontSize + labelGap;

  const label1 = 'Quantum Verified';
  const label2 = verificationUrl;
  const track1 = 0.06;
  const track2 = 0.04;

  ctx.save();
  ctx.globalAlpha = 0.96;
  const maxW = Math.max(60, stampSide - border * 2);
  const w1 = measureVectorTextWidth(label1, quantumFontSize, track1);
  const s1 = Math.max(0.75, Math.min(2.6, maxW / Math.max(1, w1)));
  ctx.save();
  ctx.translate(centerX, label1Y);
  ctx.scale(s1, 1);
  strokeVectorText({
    ctx,
    text: label1,
    x: -w1 / 2,
    y: 0,
    size: quantumFontSize,
    tracking: track1,
    lineWidth: Math.max(2, Math.round(quantumFontSize * 0.28)) / s1,
    strokeStyle: 'rgba(0,0,0,0.55)',
  });
  strokeVectorText({
    ctx,
    text: label1,
    x: -w1 / 2,
    y: 0,
    size: quantumFontSize,
    tracking: track1,
    lineWidth: Math.max(1, Math.round(quantumFontSize * 0.18)) / s1,
    strokeStyle: 'rgba(255,255,255,0.92)',
  });
  ctx.restore();

  const w2 = measureVectorTextWidth(label2, urlFontSize, track2);
  const s2 = Math.max(0.75, Math.min(3.2, maxW / Math.max(1, w2)));
  ctx.save();
  ctx.translate(centerX, label2Y);
  ctx.scale(s2, 1);
  strokeVectorText({
    ctx,
    text: label2,
    x: -w2 / 2,
    y: 0,
    size: urlFontSize,
    tracking: track2,
    lineWidth: Math.max(1, Math.round(urlFontSize * 0.20)) / s2,
    strokeStyle: 'rgba(0,0,0,0.35)',
  });
  strokeVectorText({
    ctx,
    text: label2,
    x: -w2 / 2,
    y: 0,
    size: urlFontSize,
    tracking: track2,
    lineWidth: Math.max(1, Math.round(urlFontSize * 0.13)) / s2,
    strokeStyle: 'rgba(255,255,255,0.86)',
  });
  ctx.restore();
  ctx.restore();

  return canvas.toBuffer('image/png');
}

async function renderBackQrStampBase64(params: {
  origin: string;
  text: string;
  seedSalt?: string;
  backStyle: 'words' | 'abstract';
  qrUrl?: string;
  qrDisabled?: boolean;
  customerText?: string;
  backImageDataUrl?: string;
}) {
  const cfg = getPrintifyBackTextConfig();
  const clean = sanitizeBannerText(params.text) || 'CUSTOM';
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

  const basePng = params.backStyle === 'abstract' ? await renderBackAbstractPngBuffer(clean, salted) : await renderBackTextPngBuffer(clean, salted);
  const customerOverlay = params.customerText
    ? await buildCustomerBackTextOverlayPng({ width, height, bgX, bgY, bgW, bgH, text: params.customerText })
    : null;
  const backImageOverlay = params.backImageDataUrl
    ? await buildCustomerBackImageOverlayPng({ bgX, bgY, bgW, bgH, dataUrl: params.backImageDataUrl })
    : null;

  const targetUrl = buildBackQrTargetUrl(params.origin, clean, params.qrUrl, params.qrDisabled);
  const overlays = [
    ...(customerOverlay ? [{ input: customerOverlay, left: 0, top: 0 }] : []),
    ...(backImageOverlay ? [backImageOverlay] : []),
  ];
  if (targetUrl) {
    const stamp = await buildQrStampPng({ url: targetUrl, stampSide, backgroundColor: cfg.render.backgroundColor });
    const wipeSvg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${stampSide + 24}" height="${stampSide + 24}"><rect x="0" y="0" width="${stampSide + 24}" height="${stampSide + 24}" rx="${Math.round(stampSide * 0.16)}" ry="${Math.round(stampSide * 0.16)}" fill="${cfg.render.backgroundColor}"/></svg>`,
    );
    overlays.push({ input: wipeSvg, left, top }, { input: stamp, left, top });
  }

  const out = await sharp(basePng)
    .composite(overlays)
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
    .toBuffer();

  return out.toString('base64');
}

async function getBackWordPreviewUrl(
  keyword: string,
  origin: string | null,
  seedSalt?: string,
  qrUrl?: string,
  customerText?: string,
  qrDisabled?: boolean,
  backImageDataUrl?: string,
) {
  const cfg = getPrintifyBackTextConfig();
  const ttlMs = 24 * 60 * 60 * 1000;
  const kw = sanitizeBannerText(keyword) || 'CUSTOM';
  const saltKey = seedSalt ? `|q|${seedSalt}` : '';
  const mode = getBackMode();
  const style = getBackStyle();
  const qrKey = qrDisabled ? '|noqr' : qrUrl ? `|u|${fnv1a32Hex(qrUrl).slice(0, 8)}` : '';
  const ct = sanitizeCustomerBackText(customerText || '');
  const ctKey = ct ? `|t|${fnv1a32Hex(ct).slice(0, 8)}` : '';
  const bi = typeof backImageDataUrl === 'string' ? backImageDataUrl.trim() : '';
  const biKey = bi ? `|bi|${fnv1a32Hex(`${bi.length}|${bi.slice(0, 512)}`).slice(0, 10)}` : '';
  const originKey = origin ? (() => {
    try {
      return new URL(origin).host;
    } catch {
      return origin;
    }
  })() : 'no_origin';
  const cacheKey = `${mode}|${style}|back_v1|${originKey}${qrKey}${ctKey}${biKey}|${cfg.version}${saltKey}|${kw.toUpperCase()}`;
  const cached = cachedBackWordPreviewUrls.get(cacheKey);
  if (cached && Date.now() - cached.at < ttlMs) return cached.url;

  let base64 =
    mode === 'qr_stamp' && origin
      ? await renderBackQrStampBase64({
          origin,
          text: kw,
          seedSalt,
          backStyle: style,
          qrUrl,
          qrDisabled,
          customerText: ct || undefined,
          backImageDataUrl: bi || undefined,
        })
      : style === 'abstract'
        ? await renderBackAbstractBase64(kw, seedSalt)
        : await renderBackBannerBase64(kw, seedSalt);
  if ((ct || bi) && !(mode === 'qr_stamp' && origin)) {
    try {
      const r = cfg.render;
      const width = r.width;
      const height = r.height;
      const bgW = Math.min(r.bgW, width);
      const bgH = Math.min(r.bgH, height);
      const bgX = Math.floor((width - bgW) / 2);
      const bgY = Math.floor((height - bgH) / 2);

      const overlays: Array<{ input: Buffer; left: number; top: number }> = [];
      if (ct) {
        const t = await buildCustomerBackTextOverlayPng({ width, height, bgX, bgY, bgW, bgH, text: ct });
        if (t) overlays.push({ input: t, left: 0, top: 0 });
      }
      if (bi) {
        const i = await buildCustomerBackImageOverlayPng({ bgX, bgY, bgW, bgH, dataUrl: bi });
        if (i) overlays.push(i);
      }
      if (overlays.length) {
        const out = await sharp(Buffer.from(base64, 'base64'))
          .composite(overlays)
          .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
          .toBuffer();
        base64 = out.toString('base64');
      }
    } catch {
    }
  }
  const fileSafe = (kw || 'CUSTOM').replace(/\s+/g, '-').replace(/[^A-Za-z0-9-]/g, '').slice(0, 48) || 'CUSTOM';
  const saltTag = seedSalt ? `-q-${seedSalt.slice(0, 8)}` : '';
  const ctTag = ct ? `-t-${fnv1a32Hex(ct).slice(0, 6)}` : '';
  const biTag = bi ? `-bi-${fnv1a32Hex(`${bi.length}|${bi.slice(0, 512)}`).slice(0, 6)}` : '';
  const prefix = mode === 'qr_stamp' ? `back-qr-stamp-${style}-v1` : `back-${style}-v1`;
  const previewUrl = await uploadImageToPrintify(`${prefix}-${cfg.version}${saltTag}${ctTag}${biTag}-${fileSafe}.png`, base64);
  cachedBackWordPreviewUrls.set(cacheKey, { url: previewUrl, at: Date.now() });
  return previewUrl;
}

function buildPrintifyOrderLabel(sessionId: string, keyword: string): string {
  const kw = sanitizeKeyword(keyword) || 'Custom';
  const base = `${kw} ${sessionId}`;
  return base.length > 100 ? base.slice(0, 100) : base;
}

function buildPrintifyFileName(keyword: string, itemId: string): string {
  const kw = sanitizeKeyword(keyword) || 'Design';
  const id = String(itemId || 'design').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) || 'design';
  return `${kw}_${id}.png`;
}

async function printifyFetch(path: string, init?: RequestInit) {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) {
    throw new Error('Missing PRINTIFY_API_TOKEN');
  }

  let res: Response;
  try {
    res = await fetch(`https://api.printify.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'public-catalog',
        'content-type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e || '');
    throw new Error(`Printify network error: ${path}${msg ? ` (${msg})` : ''}`);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Printify API error (${res.status}): ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function fetchImageAsBase64(url: string) {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e || '');
    throw new Error(`Image fetch network error: ${url}${msg ? ` (${msg})` : ''}`);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status}): ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

async function uploadImageToPrintify(fileName: string, base64Contents: string) {
  const uploaded = await printifyFetch('/v1/uploads/images.json', {
    method: 'POST',
    body: JSON.stringify({
      file_name: fileName,
      contents: base64Contents,
    }),
  });

  if (!uploaded || typeof uploaded.preview_url !== 'string') {
    throw new Error('Printify upload did not return preview_url');
  }

  return uploaded.preview_url as string;
}

async function getTemplateProduct(shopId: string, preferredProductId?: string) {
  const templateProductId = preferredProductId || process.env.PRINTIFY_TEMPLATE_PRODUCT_ID;
  let resolvedProductId = templateProductId;
  if (resolvedProductId && cachedTemplateProducts.has(resolvedProductId)) {
    return cachedTemplateProducts.get(resolvedProductId)!;
  }
  if (!resolvedProductId && process.env.NODE_ENV !== 'production') {
    if (cachedTemplateProductId) {
      resolvedProductId = cachedTemplateProductId;
    } else {
      const env = process.env as Record<string, string | undefined>;
      const skuCandidates = [
        env.PRINTIFY_SKU_S,
        env.PRINTIFY_SKU_M,
        env.PRINTIFY_SKU_L,
        env.PRINTIFY_SKU_XL,
        env.PRINTIFY_SKU_XXL,
        env.PRINTIFY_DEFAULT_SKU,
      ]
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean);

      let fallbackId = '';
      for (let page = 1; page <= 3 && !resolvedProductId; page++) {
        const listed = (await printifyFetch(`/v1/shops/${shopId}/products.json?page=${page}&limit=50`)) as unknown;
        const data = isRecord(listed) && Array.isArray(listed.data) ? listed.data : Array.isArray(listed) ? listed : [];

        for (const p of data as Array<Record<string, unknown>>) {
          if (!fallbackId) fallbackId = getString(p.id);
          const variantsRaw = p.variants;
          if (!Array.isArray(variantsRaw) || skuCandidates.length === 0) continue;
          for (const v of variantsRaw as PrintifyTemplateVariant[]) {
            if (!isRecord(v)) continue;
            const vSku = getString(v.sku);
            if (vSku && skuCandidates.includes(vSku)) {
              resolvedProductId = getString(p.id);
              break;
            }
          }
          if (resolvedProductId) break;
        }
      }

      if (!resolvedProductId && fallbackId) {
        resolvedProductId = fallbackId;
      }

      if (resolvedProductId) {
        cachedTemplateProductId = resolvedProductId;
      }
    }
  }

  if (!resolvedProductId) {
    throw new Error('Missing PRINTIFY_TEMPLATE_PRODUCT_ID');
  }

  const product = (await printifyFetch(`/v1/shops/${shopId}/products/${resolvedProductId}.json`)) as unknown;
  if (!isRecord(product)) {
    throw new Error('Printify template product response was invalid');
  }
  cachedTemplateProducts.set(resolvedProductId, product as PrintifyTemplateProduct);
  return product as PrintifyTemplateProduct;
}

function getNumber(value: unknown) {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : NaN;
}

function getVariantIdFromTemplate(template: PrintifyTemplateProduct, sku: string) {
  const variantsRaw = template.variants;
  if (!Array.isArray(variantsRaw)) {
    throw new Error('Printify template product is missing variants');
  }

  let fallbackVariantId: number | null = null;
  for (const v of variantsRaw as PrintifyTemplateVariant[]) {
    if (!isRecord(v)) continue;
    const vSku = getString(v.sku);
    const candidateId = getNumber(v.id);
    if (fallbackVariantId === null && Number.isFinite(candidateId)) {
      fallbackVariantId = candidateId;
    }
    if (vSku && vSku === sku) {
      if (Number.isFinite(candidateId)) return candidateId;
    }
  }

  if (typeof fallbackVariantId === 'number' && Number.isFinite(fallbackVariantId)) {
    return fallbackVariantId;
  }

  throw new Error(`Could not find template variant for sku: ${sku}`);
}

function getTransformFromTemplate(template: PrintifyTemplateProduct, variantId: number, placementKey: string) {
  const printAreasRaw = template.print_areas;
  if (!Array.isArray(printAreasRaw)) {
    return { x: 0, y: 0, scale: 1, angle: 0 };
  }

  for (const area of printAreasRaw as PrintifyTemplatePrintArea[]) {
    if (!isRecord(area)) continue;
    const variantIdsRaw = area.variant_ids;
    const placeholdersRaw = area.placeholders;
    const variantIds = Array.isArray(variantIdsRaw) ? variantIdsRaw.map(getNumber).filter(Number.isFinite) : [];
    if (!variantIds.includes(variantId)) continue;
    if (!Array.isArray(placeholdersRaw)) continue;

    for (const ph of placeholdersRaw as PrintifyTemplatePlaceholder[]) {
      if (!isRecord(ph)) continue;
      const pos = getString(ph.position);
      if (!pos || pos !== placementKey) continue;
      const imagesRaw = ph.images;
      if (!Array.isArray(imagesRaw) || imagesRaw.length === 0) continue;
      const first = imagesRaw[0];
      if (!isRecord(first)) continue;
      const img = first as PrintifyTemplatePlaceholderImage;
      return {
        x: Number.isFinite(getNumber(img.x)) ? getNumber(img.x) : 0,
        y: Number.isFinite(getNumber(img.y)) ? getNumber(img.y) : 0,
        scale: Number.isFinite(getNumber(img.scale)) ? getNumber(img.scale) : 1,
        angle: Number.isFinite(getNumber(img.angle)) ? getNumber(img.angle) : 0,
      };
    }
  }

  return { x: 0, y: 0, scale: 1, angle: 0 };
}

function getPlacementKeysForVariant(template: PrintifyTemplateProduct, variantId: number) {
  const printAreasRaw = template.print_areas;
  if (!Array.isArray(printAreasRaw)) return [];
  const keys: string[] = [];

  for (const area of printAreasRaw as PrintifyTemplatePrintArea[]) {
    if (!isRecord(area)) continue;
    const variantIdsRaw = area.variant_ids;
    const placeholdersRaw = area.placeholders;
    const variantIds = Array.isArray(variantIdsRaw) ? variantIdsRaw.map(getNumber).filter(Number.isFinite) : [];
    if (!variantIds.includes(variantId)) continue;
    if (!Array.isArray(placeholdersRaw)) continue;

    for (const ph of placeholdersRaw as PrintifyTemplatePlaceholder[]) {
      if (!isRecord(ph)) continue;
      const pos = getString(ph.position);
      if (pos) keys.push(pos);
    }
  }

  return Array.from(new Set(keys));
}

function pickBackPlacementKey(placements: string[]) {
  if (placements.includes('back')) return 'back';
  const lower = placements.map((p) => ({ p, l: p.toLowerCase() }));
  const containsBack = lower.find((x) => x.l.includes('back'));
  return containsBack?.p || '';
}

async function getCompanyLogoPreviewUrl(origin: string) {
  const ttlMs = 24 * 60 * 60 * 1000;
  if (cachedLogoPreviewUrl && Date.now() - cachedLogoPreviewUrlAt < ttlMs) return cachedLogoPreviewUrl;

  const logoPath = process.env.PRINTIFY_COMPANY_LOGO_PATH || '/images/Forevertech_logo.jpg';
  const logoUrl = logoPath.startsWith('http://') || logoPath.startsWith('https://') ? logoPath : `${origin}${logoPath}`;
  const base64 = await fetchImageAsBase64(logoUrl);
  const previewUrl = await uploadImageToPrintify('company-logo.jpg', base64);
  cachedLogoPreviewUrl = previewUrl;
  cachedLogoPreviewUrlAt = Date.now();
  return previewUrl;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || 'Customer';
  const last = parts.slice(1).join(' ') || 'Customer';
  return { first, last };
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function isSameOrigin(req: Request): boolean {
  const host = (req.headers.get('host') || '').trim();
  const origin = (req.headers.get('origin') || '').trim();
  if (!host || !origin) return false;
  return origin === `https://${host}` || origin === `http://${host}`;
}

async function loadCheckoutFromSupabase(
  sessionId: string,
  orderIdHint?: string,
): Promise<{ orderId: string; status?: string; printifyOrderId?: string; items: CartItem[] } | null> {
  const sid = String(sessionId || '').trim();
  const hintedOrderId = String(orderIdHint || '').trim();
  if (!sid && !hintedOrderId) return null;
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  const ordersQuery = supabase.from('orders').select('id,status,printify_order_id');
  const { data: order, error: orderError } = hintedOrderId
    ? await ordersQuery.eq('id', hintedOrderId).single()
    : await ordersQuery.eq('stripe_checkout_session_id', sid).single();

  if (orderError || !order?.id) return null;

  const { data: rows, error: rowsError } = await supabase
    .from('order_items')
    .select('metadata,quantity')
    .eq('order_id', order.id);

  if (rowsError || !Array.isArray(rows) || rows.length === 0) {
    return { orderId: order.id, items: [] };
  }

  const items: CartItem[] = rows
    .map((r: Record<string, unknown>, idx: number) => {
      const meta = r && typeof r.metadata === 'object' && r.metadata !== null ? (r.metadata as Record<string, unknown>) : {};
      const cartItem = meta && typeof meta.cart_item === 'object' && meta.cart_item !== null ? (meta.cart_item as Record<string, unknown>) : null;
      const quantity = Math.max(1, Number(r?.quantity || 1));
      if (cartItem) {
        const out: CartItem = { ...cartItem };
        out.quantity = quantity;
        return out;
      }
      return { id: `order-item-${idx}`, quantity, metadata: meta };
    })
    .filter((x): x is CartItem => Boolean(x && typeof x === 'object'));

  return {
    orderId: order.id,
    status: typeof order.status === 'string' ? order.status : undefined,
    printifyOrderId: typeof order.printify_order_id === 'string' ? order.printify_order_id : undefined,
    items,
  };
}

function getCartLineItems(cartItems: CartItem[]): OrderLineItem[] {
  const out: OrderLineItem[] = [];
  for (const item of cartItems) {
    const anyItem = isRecord(item) ? (item as Record<string, unknown>) : {};
    const quantity = Math.max(1, Number(anyItem.quantity ?? 1));
    const price = getNumber(anyItem.price);
    const title = getString(anyItem.title);
    const imageUrl =
      typeof anyItem.imageUrl === 'string'
        ? anyItem.imageUrl
        : typeof anyItem.image === 'string'
          ? anyItem.image
          : undefined;
    const metadata = isRecord(anyItem.metadata) ? (anyItem.metadata as Record<string, unknown>) : undefined;
    out.push({
      id: getString(anyItem.id) || undefined,
      title: title || undefined,
      quantity,
      price: Number.isFinite(price) ? price : undefined,
      imageUrl,
      metadata,
    });
  }
  return out;
}

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let stripe: Stripe;

  const payload = await request.text();

  let event: Stripe.Event;
  let allowDevBypass = false;
  try {
    allowDevBypass =
      process.env.NODE_ENV !== 'production' && request.headers.get('x-dev-bypass') === '1' && isSameOrigin(request);

    if (allowDevBypass) {
      const parsed: unknown = payload ? JSON.parse(payload) : null;
      event = parsed as Stripe.Event;
      if (event?.type === 'checkout.session.completed') {
        const sessionLike = (event.data as { object?: { id?: string } } | undefined)?.object;
        const sessionId = sessionLike?.id;
        if (typeof sessionId === 'string' && sessionId) {
          stripe = getStripeClient();
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          (event.data as { object: Stripe.Checkout.Session }).object = session;
        }
      }
    } else {
      if (!sig || !webhookSecret) {
        return NextResponse.json({ error: 'Missing webhook configuration' }, { status: 500 });
      }
      stripe = getStripeClient();
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const deviceId = getString(session.metadata?.deviceId) || 'anonymous';
    const userId = getString(session.metadata?.userId);
    const quantumVerifiedRequested = getString(session.metadata?.quantumVerified) === '1';
    const quantumFeeCents =
      typeof session.metadata?.quantumFeeCents === 'string' && session.metadata.quantumFeeCents.trim()
        ? Math.max(0, Math.min(50_000, Math.trunc(Number(session.metadata.quantumFeeCents))))
        : 0;
    let quantumProof: QuantumProof | null = null;
    let quantumRefunded = false;
    let quantumVerified = quantumVerifiedRequested;

  if (quantumVerifiedRequested) {
    try {
      quantumProof = await requestIbmQuantumProof({ orderId: session.id, purpose: 'seed', timeoutMs: 6000 });
    } catch {
      quantumProof = null;
      quantumVerified = false;
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : '';
      if (paymentIntentId && quantumFeeCents > 0) {
        try {
          const stripeClient = getStripeClient();
          await stripeClient.refunds.create({ payment_intent: paymentIntentId, amount: quantumFeeCents });
          quantumRefunded = true;
        } catch {
          quantumRefunded = false;
        }
      }
    }
  }
  const origin =
    getString(session.metadata?.origin) ||
    (process.env.NEXT_PUBLIC_SITE_URL || '') ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : '');
  if (!origin) {
    return NextResponse.json({ error: 'Missing site origin. Set NEXT_PUBLIC_SITE_URL.' }, { status: 500 });
  }
  const shopId = process.env.PRINTIFY_SHOP_ID;

  if (!shopId) {
    return NextResponse.json({ error: 'Missing PRINTIFY_SHOP_ID' }, { status: 500 });
  }

  const stored = await loadCheckoutFromSupabase(session.id, getString(session.metadata?.orderId));
  if (stored?.printifyOrderId || stored?.status === 'submitted') {
    return NextResponse.json({ received: true, duplicate: true });
  }
  const cartItems = stored?.items && stored.items.length > 0 ? stored.items : getCart(deviceId);
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return NextResponse.json({ received: true });
  }

  const firstItem = (cartItems as CartItem[])[0];
  const firstMeta = firstItem?.metadata && isRecord(firstItem.metadata) ? firstItem.metadata : {};
  const orderKeyword = keywordFromCartItem(firstItem || {}, firstMeta);

  const stripeAddress =
    session.customer_details && isRecord(session.customer_details.address)
      ? (session.customer_details.address as Record<string, unknown>)
      : {};
  const customerName = getString(session.customer_details?.name) || getString(session.metadata?.customerName);
  const { first, last } = splitName(customerName);

  const addressTo: PrintifyAddressTo = {
    first_name: first,
    last_name: last,
    email: getString(session.customer_details?.email) || getString(session.metadata?.email) || '',
    phone: getString(session.customer_details?.phone) || getString(session.metadata?.phone),
    country: getString(stripeAddress.country) || getString(session.metadata?.country) || 'US',
    region: getString(stripeAddress.state) || getString(session.metadata?.region),
    address1: getString(stripeAddress.line1) || getString(session.metadata?.address),
    address2: getString(stripeAddress.line2) || getString(session.metadata?.address2) || undefined,
    city: getString(stripeAddress.city) || getString(session.metadata?.city),
    zip: getString(stripeAddress.postal_code) || getString(session.metadata?.zip),
  };

  const lineItems: PrintifyLineItem[] = [];

  for (const item of cartItems as CartItem[]) {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const metadata = item.metadata && isRecord(item.metadata) ? item.metadata : {};
    const keyword = keywordFromCartItem(item, metadata);
    const printType = getString(metadata['printType']) || 'standard';
    const rawPrintify = metadata['printify'];
    const printify: PrintifyItemMeta | null = isRecord(rawPrintify) ? (rawPrintify as PrintifyItemMeta) : null;
    const variant = typeof metadata['variant'] === 'string' ? metadata['variant'] : '';
    const printifySku = typeof metadata['printifySku'] === 'string' ? metadata['printifySku'] : '';
    const itemSize =
      typeof item.size === 'string'
        ? item.size
        : typeof variant === 'string'
          ? variant
          : '';
    const envSku =
      itemSize && (process.env as Record<string, string | undefined>)[`PRINTIFY_SKU_${itemSize}`]
        ? (process.env as Record<string, string | undefined>)[`PRINTIFY_SKU_${itemSize}`]
        : process.env.PRINTIFY_DEFAULT_SKU;
    const resolvedTemplateProductId = resolveTemplateProductIdForItem(metadata, {
      defaultTemplateProductId: process.env.PRINTIFY_TEMPLATE_PRODUCT_ID,
      aopTemplateProductId: process.env.PRINTIFY_AOP_TEMPLATE_PRODUCT_ID,
    });
    const template = await getTemplateProduct(shopId, resolvedTemplateProductId || undefined);
    const templateBlueprintId = getNumber(template.blueprint_id);
    const templatePrintProviderId = getNumber(template.print_provider_id);
    const sku = getString(printify?.sku) || getString(printifySku) || getString(envSku);
    const placementKey = getString(printify?.placementKey) || process.env.PRINTIFY_PLACEMENT || 'front';
    const blueprintId = Number.isFinite(getNumber(printify?.blueprintId)) ? getNumber(printify?.blueprintId) : templateBlueprintId;
    const printProviderId = Number.isFinite(getNumber(printify?.printProviderId))
      ? getNumber(printify?.printProviderId)
      : templatePrintProviderId;
    const mappedVariantId = getNumber(printify?.variantId);
    const variantId = Number.isFinite(mappedVariantId)
      ? mappedVariantId
      : sku
        ? getVariantIdFromTemplate(template, sku)
        : NaN;

    if (!Number.isFinite(blueprintId) || !Number.isFinite(printProviderId) || !Number.isFinite(variantId)) {
      throw new Error('Missing Printify mapping (need sku or blueprintId/printProviderId/variantId)');
    }

    const itemMeta = isRecord(item.metadata) ? item.metadata : {};
    const ipfsGateway =
      typeof itemMeta.ipfs_gateway === 'string' && itemMeta.ipfs_gateway.trim()
        ? itemMeta.ipfs_gateway.trim()
        : typeof itemMeta.ipfs_url === 'string' && itemMeta.ipfs_url.startsWith('ipfs://')
          ? itemMeta.ipfs_url.replace('ipfs://', 'https://ipfs.io/ipfs/')
          : '';

    const prompt = promptFromCartItem(item, metadata);
    const quantumFront =
      quantumVerified && quantumProof?.seed && prompt
        ? await generateQuantumFrontImageUrl({ prompt, quantumSeed: quantumProof.seed })
        : null;

    if (quantumFront) {
      if (!item.metadata || !isRecord(item.metadata)) item.metadata = {};
      const m = item.metadata as Record<string, unknown>;
      m.quantum_front = {
        seed_salt: quantumFront.meta.seed_salt,
        qf_quantum_seed_hash: quantumFront.meta.qf_quantum_seed_hash,
        image_hash: quantumFront.meta.image_hash,
        derived_prompt: quantumFront.meta.derived_prompt,
        ibm_job_id: quantumProof?.jobId || '',
        ibm_backend: quantumProof?.backend || '',
      };
      item.imageUrl = quantumFront.url;
    }

    const rawImageUrl =
      (quantumFront ? quantumFront.url : '') ||
      ipfsGateway ||
      (typeof item.imageUrl === 'string' ? item.imageUrl : typeof item.image === 'string' ? item.image : '');

    if (!rawImageUrl || rawImageUrl.startsWith('blob:')) {
      throw new Error('Cart item imageUrl is missing or not accessible for upload');
    }

    const absoluteImageUrl =
      rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://')
        ? rawImageUrl
        : origin
          ? `${origin}${rawImageUrl.startsWith('/') ? '' : '/'}${rawImageUrl}`
          : rawImageUrl;

    const base64 = await fetchImageAsBase64(absoluteImageUrl);
    const previewUrl = await uploadImageToPrintify(buildPrintifyFileName(keyword, String(item.id || 'design')), base64);
    const transform = getTransformFromTemplate(template, variantId, placementKey);
    const desiredX = 0.5;
    const desiredY = 0.36;
    const desiredScale = 0.78;
    const finalTransform =
      placementKey === 'front'
        ? {
            x: desiredX,
            y: desiredY,
            scale: desiredScale,
            angle: Number.isFinite(transform.angle) ? transform.angle : 0,
          }
        : transform;

    const availablePlacements = getPlacementKeysForVariant(template, variantId);
    const printAreas: Record<string, PrintifyPrintAreaInfo[]> =
      printType === 'all_over_print'
        ? Object.fromEntries(
            expandAopPlacementKeys(availablePlacements).map((placement) => {
              const placementTransform = getTransformFromTemplate(template, variantId, placement);
              return [
                placement,
                [
                  {
                    src: previewUrl,
                    x: Number.isFinite(placementTransform.x) ? placementTransform.x : 0.5,
                    y: Number.isFinite(placementTransform.y) ? placementTransform.y : 0.5,
                    scale: Number.isFinite(placementTransform.scale) ? placementTransform.scale : 1,
                    angle: Number.isFinite(placementTransform.angle) ? placementTransform.angle : 0,
                  },
                ],
              ];
            }),
          )
        : {
            [placementKey]: [
              {
                src: previewUrl,
                x: finalTransform.x,
                y: finalTransform.y,
                scale: finalTransform.scale,
                angle: finalTransform.angle,
              },
            ],
          };

    if (origin && printType !== 'all_over_print') {
      try {
        const preferredPlacement = (process.env.PRINTIFY_LOGO_PLACEMENT || '').trim();
        const candidates = [
          preferredPlacement,
          'neck',
          'inside_label',
          'inner_label',
          'label',
        ].filter(Boolean);
        const logoPlacementKey = candidates.find((c) => availablePlacements.includes(c));

        if (logoPlacementKey) {
          const logoPreviewUrl = await getCompanyLogoPreviewUrl(origin);
          const logoTransform = getTransformFromTemplate(template, variantId, logoPlacementKey);
          const logoFinal = {
            x: Number.isFinite(logoTransform.x) ? logoTransform.x : 0.5,
            y: Number.isFinite(logoTransform.y) ? logoTransform.y : 0.12,
            scale: Math.min(1, Math.max(0.1, (Number.isFinite(logoTransform.scale) ? logoTransform.scale : 0.35) * 1.45)),
            angle: Number.isFinite(logoTransform.angle) ? logoTransform.angle : 0,
          };

          printAreas[logoPlacementKey] = [
            {
              src: logoPreviewUrl,
              x: logoFinal.x,
              y: logoFinal.y,
              scale: logoFinal.scale,
              angle: logoFinal.angle,
            },
          ];
        }
      } catch {
      }
    }

    try {
      const backKey = pickBackPlacementKey(availablePlacements);

      if (backKey && printType !== 'all_over_print') {
        const bannerText = bannerTextFromCartItem(item, metadata);
        const customerBackText = customerBackTextFromCartItem(metadata);
        const customerBackImage = customerBackImageFromCartItem(metadata);
        const seedSalt = buildBackSeedSalt({
          sessionId: session.id,
          itemId: String(item.id || ''),
          imageUrl: absoluteImageUrl,
          quantumSeed: quantumProof?.seed || null,
        });
        const qrDisabled = (session.metadata?.qrDisabled || '').trim() === '1';
        const customerQrUrl = qrDisabled ? '' : normalizeCustomerQrUrl(session.metadata?.qrUrl);
        const backPreviewUrl = await getBackWordPreviewUrl(
          bannerText,
          origin || null,
          seedSalt,
          customerQrUrl || undefined,
          customerBackText || undefined,
          qrDisabled,
          customerBackImage || undefined,
        );

        printAreas[backKey] = [
          {
            src: backPreviewUrl,
            x: 0.5,
            y: 0.5,
            scale: 0.9,
            angle: 0,
          },
        ];
      } else {
        console.error('No back placement found for variant', { variantId, availablePlacements });
      }
    } catch (e) {
      console.error('Back word upload/placement failed', e);
    }

    lineItems.push({
      blueprint_id: blueprintId,
      print_provider_id: printProviderId,
      variant_id: variantId,
      quantity,
      external_id: String(item.id || ''),
      print_areas: printAreas,
    });
  }

  const printifyOrder = (await printifyFetch(`/v1/shops/${shopId}/orders.json`, {
    method: 'POST',
    body: JSON.stringify({
      external_id: session.id,
      label: buildPrintifyOrderLabel(session.id, orderKeyword),
      line_items: lineItems,
      shipping_method: 1,
      is_printify_express: false,
      is_economy_shipping: false,
      send_shipping_notification: true,
      address_to: addressTo,
    }),
  })) as unknown;

  if (stored?.orderId) {
    const supabase = getServiceSupabase();
    if (supabase) {
      const nextTotal = typeof session.amount_total === 'number' && Number.isFinite(session.amount_total) ? session.amount_total : null;
      await supabase
        .from('orders')
        .update({
          status: 'submitted',
          total_amount: nextTotal,
          stripe_payment_status: getString(session.payment_status) || null,
          customer_email: getString(session.customer_details?.email) || null,
          printify_order_id: isRecord(printifyOrder) ? getString(printifyOrder.id) || null : null,
          printify_status: isRecord(printifyOrder) ? getString(printifyOrder.status) || 'submitted' : 'submitted',
          fulfillment_attempted_at: new Date().toISOString(),
          fulfilled_at: new Date().toISOString(),
          shipping_name: customerName || null,
          shipping_country: addressTo.country || null,
          shipping_region: addressTo.region || null,
          shipping_address1: addressTo.address1 || null,
          shipping_address2: addressTo.address2 || null,
          shipping_city: addressTo.city || null,
          shipping_zip: addressTo.zip || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stored.orderId);
    }
  }

  const key = userId || deviceId || 'anonymous';
  const cartTotal = getCartLineItems(cartItems as CartItem[]).reduce((sum, li) => sum + (li.price || 0) * li.quantity, 0);
  const sessionTotal = typeof session.amount_total === 'number' ? session.amount_total / 100 : null;
  const order: OrderRecord = {
    id: session.id,
    createdAt: new Date().toISOString(),
    status: 'submitted',
    stripeSessionId: session.id,
    printifyOrderId: isRecord(printifyOrder) ? getString(printifyOrder.id) || undefined : undefined,
    total: typeof sessionTotal === 'number' && Number.isFinite(sessionTotal) ? sessionTotal : cartTotal,
    quantumVerified,
    quantumRefunded,
    quantumProof: quantumProof || undefined,
    items: getCartLineItems(cartItems as CartItem[]),
  };

  addOrder(key, order);

  clearCart(deviceId);

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('stripe.webhook.error', error);
    const message = error instanceof Error ? error.message : String(error || 'unknown_error');
    return NextResponse.json({ error: message, devBypass: allowDevBypass }, { status: 500 });
  }
}
