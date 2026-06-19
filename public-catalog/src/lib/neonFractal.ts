// In-app neon fractal generator (no external service required).
//
// Ports the "PixelQrypt" neon Mandelbrot + Julia fusion look into TypeScript so
// the live Next.js app can turn a user's typed words into a one-of-one fractal
// image directly, with no Python service to deploy.
//
// Guarantees:
//  - Deterministic: the same prompt (+ optional salt) always reproduces the
//    exact same image. Different words produce a different image.
//  - Bright, high-contrast neon look matching the printed-tee references:
//    deep indigo/violet body, glowing magenta/cyan filaments, diagonal light
//    sheen, soft bloom.

import sharp from "sharp";

type RGB = [number, number, number];

// ---- Deterministic hashing / PRNG --------------------------------------------

/** FNV-1a 32-bit hash of a string -> unsigned int. */
export function seedFromText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG -> deterministic [0,1) generator from a seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Palettes (deep body + bright neon edges) --------------------------------

const PALETTES: Record<string, RGB[]> = {
  // deep indigo/blue body with hot magenta-pink rim light (reference image 2)
  neon_violet: [
    [20, 14, 78],
    [58, 34, 168],
    [104, 52, 214],
    [168, 70, 226],
    [240, 96, 200],
    [255, 168, 224],
  ],
  // indigo body with electric cyan-green glowing filigree (reference image 1 batch)
  cyber_teal: [
    [14, 10, 64],
    [40, 28, 140],
    [52, 70, 190],
    [36, 150, 200],
    [44, 228, 200],
    [150, 255, 210],
  ],
  // purple liquid-marble with magenta diagonal sheen (reference image 3)
  ultra_magenta: [
    [26, 10, 60],
    [72, 24, 150],
    [128, 40, 198],
    [196, 56, 210],
    [255, 86, 168],
    [255, 156, 196],
  ],
  nebula: [
    [6, 22, 54],
    [0, 110, 168],
    [44, 200, 220],
    [255, 150, 180],
    [255, 96, 128],
    [255, 196, 120],
  ],
  aurora: [
    [7, 18, 38],
    [10, 84, 96],
    [16, 196, 168],
    [96, 255, 184],
    [210, 255, 140],
    [255, 138, 196],
  ],
};

function samplePalette(stops: RGB[], t: number): RGB {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = stops[i];
  const b = stops[Math.min(stops.length - 1, i + 1)];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// ---- Prompt -> visual parameters ---------------------------------------------

// Curated Julia constants that produce attractive spiral / star / dendrite
// filaments (the image-2 look). Large-interior constants (e.g. Douady rabbit,
// San Marco) are intentionally excluded because they create big empty black
// blobs that read as "unfinished" on a printed tee.
const JULIA_CS: Array<[number, number]> = [
  [-0.70176, -0.3842], // spiral seahorse
  [0.285, 0.01], // star-like dendrite spiral
  [-0.8, 0.156], // galaxy swirl
  [-0.7269, 0.1889], // classic filaments
  [0.0, 0.8], // dendrite stars
  [-0.391, -0.587], // Siegel disk spiral
  [0.285, 0.535], // dendrite bursts
  [-0.54, 0.54], // double spiral
  [0.355, 0.355], // dragon filaments
  [-0.4, 0.6], // swirl filaments
];

interface FractalParams {
  paletteName: string;
  cx: number;
  cy: number;
  zoom: number;
  rotation: number;
  centerX: number;
  centerY: number;
}

function analyzePrompt(prompt: string, salt?: string): FractalParams {
  const text = `${(prompt || "").toLowerCase().trim()}|${salt || ""}`;
  const seed = seedFromText(text);
  const rand = mulberry32(seed);

  const words = (prompt || "").toLowerCase();
  const has = (...keys: string[]) => keys.some((k) => words.includes(k));

  // Emotion / theme -> palette.
  let paletteName: string;
  if (has("love", "passion", "fire", "heart", "warm", "rose", "blood")) {
    paletteName = "ultra_magenta";
  } else if (has("calm", "ocean", "water", "peace", "ice", "cool", "wave", "sea")) {
    paletteName = "cyber_teal";
  } else if (has("space", "star", "cosmic", "galaxy", "night", "void", "dark", "wolf", "moon", "dream", "mystic", "divine")) {
    paletteName = "neon_violet";
  } else if (has("energy", "electric", "power", "storm", "lightning", "neon")) {
    paletteName = "nebula";
  } else if (has("nature", "forest", "earth", "life", "spring", "aurora")) {
    paletteName = "aurora";
  } else {
    // Weighted roulette favoring the signature looks.
    const roulette = [
      "neon_violet",
      "cyber_teal",
      "ultra_magenta",
      "neon_violet",
      "cyber_teal",
      "nebula",
      "aurora",
    ];
    paletteName = roulette[Math.floor(rand() * roulette.length)];
  }

  // Julia constant chosen from the curated set, with a tiny deterministic jitter
  // so different prompts shift the shape but the same prompt is stable.
  const base = JULIA_CS[Math.floor(rand() * JULIA_CS.length)];
  const cx = base[0] + (rand() - 0.5) * 0.06;
  const cy = base[1] + (rand() - 0.5) * 0.06;

  const zoom = 1.1 + rand() * 0.9; // 1.1 - 2.0
  const rotation = rand() * Math.PI * 2;
  const centerX = (rand() - 0.5) * 0.5;
  const centerY = (rand() - 0.5) * 0.5;

  return { paletteName, cx, cy, zoom, rotation, centerX, centerY };
}

// ---- Core render -------------------------------------------------------------

const MAX_ITER = 160;
const LOG2 = Math.log(2);

/**
 * Generate a neon fractal PNG for a prompt. Returns a PNG buffer.
 * Deterministic for a given (prompt, salt, size).
 */
export async function generateNeonFractalPng(
  prompt: string,
  size = 512,
  salt?: string,
): Promise<Buffer> {
  const p = analyzePrompt(prompt, salt);
  const stops = PALETTES[p.paletteName] || PALETTES.neon_violet;

  const w = size;
  const h = size;
  // Float RGB working buffer.
  const rgb = new Float32Array(w * h * 3);
  // Escape field (for bloom / rim detection).
  const field = new Float32Array(w * h);

  const cosR = Math.cos(p.rotation);
  const sinR = Math.sin(p.rotation);
  const scale = 3.0 / p.zoom; // view span in complex plane

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      // Normalized coords [-0.5,0.5]
      const nx = px / (w - 1) - 0.5;
      const ny = py / (h - 1) - 0.5;
      // Rotate + scale + center -> complex plane (Julia z0)
      const rx = nx * cosR - ny * sinR;
      const ry = nx * sinR + ny * cosR;
      let zx = rx * scale + p.centerX;
      let zy = ry * scale + p.centerY;

      let iter = 0;
      let mag2 = zx * zx + zy * zy;
      while (mag2 <= 64 && iter < MAX_ITER) {
        const xt = zx * zx - zy * zy + p.cx;
        zy = 2 * zx * zy + p.cy;
        zx = xt;
        mag2 = zx * zx + zy * zy;
        iter++;
      }

      let t: number;
      let inside = false;
      if (iter >= MAX_ITER) {
        inside = true;
        t = 0; // inside set -> deepest body color (dark core)
      } else {
        // Smooth (continuous) iteration count.
        const logZn = Math.log(mag2) / 2;
        const nu = Math.log(logZn / LOG2) / LOG2;
        const smooth = iter + 1 - nu;
        // Fast escape (background) -> deep indigo; near-boundary filaments
        // (high iteration) -> bright neon glow. Gamma lifts the midtones so the
        // body reads as a rich indigo field rather than flat black.
        t = Math.pow(Math.min(1, smooth / MAX_ITER), 0.62);
      }

      const idx = py * w + px;
      field[idx] = t;
      const col = inside ? [8, 5, 28] : samplePalette(stops, t);
      const o = idx * 3;
      rgb[o] = col[0] / 255;
      rgb[o + 1] = col[1] / 255;
      rgb[o + 2] = col[2] / 255;
    }
  }

  applyDimensionalDepth(rgb, field, w, h, seedFromText(`${prompt}|${salt || ""}|depth`));
  applyNeonFinish(rgb, w, h, seedFromText(`${prompt}|${salt || ""}|finish`));

  // Float -> 8-bit
  const out = Buffer.allocUnsafe(w * h * 3);
  for (let i = 0; i < rgb.length; i++) {
    let v = rgb[i];
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    out[i] = (v * 255 + 0.5) | 0;
  }

  return sharp(out, { raw: { width: w, height: h, channels: 3 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Convenience: PNG as a data URL usable directly as image_url. */
export async function generateNeonFractalDataUrl(
  prompt: string,
  size = 512,
  salt?: string,
): Promise<string> {
  const png = await generateNeonFractalPng(prompt, size, salt);
  return `data:image/png;base64,${png.toString("base64")}`;
}

// ---- Post-processing ---------------------------------------------------------

/** Relief lighting + iridescent shimmer for a 4D, alive feel. */
function applyDimensionalDepth(
  rgb: Float32Array,
  field: Float32Array,
  w: number,
  h: number,
  seed: number,
): void {
  const rand = mulberry32(seed);
  const la = rand() * Math.PI * 2;
  const lx = Math.cos(la) * 0.62;
  const ly = Math.sin(la) * 0.62;
  const lz = 0.78;
  const phase = rand() * Math.PI * 2;
  const cycles = 2.4 + rand() * 1.2;
  const TWO_PI = Math.PI * 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      // Gradient of the escape field -> surface normal.
      const xl = field[idx - (x > 0 ? 1 : 0)];
      const xr = field[idx + (x < w - 1 ? 1 : 0)];
      const yt = field[idx - (y > 0 ? w : 0)];
      const yb = field[idx + (y < h - 1 ? w : 0)];
      const gx = (xr - xl) * 2.3;
      const gy = (yb - yt) * 2.3;
      let nx = -gx;
      let ny = -gy;
      let nz = 1;
      const norm = Math.sqrt(nx * nx + ny * ny + nz * nz) + 1e-6;
      nx /= norm;
      ny /= norm;
      nz /= norm;
      const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz);
      const spec = Math.pow(Math.max(0, diffuse), 26) * 0.5;
      const shade = 0.74 + 0.46 * diffuse;

      const f = field[idx];
      const ir = 0.5 + 0.5 * Math.sin(TWO_PI * (f * cycles) + phase);
      const ig = 0.5 + 0.5 * Math.sin(TWO_PI * (f * cycles) + phase + 2.0944);
      const ib = 0.5 + 0.5 * Math.sin(TWO_PI * (f * cycles) + phase + 4.1888);
      const iridAmt = 0.1;

      const o = idx * 3;
      for (let c = 0; c < 3; c++) {
        let v = rgb[o + c] * shade + spec;
        const irv = c === 0 ? ir : c === 1 ? ig : ib;
        // Screen-blend the shimmer to keep highlights bright.
        v = 1 - (1 - Math.min(1, v)) * (1 - irv * iridAmt);
        rgb[o + c] = v;
      }
    }
  }
}

/** Bloom on bright filigree + diagonal light sheen (the reference signature). */
function applyNeonFinish(rgb: Float32Array, w: number, h: number, seed: number): void {
  const rand = mulberry32(seed);

  // --- Bloom: blur the brightest areas and screen-blend back. ---
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 3;
    lum[i] = 0.299 * rgb[o] + 0.587 * rgb[o + 1] + 0.114 * rgb[o + 2];
  }
  // Threshold at ~65th percentile (approximate via fixed cutoff on sorted-ish mean).
  let mean = 0;
  for (let i = 0; i < lum.length; i++) mean += lum[i];
  mean /= lum.length;
  const thresh = Math.min(0.85, mean + 0.12);

  const bright = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const m = lum[i] > thresh ? (lum[i] - thresh) / Math.max(1e-3, 1 - thresh) : 0;
    const o = i * 3;
    bright[o] = rgb[o] * m;
    bright[o + 1] = rgb[o + 1] * m;
    bright[o + 2] = rgb[o + 2] * m;
  }
  const radius = Math.max(2, Math.floor(w / 90));
  const blurred = boxBlur3(bright, w, h, radius);
  for (let i = 0; i < rgb.length; i++) {
    rgb[i] = 1 - (1 - rgb[i]) * (1 - blurred[i] * 0.55);
  }

  // --- Diagonal light sheen: a few soft angled refraction bands. ---
  const angle = 0.6 + rand() * 0.4;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const maxWH = Math.max(w, h);
  const nBands = 2 + Math.floor(rand() * 2);
  const bands = Array.from({ length: nBands }, () => ({
    center: 0.05 + rand() * 0.9,
    width: 0.05 + rand() * 0.07,
    amp: 0.1 + rand() * 0.12,
  }));
  const tint: RGB = [1.0, 0.86, 1.0];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const proj = (x * ca + y * sa) / maxWH;
      let sheen = 0;
      for (const b of bands) {
        const d = proj - b.center;
        sheen += b.amp * Math.exp(-(d * d) / (2 * b.width * b.width));
      }
      sheen = Math.min(0.55, sheen);
      const o = (y * w + x) * 3;
      for (let c = 0; c < 3; c++) {
        rgb[o + c] = 1 - (1 - rgb[o + c]) * (1 - sheen * tint[c]);
      }
    }
  }
}

/** Simple separable box blur on a 3-channel float buffer. */
function boxBlur3(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);
  const norm = 1 / (2 * r + 1);
  // Horizontal
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 3; c++) {
      let acc = 0;
      for (let x = -r; x <= r; x++) {
        const xx = Math.max(0, Math.min(w - 1, x));
        acc += src[(y * w + xx) * 3 + c];
      }
      for (let x = 0; x < w; x++) {
        tmp[(y * w + x) * 3 + c] = acc * norm;
        const xOut = Math.max(0, Math.min(w - 1, x - r));
        const xIn = Math.max(0, Math.min(w - 1, x + r + 1));
        acc += src[(y * w + xIn) * 3 + c] - src[(y * w + xOut) * 3 + c];
      }
    }
  }
  // Vertical
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 3; c++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) {
        const yy = Math.max(0, Math.min(h - 1, y));
        acc += tmp[(yy * w + x) * 3 + c];
      }
      for (let y = 0; y < h; y++) {
        dst[(y * w + x) * 3 + c] = acc * norm;
        const yOut = Math.max(0, Math.min(h - 1, y - r));
        const yIn = Math.max(0, Math.min(h - 1, y + r + 1));
        acc += tmp[(yIn * w + x) * 3 + c] - tmp[(yOut * w + x) * 3 + c];
      }
    }
  }
  return dst;
}
