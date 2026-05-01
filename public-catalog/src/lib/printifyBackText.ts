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
      textColor: "#f2f2f2",
      strokeColor: "#d9d9d9",
      fontFamily: "Impact, Arial Black, Arial, sans-serif",
      fontWeight: 900,
      angleMin: -30,
      angleMax: 30,
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
  const angleSpan = r.angleMax - r.angleMin;

  const tiles = words
    .map((word, i) => {
      const c = i % cols;
      const rr = Math.floor(i / cols);
      const cellCx = bgX + outerPad + c * cellW + Math.floor(cellW / 2);
      const cellCy = bgY + outerPad + rr * cellH + Math.floor(cellH / 2);
      const jitterX = Math.floor((rng() - 0.5) * cellW * 0.22);
      const jitterY = Math.floor((rng() - 0.5) * cellH * 0.22);
      const x = cellCx + jitterX;
      const y = cellCy + jitterY;

      const angle = Math.floor(r.angleMin + rng() * angleSpan);
      const fontSizeBase = Math.floor(Math.min(r.maxFontSize, Math.max(r.minFontSize, cellH * 0.26)));
      const len = Math.max(1, word.length);
      const fontSize = Math.max(r.minFontSize, Math.min(fontSizeBase, Math.floor(fontSizeBase + (10 - len) * 2)));
      const strokeWidth = Math.max(1, Math.floor(fontSize * r.strokeWidthRatio));
      const textLength = Math.max(40, Math.floor(cellW * r.textLengthRatio));

      return `<g transform="translate(${x} ${y}) rotate(${angle})"><text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="${r.fontFamily}" font-size="${fontSize}" font-weight="${r.fontWeight}" fill="${r.textColor}" stroke="${r.strokeColor}" stroke-width="${strokeWidth}" paint-order="stroke" textLength="${textLength}" lengthAdjust="spacingAndGlyphs">${word}</text></g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="rgba(0,0,0,0)"/><rect x="${bgX}" y="${bgY}" width="${bgW}" height="${bgH}" fill="${r.backgroundColor}"/>${tiles}</svg>`;
}

export type PrintifyBackTextConfigPatch = PartialDeep<PrintifyBackTextConfig>;
