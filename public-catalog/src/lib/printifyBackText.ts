export type PrintifyBackTextConfig = {
  version: string;
  textMode: "prompt" | "custom";
  customText: string;
  render: {
    width: number;
    height: number;
    bgW: number;
    bgH: number;
    outerPad: number;
    backgroundColor: string;
    textColor: string;
    strokeColor: string;
    fontFamily: string;
    fontWeight: number;
    angleMin: number;
    angleMax: number;
    maxWords: number;
    maxChars: number;
    maxWordLength: number;
    minFontSize: number;
    maxFontSize: number;
    strokeWidthRatio: number;
    textLengthRatio: number;
    colsMin: number;
    colsMax: number;
    colsDenseThreshold: number;
    colsDenseCount: number;
  };
};

type PartialDeep<T> = { [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K] };

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function asFiniteNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function asInt(v: unknown): number | null {
  const n = asFiniteNumber(v);
  if (n === null) return null;
  return Math.floor(n);
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = asInt(v);
  if (n === null) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = asFiniteNumber(v);
  if (n === null) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function sanitizeColor(v: unknown, fallback: string): string {
  const s = asNonEmptyString(v);
  if (!s) return fallback;
  const ok = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s) || /^rgba?\(/i.test(s) || /^hsla?\(/i.test(s);
  return ok ? s : fallback;
}

export function sanitizeBannerText(text: string, maxChars = 96): string {
  const t = (text || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim();
  return t.slice(0, Math.max(1, maxChars));
}

function fnv1a32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function defaultPrintifyBackTextConfig(): PrintifyBackTextConfig {
  return {
    version: "v1",
    textMode: "prompt",
    customText: "",
    render: {
      width: 2000,
      height: 5200,
      bgW: 1400,
      bgH: 2400,
      outerPad: 140,
      backgroundColor: "#ff1f5d",
      textColor: "#ffffff",
      strokeColor: "rgba(0,0,0,0.28)",
      fontFamily: "Impact, Arial Black, Arial, sans-serif",
      fontWeight: 900,
      angleMin: -12,
      angleMax: 12,
      maxWords: 14,
      maxChars: 96,
      maxWordLength: 12,
      minFontSize: 72,
      maxFontSize: 140,
      strokeWidthRatio: 0.08,
      textLengthRatio: 0.84,
      colsMin: 2,
      colsMax: 4,
      colsDenseThreshold: 10,
      colsDenseCount: 3,
    },
  };
}

function getStore(): PrintifyBackTextConfig {
  const g = globalThis as unknown as { __ftPrintifyBackTextCfg?: PrintifyBackTextConfig };
  if (!g.__ftPrintifyBackTextCfg) g.__ftPrintifyBackTextCfg = defaultPrintifyBackTextConfig();
  return g.__ftPrintifyBackTextCfg;
}

function setStore(next: PrintifyBackTextConfig) {
  const g = globalThis as unknown as { __ftPrintifyBackTextCfg?: PrintifyBackTextConfig };
  g.__ftPrintifyBackTextCfg = next;
}

export function getPrintifyBackTextConfig(): PrintifyBackTextConfig {
  return getStore();
}

export function updatePrintifyBackTextConfig(patch: PartialDeep<PrintifyBackTextConfig>): PrintifyBackTextConfig {
  const cur = getStore();
  const next: PrintifyBackTextConfig = {
    version: cur.version,
    textMode: patch.textMode === "custom" || patch.textMode === "prompt" ? patch.textMode : cur.textMode,
    customText: typeof patch.customText === "string" ? patch.customText : cur.customText,
    render: {
      width: clampInt(patch.render?.width, 200, 12000, cur.render.width),
      height: clampInt(patch.render?.height, 200, 20000, cur.render.height),
      bgW: clampInt(patch.render?.bgW, 50, 12000, cur.render.bgW),
      bgH: clampInt(patch.render?.bgH, 50, 20000, cur.render.bgH),
      outerPad: clampInt(patch.render?.outerPad, 0, 4000, cur.render.outerPad),
      backgroundColor: sanitizeColor(patch.render?.backgroundColor, cur.render.backgroundColor),
      textColor: sanitizeColor(patch.render?.textColor, cur.render.textColor),
      strokeColor: sanitizeColor(patch.render?.strokeColor, cur.render.strokeColor),
      fontFamily: asNonEmptyString(patch.render?.fontFamily) ?? cur.render.fontFamily,
      fontWeight: clampInt(patch.render?.fontWeight, 100, 1000, cur.render.fontWeight),
      angleMin: clampInt(patch.render?.angleMin, -180, 180, cur.render.angleMin),
      angleMax: clampInt(patch.render?.angleMax, -180, 180, cur.render.angleMax),
      maxWords: clampInt(patch.render?.maxWords, 1, 64, cur.render.maxWords),
      maxChars: clampInt(patch.render?.maxChars, 1, 256, cur.render.maxChars),
      maxWordLength: clampInt(patch.render?.maxWordLength, 1, 64, cur.render.maxWordLength),
      minFontSize: clampInt(patch.render?.minFontSize, 8, 2000, cur.render.minFontSize),
      maxFontSize: clampInt(patch.render?.maxFontSize, 8, 2000, cur.render.maxFontSize),
      strokeWidthRatio: clampNum(patch.render?.strokeWidthRatio, 0, 1, cur.render.strokeWidthRatio),
      textLengthRatio: clampNum(patch.render?.textLengthRatio, 0.1, 1, cur.render.textLengthRatio),
      colsMin: clampInt(patch.render?.colsMin, 1, 10, cur.render.colsMin),
      colsMax: clampInt(patch.render?.colsMax, 1, 10, cur.render.colsMax),
      colsDenseThreshold: clampInt(patch.render?.colsDenseThreshold, 1, 100, cur.render.colsDenseThreshold),
      colsDenseCount: clampInt(patch.render?.colsDenseCount, 1, 10, cur.render.colsDenseCount),
    },
  };

  next.version = Date.now().toString(36);
  setStore(next);
  return next;
}

export function resetPrintifyBackTextConfig(): PrintifyBackTextConfig {
  const next = defaultPrintifyBackTextConfig();
  next.version = Date.now().toString(36);
  setStore(next);
  return next;
}

export function buildBackTextSvg(text: string, cfg: PrintifyBackTextConfig): string {
  const r = cfg.render;
  const width = r.width;
  const height = r.height;

  const bgW = Math.min(r.bgW, width);
  const bgH = Math.min(r.bgH, height);
  const bgX = Math.floor((width - bgW) / 2);
  const bgY = Math.floor((height - bgH) / 2);
  const outerPad = Math.max(0, r.outerPad);

  const clean = sanitizeBannerText(text, r.maxChars).toUpperCase();
  const words = clean
    .split(" ")
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.slice(0, r.maxWordLength))
    .slice(0, r.maxWords);

  if (!words.length) words.push("CUSTOM");

  const seed = fnv1a32(`${cfg.version}|${clean}`);
  const rng = makeRng(seed);

  const cols = Math.min(r.colsMax, Math.max(r.colsMin, words.length >= r.colsDenseThreshold ? r.colsDenseCount : r.colsMin));
  const rows = Math.max(1, Math.ceil(words.length / cols));
  const cellW = Math.max(1, Math.floor((bgW - outerPad * 2) / cols));
  const cellH = Math.max(1, Math.floor((bgH - outerPad * 2) / rows));

  const clipPadX = Math.max(6, Math.floor(cellW * 0.06));
  const clipPadY = Math.max(10, Math.floor(cellH * 0.12));
  const angleSpan = r.angleMax - r.angleMin;

  const clips = words
    .map((_, i) => {
      const c = i % cols;
      const rr = Math.floor(i / cols);
      const cellX = bgX + outerPad + c * cellW;
      const cellY = bgY + outerPad + rr * cellH;
      const x = cellX + clipPadX;
      const y = cellY + clipPadY;
      const w = Math.max(1, cellW - clipPadX * 2);
      const h = Math.max(1, cellH - clipPadY * 2);
      return `<clipPath id="ftclip-${seed}-${i}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`;
    })
    .join("");

  const tiles = words
    .map((word, i) => {
      const c = i % cols;
      const rr = Math.floor(i / cols);
      const cellX = bgX + outerPad + c * cellW;
      const cellY = bgY + outerPad + rr * cellH;
      const cellCx = cellX + Math.floor(cellW / 2);
      const cellCy = cellY + Math.floor(cellH / 2);

      const len = Math.max(1, word.length);
      const usableW = Math.max(1, cellW - clipPadX * 2);
      const usableH = Math.max(1, cellH - clipPadY * 2);

      const fontH = Math.floor(Math.min(r.maxFontSize, usableH * 0.48, usableW / (len * 0.62)));
      const fontV = Math.floor(Math.min(r.maxFontSize, usableW * 0.48, usableH / (len * 0.62)));
      const rotate90 = fontV > fontH + 3;
      const baseAngle = rotate90 ? 90 : 0;
      const wobble = angleSpan === 0 ? 0 : Math.floor(r.angleMin + rng() * angleSpan);
      const angle = baseAngle + wobble;

      const fontSize = Math.max(18, rotate90 ? fontV : fontH);
      const strokeWidth = Math.max(1, Math.min(12, Math.floor(fontSize * r.strokeWidthRatio)));

      return `<g clip-path="url(#ftclip-${seed}-${i})" transform="translate(${cellCx} ${cellCy}) rotate(${angle})"><text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="${r.fontFamily}" font-size="${fontSize}" font-weight="${r.fontWeight}" fill="${r.textColor}" stroke="${r.strokeColor}" stroke-width="${strokeWidth}">${word}</text></g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${clips}</defs><rect width="${width}" height="${height}" fill="rgba(0,0,0,0)"/><rect x="${bgX}" y="${bgY}" width="${bgW}" height="${bgH}" fill="${r.backgroundColor}"/>${tiles}</svg>`;
}

export type PrintifyBackTextConfigPatch = PartialDeep<PrintifyBackTextConfig>;

type CanvasLike = {
  getContext: (type: "2d") => CanvasRenderingContext2DLike;
  toBuffer: (type: string) => Buffer;
};

type CanvasRenderingContext2DLike = {
  save: () => void;
  restore: () => void;
  beginPath: () => void;
  closePath: () => void;
  clip: () => void;
  rect: (x: number, y: number, w: number, h: number) => void;
  clearRect: (x: number, y: number, w: number, h: number) => void;
  fillRect: (x: number, y: number, w: number, h: number) => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  arc: (x: number, y: number, r: number, s: number, e: number) => void;
  translate: (x: number, y: number) => void;
  scale: (x: number, y: number) => void;
  rotate: (a: number) => void;
  stroke: () => void;
  fill: () => void;
  strokeText: (t: string, x: number, y: number) => void;
  fillText: (t: string, x: number, y: number) => void;
  measureText?: (t: string) => { width: number };
  createPattern?: (img: unknown, repetition: string) => unknown;
  globalAlpha: number;
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  miterLimit: number;
  textAlign: string;
  textBaseline: string;
  font: string;
};

function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHexRgb(input: string): { r: number; g: number; b: number } | null {
  const s = (input || "").trim();
  const m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].toLowerCase();
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgba(rgb: { r: number; g: number; b: number }, a: number) {
  return `rgba(${clampByte(rgb.r)},${clampByte(rgb.g)},${clampByte(rgb.b)},${Math.max(0, Math.min(1, a))})`;
}

function shade(rgb: { r: number; g: number; b: number }, delta: number) {
  return { r: clampByte(rgb.r + delta), g: clampByte(rgb.g + delta), b: clampByte(rgb.b + delta) };
}

async function getCanvasApi() {
  const mod = await import("@napi-rs/canvas");
  return mod as unknown as { createCanvas: (w: number, h: number) => CanvasLike };
}

function drawRedPattern(params: {
  ctx: CanvasRenderingContext2DLike;
  seed: number;
  bgX: number;
  bgY: number;
  bgW: number;
  bgH: number;
  base: { r: number; g: number; b: number };
  createCanvas: (w: number, h: number) => CanvasLike;
}) {
  const { ctx, seed, bgX, bgY, bgW, bgH, base, createCanvas } = params;
  const bgRng = makeRng(seed ^ 0xa53c9e2d);
  const light = shade(base, 26);
  const dark = shade(base, -34);

  const tileSize = Math.max(96, Math.min(240, Math.round(Math.min(bgW, bgH) * (0.10 + bgRng() * 0.07))));
  const tile = createCanvas(tileSize, tileSize);
  const t = tile.getContext("2d");

  t.clearRect(0, 0, tileSize, tileSize);
  const style = Math.floor(bgRng() * 3);

  if (style === 0) {
    t.lineWidth = Math.max(8, Math.round(tileSize * (0.06 + bgRng() * 0.04)));
    t.strokeStyle = rgba(light, 0.22);
    t.beginPath();
    const step = Math.max(22, Math.round(tileSize * (0.18 + bgRng() * 0.10)));
    for (let x = -tileSize; x <= tileSize * 2; x += step) {
      t.moveTo(x, -tileSize);
      t.lineTo(x + tileSize * 2, tileSize * 2);
    }
    t.stroke();
  } else if (style === 1) {
    const dot = Math.max(6, Math.round(tileSize * (0.05 + bgRng() * 0.03)));
    const gap = Math.max(dot + 8, Math.round(tileSize * (0.22 + bgRng() * 0.10)));
    for (let y = 0; y <= tileSize + gap; y += gap) {
      for (let x = 0; x <= tileSize + gap; x += gap) {
        const jx = (bgRng() - 0.5) * dot * 0.7;
        const jy = (bgRng() - 0.5) * dot * 0.7;
        t.fillStyle = rgba(light, 0.18);
        t.beginPath();
        t.arc(x + jx, y + jy, dot * (0.55 + bgRng() * 0.25), 0, Math.PI * 2);
        t.fill();
      }
    }
  } else {
    const band = Math.max(18, Math.round(tileSize * (0.18 + bgRng() * 0.08)));
    for (let i = 0; i < 6; i++) {
      t.fillStyle = rgba(i % 2 === 0 ? light : dark, 0.14 + bgRng() * 0.08);
      t.fillRect((i * band) % tileSize, 0, band, tileSize);
    }
    t.fillStyle = rgba(light, 0.18);
    t.fillRect(0, Math.round(tileSize * 0.42), tileSize, Math.max(10, Math.round(tileSize * 0.10)));
  }

  const pattern = (ctx.createPattern ? ctx.createPattern(tile as unknown as object, "repeat") : null) as unknown;
  if (pattern) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = pattern as unknown as string;
    ctx.fillRect(bgX, bgY, bgW, bgH);
    ctx.restore();
  }

  const speckCount = Math.min(2400, Math.max(320, Math.round((bgW * bgH) / 22000)));
  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < speckCount; i++) {
    const x = bgX + Math.floor(bgRng() * bgW);
    const y = bgY + Math.floor(bgRng() * bgH);
    const s = 1 + Math.floor(bgRng() * 3);
    ctx.fillStyle = rgba(bgRng() > 0.5 ? light : dark, 0.28);
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

function drawFuturisticLines(params: {
  ctx: CanvasRenderingContext2DLike;
  seed: number;
  bgX: number;
  bgY: number;
  bgW: number;
  bgH: number;
  base: { r: number; g: number; b: number };
  variant?: "words" | "abstract";
}) {
  const { ctx, seed, bgX, bgY, bgW, bgH, base } = params;
  const variant = params.variant === "abstract" ? "abstract" : "words";
  const rng = makeRng(seed ^ 0x1c3a7f11);
  const light = shade(base, 34);
  const darker = shade(base, -58);
  const thick = 2.4;
  const black = { r: 0, g: 0, b: 0 };
  const strokeMain = variant === "abstract" ? rgba(black, 0.95) : rgba({ r: 255, g: 255, b: 255 }, 0.18);
  const strokeSecondary = variant === "abstract" ? rgba(black, 0.92) : rgba(light, 0.16);
  const strokeAccent = variant === "abstract" ? rgba(black, 0.88) : rgba(darker, 0.26);

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const pad =
    variant === "abstract"
      ? Math.max(22, Math.round(Math.min(bgW, bgH) * 0.03))
      : Math.max(50, Math.round(Math.min(bgW, bgH) * 0.06));
  const x0 = bgX + pad;
  const y0 = bgY + pad;
  const w = Math.max(1, bgW - pad * 2);
  const h = Math.max(1, bgH - pad * 2);

  const gridStep = Math.max(90, Math.round(Math.min(bgW, bgH) * 0.11));
  ctx.save();
  ctx.globalAlpha = variant === "abstract" ? 0.18 : 0.06;
  ctx.strokeStyle = variant === "abstract" ? rgba(black, 0.85) : rgba(light, 0.20);
  ctx.lineWidth = variant === "abstract" ? 4 : 1 * thick;
  for (let x = x0; x <= x0 + w; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y0 + h);
    ctx.stroke();
  }
  for (let y = y0; y <= y0 + h; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + w, y);
    ctx.stroke();
  }
  ctx.restore();

  const cx = x0 + w * (0.48 + (rng() - 0.5) * 0.08);
  const cy = y0 + h * ((variant === "abstract" ? 0.50 : 0.44) + (rng() - 0.5) * 0.08);
  const baseR = Math.min(w, h) * (variant === "abstract" ? 0.42 + rng() * 0.07 : 0.28 + rng() * 0.06);
  const spokes = variant === "abstract" ? 26 : 20;
  const radii: number[] = [];
  for (let i = 0; i < spokes; i++) radii.push(baseR * (0.75 + rng() * 0.55));
  for (let pass = 0; pass < 2; pass++) {
    const next: number[] = [];
    for (let i = 0; i < spokes; i++) {
      const a = radii[(i - 1 + spokes) % spokes]!;
      const b = radii[i]!;
      const c = radii[(i + 1) % spokes]!;
      next.push(a * 0.25 + b * 0.5 + c * 0.25);
    }
    for (let i = 0; i < spokes; i++) radii[i] = next[i]!;
  }
  const radiusAt = (theta: number) => {
    const t = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const f = (t / (Math.PI * 2)) * spokes;
    const i0 = Math.floor(f) % spokes;
    const i1 = (i0 + 1) % spokes;
    const k = f - Math.floor(f);
    const r0 = radii[i0]!;
    const r1 = radii[i1]!;
    return r0 * (1 - k) + r1 * k;
  };

  const nodeCount = Math.max(90, Math.min(160, Math.round((bgW * bgH) / 26000)));
  const nodes: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < nodeCount; i++) {
    const a = rng() * Math.PI * 2;
    const maxR = radiusAt(a);
    const rr = Math.sqrt(rng()) * maxR;
    const squish = variant === "abstract" ? 1.45 + rng() * 0.35 : 0.88 + rng() * 0.28;
    nodes.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * squish });
  }
  const outerCount = 10 + Math.floor(rng() * 10);
  for (let i = 0; i < outerCount; i++) {
    const a = rng() * Math.PI * 2;
    const maxR = radiusAt(a);
    const rr = maxR * (0.92 + rng() * 0.18);
    const squish = variant === "abstract" ? 1.45 + rng() * 0.35 : 0.88 + rng() * 0.28;
    nodes.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * squish });
  }

  const k = 4;
  const edges = new Set<string>();
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]!;
    const best: Array<{ j: number; d: number }> = [];
    for (let j = 0; j < nodes.length; j++) {
      if (j === i) continue;
      const b = nodes[j]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = dx * dx + dy * dy;
      if (best.length < k) {
        best.push({ j, d });
        best.sort((p, q) => p.d - q.d);
      } else if (d < best[best.length - 1]!.d) {
        best[best.length - 1] = { j, d };
        best.sort((p, q) => p.d - q.d);
      }
    }
    for (const b of best) {
      const j = b.j;
      const a0 = Math.min(i, j);
      const b0 = Math.max(i, j);
      edges.add(`${a0}:${b0}`);
    }
  }

  ctx.save();
  ctx.globalAlpha = variant === "abstract" ? 1 : 0.92;
  ctx.strokeStyle = strokeMain;
  ctx.lineWidth = variant === "abstract" ? 8 : 1.25 * thick;
  ctx.beginPath();
  for (const e of edges) {
    const [as, bs] = e.split(":");
    const ai = Number(as);
    const bi = Number(bs);
    const a = nodes[ai];
    const b = nodes[bi];
    if (!a || !b) continue;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();

  const triCount = Math.min(240, Math.max(80, Math.round(edges.size * 0.30)));
  ctx.save();
  ctx.globalAlpha = variant === "abstract" ? 0.95 : 0.62;
  ctx.strokeStyle = variant === "abstract" ? strokeSecondary : rgba(light, 0.16);
  ctx.lineWidth = variant === "abstract" ? 8 : 0.9 * thick;
  for (let i = 0; i < triCount; i++) {
    const a = nodes[Math.floor(rng() * nodes.length)];
    if (!a) continue;
    if (variant === "abstract") {
      const want = 6;
      const nn: Array<{ p: { x: number; y: number }; d: number; ang: number }> = [];
      for (let j = 0; j < nodes.length; j++) {
        const b = nodes[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = dx * dx + dy * dy;
        if (d === 0) continue;
        const ang = Math.atan2(dy, dx);
        if (nn.length < want) {
          nn.push({ p: b, d, ang });
          nn.sort((p, q) => p.d - q.d);
        } else if (d < nn[nn.length - 1]!.d) {
          nn[nn.length - 1] = { p: b, d, ang };
          nn.sort((p, q) => p.d - q.d);
        }
      }
      if (nn.length < 4) continue;
      nn.sort((p, q) => p.ang - q.ang);

      const t = 0.52 + rng() * 0.12;
      ctx.beginPath();
      for (let k2 = 0; k2 < nn.length; k2++) {
        const p = nn[k2]!.p;
        const x = a.x + (p.x - a.x) * t;
        const y = a.y + (p.y - a.y) * t;
        if (k2 === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    } else {
      const nn: Array<{ p: { x: number; y: number }; d: number }> = [];
      for (let j = 0; j < nodes.length; j++) {
        const b = nodes[j]!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = dx * dx + dy * dy;
        if (d === 0) continue;
        if (nn.length < 2) {
          nn.push({ p: b, d });
          nn.sort((p, q) => p.d - q.d);
        } else if (d < nn[nn.length - 1]!.d) {
          nn[nn.length - 1] = { p: b, d };
          nn.sort((p, q) => p.d - q.d);
        }
      }
      if (nn.length < 2) continue;
      const b = nn[0]!.p;
      const c = nn[1]!.p;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = variant === "abstract" ? 0.85 : 0.34;
  ctx.strokeStyle = strokeAccent;
  ctx.lineWidth = variant === "abstract" ? 8 : 0.7 * thick;
  const accentCount = Math.min(220, Math.max(70, Math.round(edges.size * 0.22)));
  let drawn = 0;
  for (const e of edges) {
    if (drawn >= accentCount) break;
    if (variant !== "abstract" && rng() > 0.5) continue;
    const [as, bs] = e.split(":");
    const ai = Number(as);
    const bi = Number(bs);
    const a = nodes[ai];
    const b = nodes[bi];
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    drawn++;
  }
  ctx.restore();

  if (variant === "abstract") {
    const orng = makeRng(seed ^ 0x2b13a41f);
    const pad = Math.max(24, Math.round(thick * 10));
    const x0 = bgX + pad;
    const y0 = bgY + pad;
    const w = bgW - pad * 2;
    const h = bgH - pad * 2;
    const centerX = x0 + w * (0.46 + (orng() - 0.5) * 0.04);
    const centerY = y0 + h * (0.54 + (orng() - 0.5) * 0.05);
    const size = Math.min(w, h) * (0.42 + orng() * 0.05);
    const depth = size * (0.18 + orng() * 0.03);
    const rot = (orng() - 0.5) * 0.14;

    const mkDiamond = (cx: number, cy: number, s: number, r: number) => {
      const pts = [
        { x: 0, y: -s },
        { x: s, y: 0 },
        { x: 0, y: s },
        { x: -s, y: 0 },
      ];
      const cr = Math.cos(r);
      const sr = Math.sin(r);
      return pts.map((p) => ({
        x: cx + p.x * cr - p.y * sr,
        y: cy + p.x * sr + p.y * cr,
      }));
    };

    const front = mkDiamond(centerX, centerY, size, rot);
    const back = mkDiamond(centerX + depth * 0.44, centerY - depth * 0.36, size * 0.92, rot);
    const innerFront = mkDiamond(centerX, centerY, size * 0.62, rot);
    const innerBack = mkDiamond(centerX + depth * 0.44, centerY - depth * 0.36, size * 0.57, rot);

    ctx.save();
    ctx.globalAlpha = 0.98;
    ctx.strokeStyle = strokeMain;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const strokePoly = (poly: Array<{ x: number; y: number }>) => {
      ctx.beginPath();
      ctx.moveTo(poly[0]!.x, poly[0]!.y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i]!.x, poly[i]!.y);
      ctx.closePath();
      ctx.stroke();
    };

    ctx.lineWidth = 12;
    strokePoly(front);
    strokePoly(back);

    ctx.lineWidth = 10;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(front[i]!.x, front[i]!.y);
      ctx.lineTo(back[i]!.x, back[i]!.y);
      ctx.stroke();
    }

    ctx.strokeStyle = strokeSecondary;
    ctx.globalAlpha = 0.92;
    ctx.lineWidth = 10;
    strokePoly(innerFront);
    strokePoly(innerBack);
    ctx.lineWidth = 8;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(innerFront[i]!.x, innerFront[i]!.y);
      ctx.lineTo(innerBack[i]!.x, innerBack[i]!.y);
      ctx.stroke();
    }

    ctx.strokeStyle = strokeAccent;
    ctx.globalAlpha = 0.82;
    ctx.lineWidth = 7;
    for (let i = 0; i < 4; i++) {
      const a = front[i]!;
      const b = front[(i + 1) % 4]!;
      const c = back[(i + 1) % 4]!;
      const d = back[i]!;
      ctx.beginPath();
      ctx.moveTo((a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
      ctx.lineTo((c.x + d.x) * 0.5, (c.y + d.y) * 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}

function drawExpressYourselfHeader(params: {
  ctx: CanvasRenderingContext2DLike;
  bgX: number;
  bgY: number;
  bgW: number;
  bgH: number;
  fontFamily: string;
  fontWeight: number;
}) {
  const { ctx, bgX, bgY, bgW, bgH, fontFamily, fontWeight } = params;
  const text = "Prixal Crypted";
  const len = Math.max(1, text.length);
  const fontSize = Math.max(72, Math.min(320, Math.floor((bgW * 1.08) / (len * 0.50))));
  const x = bgX + bgW / 2;

  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const weight = Math.max(700, Math.min(1000, Math.round(fontWeight || 900)));
  const family = fontFamily || "Impact, Arial Black, Arial, sans-serif";
  ctx.font = `${weight} ${fontSize}px ${family}`;

  const measuredTextW = typeof ctx.measureText === "function" ? ctx.measureText(text).width : fontSize * (len * 0.62);
  const badgeGap = Math.max(10, Math.round(fontSize * 0.20));
  const badgeSizeRaw = Math.round(fontSize * 0.90);
  const badgeSize = Math.max(54, Math.min(180, badgeSizeRaw));
  const totalW = measuredTextW + badgeGap + badgeSize;
  const targetW = bgW * 0.995;
  const scaleX = totalW > 0 ? Math.min(1.25, Math.max(0.7, targetW / totalW)) : 1;
  const scaleY = 1.08;

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  const strokeW = Math.max(4, Math.round(fontSize * 0.10));
  ctx.lineWidth = strokeW;
  ctx.miterLimit = 2;
  const y = bgY + Math.round(fontSize * (0.52 + (scaleY - 1) * 0.12)) + strokeW + 8;
  ctx.translate(x, y);
  ctx.scale(scaleX, scaleY);
  const left = -totalW / 2;
  ctx.strokeText(text, left, 0);
  ctx.fillText(text, left, 0);

  const badgeX = left + measuredTextW + badgeGap;
  const badgeY = -badgeSize / 2;
  const r = Math.max(10, Math.round(badgeSize * 0.18));
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.strokeStyle = "rgba(0,0,0,0.78)";
  ctx.lineWidth = Math.max(6, Math.round(badgeSize * 0.10));
  ctx.beginPath();
  ctx.moveTo(badgeX + r, badgeY);
  ctx.lineTo(badgeX + badgeSize - r, badgeY);
  ctx.arc(badgeX + badgeSize - r, badgeY + r, r, -Math.PI / 2, 0);
  ctx.lineTo(badgeX + badgeSize, badgeY + badgeSize - r);
  ctx.arc(badgeX + badgeSize - r, badgeY + badgeSize - r, r, 0, Math.PI / 2);
  ctx.lineTo(badgeX + r, badgeY + badgeSize);
  ctx.arc(badgeX + r, badgeY + badgeSize - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(badgeX, badgeY + r);
  ctx.arc(badgeX + r, badgeY + r, r, Math.PI, (Math.PI * 3) / 2);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.92)";
  const qvSize = Math.max(10, Math.round(badgeSize * 0.62));
  ctx.font = `${weight} ${qvSize}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("QV", badgeX + badgeSize / 2, badgeY + badgeSize / 2);
  ctx.restore();
  ctx.restore();
}

export async function renderBackTextPngBuffer(text: string, cfg: PrintifyBackTextConfig): Promise<Buffer> {
  const { createCanvas } = await getCanvasApi();
  const r = cfg.render;
  const width = r.width;
  const height = r.height;

  const bgW = Math.min(r.bgW, width);
  const bgH = Math.min(r.bgH, height);
  const bgX = Math.floor((width - bgW) / 2);
  const bgY = Math.floor((height - bgH) / 2);

  const clean = sanitizeBannerText(text, r.maxChars).toUpperCase();

  const seed = fnv1a32(`${cfg.version}|${clean}`);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, width, height);

  const bgRgb = parseHexRgb(r.backgroundColor);
  ctx.fillStyle = r.backgroundColor;
  ctx.fillRect(bgX, bgY, bgW, bgH);

  if (bgRgb) drawRedPattern({ ctx, seed, bgX, bgY, bgW, bgH, base: bgRgb, createCanvas });
  if (bgRgb) drawFuturisticLines({ ctx, seed, bgX, bgY, bgW, bgH, base: bgRgb, variant: "words" });
  drawExpressYourselfHeader({ ctx, bgX, bgY, bgW, bgH, fontFamily: r.fontFamily, fontWeight: r.fontWeight });

  return canvas.toBuffer("image/png");
}

export async function renderBackAbstractPngBuffer(seedText: string, cfg: PrintifyBackTextConfig): Promise<Buffer> {
  const { createCanvas } = await getCanvasApi();
  const r = cfg.render;
  const width = r.width;
  const height = r.height;

  const bgW = Math.min(r.bgW, width);
  const bgH = Math.min(r.bgH, height);
  const bgX = Math.floor((width - bgW) / 2);
  const bgY = Math.floor((height - bgH) / 2);

  const seed = fnv1a32(`${cfg.version}|abstract|${sanitizeBannerText(seedText, r.maxChars)}`);
  const baseRgb = parseHexRgb(r.backgroundColor) || { r: 255, g: 31, b: 93 };

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = r.backgroundColor;
  ctx.fillRect(bgX, bgY, bgW, bgH);

  drawRedPattern({ ctx, seed, bgX, bgY, bgW, bgH, base: baseRgb, createCanvas });
  drawFuturisticLines({ ctx, seed, bgX, bgY, bgW, bgH, base: baseRgb, variant: "abstract" });
  drawExpressYourselfHeader({ ctx, bgX, bgY, bgW, bgH, fontFamily: r.fontFamily, fontWeight: r.fontWeight });

  return canvas.toBuffer("image/png");
}
