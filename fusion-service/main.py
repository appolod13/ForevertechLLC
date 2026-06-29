import binascii
import json
import math
import os
import random
import struct
import time
import uuid
import zlib
from io import BytesIO
from typing import Literal, Optional

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ValidationError
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.responses import RedirectResponse, Response

try:
    from PIL import Image, ImageDraw, ImageFilter
except Exception:  # pragma: no cover
    Image = None  # type: ignore
    ImageDraw = None  # type: ignore
    ImageFilter = None  # type: ignore

DEFAULT_FRACTAL_ITERATIONS = 130
DEFAULT_ZOOM_LEVEL = 1.45
MAX_QUALITY = 3
MIN_QUALITY = 1
MIN_ZOOM_LEVEL = 0.05
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

REQUESTS = Counter("fusion_requests_total", "Fusion requests", ["endpoint"])
LATENCY = Histogram("fusion_latency_seconds", "Fusion latency", ["device"])

os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="Fusion Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

jobs: dict[str, dict] = {}


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    chunk = tag + data
    return struct.pack("!I", len(data)) + chunk + struct.pack("!I", binascii.crc32(chunk) & 0xFFFFFFFF)


def write_png_rgb(file_path: str, width: int, height: int, rgb: bytes) -> None:
    if len(rgb) != width * height * 3:
        raise ValueError("invalid_rgb_buffer")
    rows: list[bytes] = []
    stride = width * 3
    for y in range(height):
        rows.append(b"\x00" + rgb[y * stride : (y + 1) * stride])
    raw = b"".join(rows)
    compressed = zlib.compress(raw, level=6)
    ihdr = struct.pack("!IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = PNG_SIGNATURE + _png_chunk(b"IHDR", ihdr) + _png_chunk(b"IDAT", compressed) + _png_chunk(b"IEND", b"")
    with open(file_path, "wb") as f:
        f.write(png)


def _hsv_to_rgb(h: float, s: float, v: float) -> tuple[int, int, int]:
    h = h - int(h)
    i = int(h * 6.0)
    f = h * 6.0 - i
    p = v * (1.0 - s)
    q = v * (1.0 - s * f)
    t = v * (1.0 - s * (1.0 - f))
    i %= 6
    if i == 0:
        r, g, b = v, t, p
    elif i == 1:
        r, g, b = q, v, p
    elif i == 2:
        r, g, b = p, v, t
    elif i == 3:
        r, g, b = p, q, v
    elif i == 4:
        r, g, b = t, p, v
    else:
        r, g, b = v, p, q
    return int(r * 255), int(g * 255), int(b * 255)


def _cap_render_dims(width: int, height: int, max_side: int = 448) -> tuple[int, int]:
    long_side = max(width, height)
    if long_side <= max_side:
        return width, height
    scale = max_side / long_side
    return max(64, int(round(width * scale))), max(64, int(round(height * scale)))


def _wormhole_warp(
    x: float,
    y: float,
    center_x: float,
    center_y: float,
    strength: float,
    swirl: float,
) -> tuple[float, float]:
    dx = x - center_x
    dy = y - center_y
    r = math.sqrt(dx * dx + dy * dy) + 1e-9
    theta = math.atan2(dy, dx)
    falloff = math.exp(-r * 1.35)
    theta2 = theta + swirl * falloff + (strength * 0.15) / (r + 0.18)
    r2 = r * (1.0 + strength * 0.22 * falloff)
    return center_x + r2 * math.cos(theta2), center_y + r2 * math.sin(theta2)


def _palette_params(profile: Optional[str], phash: int) -> dict[str, float]:
    p = (profile or "").strip().lower()
    if p in {"peaceful", "serene", "tranquil", "meditative", "calm"}:
        return {"base": 0.56, "span": 0.28, "sat": 0.72, "val_bias": 0.02, "gamma": 1.0 / 1.12}
    if p in {"angry", "rage", "ominous"}:
        return {"base": 0.98, "span": 0.22, "sat": 0.82, "val_bias": -0.02, "gamma": 1.0 / 1.22}
    if p in {"joyful", "joy", "radiant"}:
        return {"base": 0.10, "span": 0.34, "sat": 0.80, "val_bias": 0.05, "gamma": 1.0 / 1.08}
    if p in {"void", "dark", "shadow", "abyss"}:
        return {"base": 0.70, "span": 0.18, "sat": 0.62, "val_bias": -0.06, "gamma": 1.0 / 1.35}
    if p in {"cosmic", "nebula", "mysterious"}:
        return {"base": 0.80, "span": 0.30, "sat": 0.78, "val_bias": 0.00, "gamma": 1.0 / 1.18}
    if p in {"ethereal", "dreamlike"}:
        return {"base": 0.76, "span": 0.26, "sat": 0.74, "val_bias": 0.02, "gamma": 1.0 / 1.12}
    if p in {"quantum", "crystalline", "fractured"}:
        return {"base": 0.72, "span": 0.32, "sat": 0.80, "val_bias": 0.02, "gamma": 1.0 / 1.16}
    base = ((phash % 360) / 360.0 + 0.74) % 1.0
    return {"base": base, "span": 0.28, "sat": 0.80, "val_bias": 0.02, "gamma": 1.0 / 1.16}


def _sierpinski_mask(nx: float, ny: float, scale: int = 1024) -> float:
    xi = int((nx + 0.5) * scale)
    yi = int((ny + 0.5) * scale)
    return 1.0 if (xi & yi) == 0 else 0.0


def _koch_like_mask(nx: float, ny: float, freq: float = 22.0) -> float:
    r = math.sqrt(nx * nx + ny * ny) + 1e-9
    t = math.atan2(ny, nx)
    tri = abs(((t / math.pi) * freq) % 2.0 - 1.0)
    rings = abs((r * (freq * 0.65)) % 1.0 - 0.5) * 2.0
    m = tri * 0.65 + rings * 0.35
    return 1.0 - min(1.0, m)


def _quantum_grid(nx: float, ny: float, freq: float, phase: float) -> float:
    a = math.sin((nx + ny) * freq * math.pi + phase)
    b = math.sin((nx - ny) * (freq * 0.85) * math.pi + phase * 1.23)
    return 0.5 + 0.5 * (a * b)


def fractal_fusion_rgb(
    width: int,
    height: int,
    prompt: str,
    seed: int,
    quality: int = MIN_QUALITY,
    iterations: int = DEFAULT_FRACTAL_ITERATIONS,
    palette_index: int = 0,
    rotation: float = 0.0,
    zoom_level: float = DEFAULT_ZOOM_LEVEL,
    center_x: float = -0.15,
    center_y: float = 0.0,
    palette_profile: Optional[str] = None,
    wormhole_strength: Optional[float] = None,
    wormhole_swirl: Optional[float] = None,
    wormhole_center_x: Optional[float] = None,
    wormhole_center_y: Optional[float] = None,
    sierpinski_weight: float = 0.10,
    koch_weight: float = 0.08,
    grid_weight: float = 0.12,
) -> bytes:
    rng = random.Random(seed)
    angle = (seed % 100000) / 100000.0 * 2.0 * math.pi
    radius = 0.7885 + (rng.random() - 0.5) * 0.08
    cr = radius * math.cos(angle)
    ci = radius * math.sin(angle)

    phash = abs(hash(prompt)) if prompt else seed
    q_freq = 2.0 + (phash % 7)
    q_phase = ((phash >> 3) % 360) * math.pi / 180.0

    palette_shift = (int(palette_index) % 24) / 24.0
    pal = _palette_params(palette_profile, phash)
    base_hue = (pal["base"] + palette_shift) % 1.0
    hue_span = pal["span"]
    sat_base = pal["sat"]
    gamma = pal["gamma"]
    val_bias = pal["val_bias"]

    quality = max(MIN_QUALITY, min(MAX_QUALITY, int(quality)))
    zoom = max(MIN_ZOOM_LEVEL, float(zoom_level))
    aspect = width / max(1, height)
    span_x = zoom * (aspect if aspect >= 1 else 1.0)
    span_y = zoom * (1.0 if aspect >= 1 else 1.0 / aspect)
    cx_center, cy_center = float(center_x), float(center_y)
    rot_rad = float(rotation) * math.pi / 180.0
    rot_cos = math.cos(rot_rad)
    rot_sin = math.sin(rot_rad)

    w_strength = wormhole_strength if wormhole_strength is not None else (0.32 + rng.random() * 0.22)
    w_swirl = wormhole_swirl if wormhole_swirl is not None else (0.85 + rng.random() * 0.55)
    w_cx = wormhole_center_x if wormhole_center_x is not None else (cx_center + (rng.random() - 0.5) * 0.25)
    w_cy = wormhole_center_y if wormhole_center_y is not None else (cy_center + (rng.random() - 0.5) * 0.25)

    log2 = math.log(2.0)
    bailout = 16.0

    max_field_dim = 320
    long_side = max(width, height)
    scale = 1.0 if long_side <= max_field_dim else max_field_dim / long_side
    fw = max(2, min(width, int(round(width * scale))))
    fh = max(2, min(height, int(round(height * scale))))
    max_iter = DEFAULT_FRACTAL_ITERATIONS if fw * fh <= 200 * 200 else 90
    user_iterations = max(1, int(iterations))
    if user_iterations != DEFAULT_FRACTAL_ITERATIONS:
        max_iter = user_iterations
    max_iter *= quality

    field = [0.0] * (fw * fh)
    inv_fw = 1.0 / max(1, fw - 1)
    inv_fh = 1.0 / max(1, fh - 1)

    for y in range(fh):
        base_y = (y * inv_fh - 0.5) * span_y
        row = y * fw
        for x in range(fw):
            base_x = (x * inv_fw - 0.5) * span_x
            rot_x = base_x * rot_cos - base_y * rot_sin
            rot_y = base_x * rot_sin + base_y * rot_cos
            wx, wy = _wormhole_warp(rot_x, rot_y, w_cx, w_cy, w_strength, w_swirl)
            ix = cx_center + wx
            iy = cy_center + wy

            zr, zi = ix, iy
            j_iter = 0
            while j_iter < max_iter:
                zr2 = zr * zr
                zi2 = zi * zi
                if zr2 + zi2 > bailout:
                    break
                zi = 2.0 * zr * zi + ci
                zr = zr2 - zi2 + cr
                j_iter += 1
            if j_iter < max_iter:
                mag = math.sqrt(zr * zr + zi * zi) + 1e-9
                j_val = j_iter + 1.0 - math.log(math.log(mag) / log2 + 1e-9) / log2
            else:
                j_val = max_iter
            j_norm = j_val / max_iter

            mr, mi = 0.0, 0.0
            m_iter = 0
            while m_iter < max_iter:
                mr2 = mr * mr
                mi2 = mi * mi
                if mr2 + mi2 > bailout:
                    break
                mi = 2.0 * mr * mi + iy
                mr = mr2 - mi2 + ix
                m_iter += 1
            if m_iter < max_iter:
                mag = math.sqrt(mr * mr + mi * mi) + 1e-9
                m_val = m_iter + 1.0 - math.log(math.log(mag) / log2 + 1e-9) / log2
            else:
                m_val = max_iter
            m_norm = m_val / max_iter

            interference = 0.5 + 0.5 * math.sin(q_freq * (ix + iy) * math.pi + q_phase)
            fused = (j_norm * 0.62 + m_norm * 0.38) * (0.74 + 0.26 * interference)
            field[row + x] = fused

    def sample(fx: float, fy: float) -> float:
        if fx < 0.0:
            fx = 0.0
        elif fx > fw - 1:
            fx = fw - 1
        if fy < 0.0:
            fy = 0.0
        elif fy > fh - 1:
            fy = fh - 1
        x0 = int(fx)
        y0 = int(fy)
        x1 = x0 + 1 if x0 < fw - 1 else x0
        y1 = y0 + 1 if y0 < fh - 1 else y0
        tx = fx - x0
        ty = fy - y0
        a = field[y0 * fw + x0]
        b = field[y0 * fw + x1]
        c = field[y1 * fw + x0]
        d = field[y1 * fw + x1]
        top = a + (b - a) * tx
        bot = c + (d - c) * tx
        return top + (bot - top) * ty

    sx = (fw - 1) / max(1, width - 1)
    sy = (fh - 1) / max(1, height - 1)

    pixels = width * height
    buf = bytearray(pixels * 3)

    inv_w = 1.0 / max(1, width - 1)
    inv_h = 1.0 / max(1, height - 1)
    relief = 9.2

    for y in range(height):
        fy = y * sy
        ny = (y * inv_h - 0.5)
        i3 = y * width * 3
        for x in range(width):
            fx = x * sx
            v = sample(fx, fy)

            dx = (sample(fx - 1.0, fy) - sample(fx + 1.0, fy)) * relief
            dy = (sample(fx, fy - 1.0) - sample(fx, fy + 1.0)) * relief
            edge = min(1.0, math.sqrt(dx * dx + dy * dy) * 0.52)

            nx = (x * inv_w - 0.5)
            s_mask = _sierpinski_mask(nx, ny)
            k_mask = _koch_like_mask(nx, ny)
            grid = _quantum_grid(nx, ny, freq=7.0 + (phash % 7), phase=q_phase)
            geo = (s_mask * sierpinski_weight + k_mask * koch_weight + grid * grid_weight) * edge

            hue = (base_hue + v * hue_span * 2.2 + geo * 0.08) % 1.0
            sat = min(1.0, sat_base + 0.22 * (1.0 - v) + geo * 0.10)
            val = min(1.0, max(0.0, (0.26 + 0.86 * v + val_bias) * (0.92 + 0.18 * geo)))

            r, g, b = _hsv_to_rgb(hue, sat, val)
            rf, gf, bf = r / 255.0, g / 255.0, b / 255.0

            glow = (0.10 + 0.42 * geo) * (0.35 + 0.65 * v)
            rf += glow * 0.62
            gf += glow * 0.44
            bf += glow * 0.88

            rf = min(1.0, rf) ** gamma
            gf = min(1.0, gf) ** gamma
            bf = min(1.0, bf) ** gamma

            buf[i3] = 255 if rf >= 1.0 else int(rf * 255)
            buf[i3 + 1] = 255 if gf >= 1.0 else int(gf * 255)
            buf[i3 + 2] = 255 if bf >= 1.0 else int(bf * 255)
            i3 += 3

    return bytes(buf)


class FusionRequest(BaseModel):
    prompt: str
    strength: float = 0.75
    steps: int = 50
    seed: int = -1


class BrainRequest(BaseModel):
    prompt: Optional[str] = None
    steps: int = 8
    seed: int = -1
    mode: Literal["procedural", "diffusion", "auto"] = "procedural"
    randomize: bool = True
    realism: Literal["none", "photo"] = "none"
    size: int = 256


class BrainRouletteRequest(BaseModel):
    dataset_path: str
    steps: int = 2
    seed: int = -1
    size: int = 256
    outline: bool = True
    outline_style: Literal["color", "mono"] = "color"
    outline_thickness: int = 2


class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = ""
    width: int = 512
    height: int = 512
    steps: int = 30
    seed: int = -1
    guidance_scale: float = 7.5
    quality: int = Field(default=MIN_QUALITY, ge=MIN_QUALITY, le=MAX_QUALITY)
    iterations: int = Field(default=DEFAULT_FRACTAL_ITERATIONS, ge=1)
    palette_index: int = 0
    rotation: float = 0.0
    zoom_level: float = Field(default=DEFAULT_ZOOM_LEVEL, ge=MIN_ZOOM_LEVEL)
    center_x: float = -0.15
    center_y: float = 0.0
    palette_profile: Optional[str] = None
    wormhole_strength: Optional[float] = None
    wormhole_swirl: Optional[float] = None
    wormhole_center_x: Optional[float] = None
    wormhole_center_y: Optional[float] = None
    sierpinski_weight: float = 0.10
    koch_weight: float = 0.08
    grid_weight: float = 0.12


@app.post("/generate")
async def generate_image(payload: GenerateRequest):
    REQUESTS.labels(endpoint="/generate").inc()
    start_time = time.time()
    job_id = str(uuid.uuid4())

    width = max(64, min(1536, int(payload.width) if payload.width else 512))
    height = max(64, min(1536, int(payload.height) if payload.height else 512))
    width, height = _cap_render_dims(width, height)

    seed = payload.seed if isinstance(payload.seed, int) and payload.seed != -1 else (abs(hash(payload.prompt)) % (2**31))

    rgb = fractal_fusion_rgb(
        width,
        height,
        payload.prompt,
        seed,
        quality=payload.quality,
        iterations=payload.iterations,
        palette_index=payload.palette_index,
        rotation=payload.rotation,
        zoom_level=payload.zoom_level,
        center_x=payload.center_x,
        center_y=payload.center_y,
        palette_profile=payload.palette_profile,
        wormhole_strength=payload.wormhole_strength,
        wormhole_swirl=payload.wormhole_swirl,
        wormhole_center_x=payload.wormhole_center_x,
        wormhole_center_y=payload.wormhole_center_y,
        sierpinski_weight=payload.sierpinski_weight,
        koch_weight=payload.koch_weight,
        grid_weight=payload.grid_weight,
    )

    filename = f"gen_{job_id}_{width}x{height}.png"
    out_path = os.path.join("uploads", filename)
    write_png_rgb(out_path, width, height, rgb)
    image_url = f"/uploads/{filename}"

    latency = time.time() - start_time
    LATENCY.labels(device="mock_cpu").observe(latency)
    return {
        "success": True,
        "imageUrl": image_url,
        "meta": {
            "provider": "fusion-multi-fractal-wormhole",
            "latency": latency,
            "seed": seed,
            "width": width,
            "height": height,
            "palette_profile": payload.palette_profile,
            "wormhole": {
                "strength": payload.wormhole_strength,
                "swirl": payload.wormhole_swirl,
                "center_x": payload.wormhole_center_x,
                "center_y": payload.wormhole_center_y,
            },
            "layers": {
                "sierpinski_weight": payload.sierpinski_weight,
                "koch_weight": payload.koch_weight,
                "grid_weight": payload.grid_weight,
            },
        },
    }


@app.get("/health")
async def health():
    return {"status": "ok", "device": "mock_cpu", "timestamp": time.time()}


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/")
async def root():
    return RedirectResponse(url="/uploads")


@app.post("/fuse")
async def fuse(
    background_tasks: BackgroundTasks,
    payload: str = Form(...),
    files: list[UploadFile] = File(...),
):
    REQUESTS.labels(endpoint="/fuse").inc()
    job_id = str(uuid.uuid4())
    try:
        request_data = json.loads(payload)
        _ = FusionRequest(**request_data)
    except (json.JSONDecodeError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid request format: {e}")

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    jobs[job_id] = {"status": "upload_start", "progress": 0, "result": None, "error": None}
    for file in files:
        content = await file.read()
        if len(content) > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File {file.filename} too large")
    jobs[job_id]["status"] = "queued"
    jobs[job_id]["progress"] = 0.2
    return {"jobId": job_id}


def _open_image_or_400(data: bytes):
    if Image is None:
        raise HTTPException(status_code=500, detail="pillow_missing")
    try:
        img = Image.open(BytesIO(data))
        img = img.convert("RGB")
        return img
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_image")


@app.post("/brain/img2img")
async def brain_img2img(
    prompt: str = Form(...),
    seed: str = Form("-1"),
    steps: str = Form("6"),
    strength: str = Form("0.55"),
    size: str = Form("256"),
    realism: str = Form("none"),
    file: UploadFile = File(...),
):
    REQUESTS.labels(endpoint="/brain/img2img").inc()
    seed_int = int(seed) if seed.strip().lstrip("-").isdigit() else -1
    seed_final = seed_int if seed_int != -1 else (abs(hash(prompt)) % (2**31))
    rng = random.Random(seed_final)

    content = await file.read()
    img = _open_image_or_400(content)
    out_size = max(64, min(1024, int(size) if size.isdigit() else 256))
    img = img.resize((out_size, out_size))

    if ImageFilter is not None:
        if realism == "photo":
            img = img.filter(ImageFilter.DETAIL)
        else:
            img = img.filter(ImageFilter.EDGE_ENHANCE_MORE)

    if ImageDraw is not None:
        d = ImageDraw.Draw(img)
        for _ in range(5):
            x0 = rng.randint(0, out_size - 1)
            y0 = rng.randint(0, out_size - 1)
            x1 = min(out_size - 1, x0 + rng.randint(out_size // 10, out_size // 3))
            y1 = min(out_size - 1, y0 + rng.randint(out_size // 10, out_size // 3))
            d.rectangle([x0, y0, x1, y1], outline=(255, 255, 255), width=1)

    buf = BytesIO()
    img.save(buf, format="PNG")
    body = buf.getvalue()
    return Response(content=body, media_type="image/png")


@app.post("/brain/roulette")
async def brain_roulette(payload: BrainRouletteRequest):
    REQUESTS.labels(endpoint="/brain/roulette").inc()
    if Image is None:
        raise HTTPException(status_code=500, detail="pillow_missing")

    rng_seed = payload.seed if payload.seed != -1 else (abs(hash(payload.dataset_path)) % (2**31))
    rng = random.Random(rng_seed)
    size = max(64, min(1024, int(payload.size)))
    img = Image.new("RGB", (size, size), (210, 230, 255))
    d = ImageDraw.Draw(img)
    for _ in range(8):
        x0 = rng.randint(0, size - 1)
        y0 = rng.randint(0, size - 1)
        x1 = min(size - 1, x0 + rng.randint(size // 12, size // 2))
        y1 = min(size - 1, y0 + rng.randint(size // 12, size // 2))
        col = (245, 245, 245) if payload.outline_style == "mono" else (240, 250, 255)
        d.rectangle([x0, y0, x1, y1], outline=col, width=max(1, payload.outline_thickness))

    buf = BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")

