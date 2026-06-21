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

// Available fractal "engines". "julia" is the classic escape-time look; the
// rest are single continuous-line (string) fractals drawn with one unbroken
// stroke via L-systems.
type FractalType = "julia" | "koch" | "sierpinski" | "dragon" | "hilbert";

interface FractalParams {
  fractalType: FractalType;
  paletteName: string;
  cx: number;
  cy: number;
  zoom: number;
  rotation: number;
  centerX: number;
  centerY: number;
  iterations: number; // L-system recursion depth for line fractals
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

  // Fractal type from theme words; otherwise a random "emotional" pick that is
  // still deterministic per prompt.
  let fractalType: FractalType;
  if (has("snowflake", "crystal", "ice", "frost", "winter", "koch", "lace")) {
    fractalType = "koch";
  } else if (has("triangle", "pyramid", "sierpinski", "sacred", "ancient", "temple", "geometry", "rune")) {
    fractalType = "sierpinski";
  } else if (has("dragon", "serpent", "twist", "chaos", "flame", "snake")) {
    fractalType = "dragon";
  } else if (has("maze", "circuit", "grid", "path", "matrix", "city", "labyrinth", "weave")) {
    fractalType = "hilbert";
  } else if (has("spiral", "galaxy", "cosmic", "nebula", "swirl", "seahorse", "lightning")) {
    fractalType = "julia";
  } else {
    // Random emotional fractal: weighted roulette (favor the painterly julia and
    // the one-line string fractals for variety), seeded by the prompt.
    const typeRoulette: FractalType[] = [
      "julia",
      "julia",
      "koch",
      "sierpinski",
      "dragon",
      "hilbert",
      "julia",
      "koch",
    ];
    fractalType = typeRoulette[Math.floor(rand() * typeRoulette.length)];
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

  // L-system recursion depth, bounded per type for good detail + performance.
  const depthByType: Record<FractalType, [number, number]> = {
    julia: [0, 0],
    koch: [4, 5],
    sierpinski: [6, 8],
    dragon: [11, 13],
    hilbert: [6, 7],
  };
  const [dlo, dhi] = depthByType[fractalType];
  const iterations = dlo + Math.floor(rand() * (dhi - dlo + 1));

  return { fractalType, paletteName, cx, cy, zoom, rotation, centerX, centerY, iterations };
}

// ---- Single continuous-line (string) fractals via L-systems ------------------

interface LSystem {
  axiom: string;
  rules: Record<string, string>;
  angle: number; // degrees per +/- turn
}

const L_SYSTEMS: Record<Exclude<FractalType, "julia">, LSystem> = {
  // Koch snowflake: one closed continuous stroke.
  koch: { axiom: "F--F--F", rules: { F: "F+F--F+F" }, angle: 60 },
  // Sierpinski arrowhead: draws the Sierpinski triangle as ONE unbroken line.
  sierpinski: { axiom: "A", rules: { A: "B-A-B", B: "A+B+A" }, angle: 60 },
  // Dragon curve: a single continuous self-avoiding stroke.
  dragon: { axiom: "FX", rules: { X: "X+YF+", Y: "-FX-Y" }, angle: 90 },
  // Hilbert space-filling curve: one continuous line that weaves the plane.
  hilbert: { axiom: "A", rules: { A: "+BF-AFA-FB+", B: "-AF+BFB+FA-" }, angle: 90 },
};

/** Expand an L-system to its turtle string. */
function expandLSystem(sys: LSystem, iterations: number): string {
  let s = sys.axiom;
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of s) next += sys.rules[ch] ?? ch;
    s = next;
  }
  return s;
}

/** Walk a turtle string into a polyline of [x,y] points (drawing F or G). */
function turtleToPoints(commands: string, angleDeg: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  let x = 0;
  let y = 0;
  let dir = 0; // radians
  const step = 1;
  const turn = (angleDeg * Math.PI) / 180;
  pts.push([x, y]);
  for (const ch of commands) {
    if (ch === "F" || ch === "G") {
      x += Math.cos(dir) * step;
      y += Math.sin(dir) * step;
      pts.push([x, y]);
    } else if (ch === "+") {
      dir += turn;
    } else if (ch === "-") {
      dir -= turn;
    }
  }
  return pts;
}

/**
 * Rasterize a single-line fractal into an escape-style field (0..1), where the
 * stroke glows toward 1 and the background sits at a deep base value. The result
 * is fed through the same neon colorize + depth + bloom pipeline as the Julia
 * fractal, so the one-line fractals get the identical PixelQrypt neon look.
 */
function renderLineFractalField(p: FractalParams, w: number, h: number): Float32Array {
  const sys = L_SYSTEMS[p.fractalType as Exclude<FractalType, "julia">];
  const commands = expandLSystem(sys, p.iterations);
  const raw = turtleToPoints(commands, sys.angle);

  // Fit + rotate the polyline into the canvas with padding.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of raw) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const cosR = Math.cos(p.rotation);
  const sinR = Math.sin(p.rotation);
  const pad = 0.12;
  const target = (1 - 2 * pad) * Math.min(w, h);
  const fit = target / Math.max(spanX, spanY);

  const pts: Array<[number, number]> = raw.map(([px, py]) => {
    const dx = px - cx;
    const dy = py - cy;
    const rx = dx * cosR - dy * sinR;
    const ry = dx * sinR + dy * cosR;
    return [w / 2 + rx * fit, h / 2 + ry * fit];
  });

  const field = new Float32Array(w * h).fill(0.14); // deep body base
  const sigma = Math.max(1.0, w / 300); // glow softness
  const core = sigma * 0.9;
  const reach = Math.ceil(sigma * 3 + 1);
  const inv2s2 = 1 / (2 * sigma * sigma);

  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const segMinX = Math.max(0, Math.floor(Math.min(x0, x1) - reach));
    const segMaxX = Math.min(w - 1, Math.ceil(Math.max(x0, x1) + reach));
    const segMinY = Math.max(0, Math.floor(Math.min(y0, y1) - reach));
    const segMaxY = Math.min(h - 1, Math.ceil(Math.max(y0, y1) + reach));
    const dx = x1 - x0;
    const dy = y1 - y0;
    const segLen2 = dx * dx + dy * dy || 1e-6;
    for (let py = segMinY; py <= segMaxY; py++) {
      for (let px = segMinX; px <= segMaxX; px++) {
        let tSeg = ((px - x0) * dx + (py - y0) * dy) / segLen2;
        tSeg = tSeg < 0 ? 0 : tSeg > 1 ? 1 : tSeg;
        const qx = x0 + tSeg * dx;
        const qy = y0 + tSeg * dy;
        const d2 = (px - qx) * (px - qx) + (py - qy) * (py - qy);
        const d = Math.sqrt(d2);
        const glow = d <= core ? 1 : Math.exp(-(d - core) * (d - core) * inv2s2);
        const idx = py * w + px;
        const v = 0.14 + glow * 0.86;
        if (v > field[idx]) field[idx] = v;
      }
    }
  }
  return field;
}

/** Map an escape/intensity field to neon palette RGB. */
function colorizeField(field: Float32Array, rgb: Float32Array, stops: RGB[], w: number, h: number): void {
  for (let i = 0; i < w * h; i++) {
    const col = samplePalette(stops, field[i]);
    const o = i * 3;
    rgb[o] = col[0] / 255;
    rgb[o + 1] = col[1] / 255;
    rgb[o + 2] = col[2] / 255;
  }
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
  let field = new Float32Array(w * h);

  // Single continuous-line (string) fractals: Koch, Sierpinski, dragon, Hilbert.
  if (p.fractalType !== "julia") {
    field = renderLineFractalField(p, w, h);
    colorizeField(field, rgb, stops, w, h);

    applyDimensionalDepth(rgb, field, w, h, seedFromText(`${prompt}|${salt || ""}|depth`));
    applyNeonFinish(rgb, w, h, seedFromText(`${prompt}|${salt || ""}|finish`));
    applyContrastSaturation(rgb);

    const outLine = Buffer.allocUnsafe(w * h * 3);
    for (let i = 0; i < rgb.length; i++) {
      let v = rgb[i];
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      outLine[i] = (v * 255 + 0.5) | 0;
    }
    return sharp(outLine, { raw: { width: w, height: h, channels: 3 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

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
  applyContrastSaturation(rgb);

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

/**
 * Final contrast + saturation boost so the indigo body stays deep and the neon
 * filaments pop on a white tee, even for sparse constants and thin line strokes.
 */
function applyContrastSaturation(rgb: Float32Array): void {
  const CONTRAST = 1.42;
  const SATURATION = 1.32;
  for (let i = 0; i < rgb.length; i += 3) {
    let r = (rgb[i] - 0.5) * CONTRAST + 0.5;
    let g = (rgb[i + 1] - 0.5) * CONTRAST + 0.5;
    let b = (rgb[i + 2] - 0.5) * CONTRAST + 0.5;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * SATURATION;
    g = lum + (g - lum) * SATURATION;
    b = lum + (b - lum) * SATURATION;
    rgb[i] = r;
    rgb[i + 1] = g;
    rgb[i + 2] = b;
  }
}

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
