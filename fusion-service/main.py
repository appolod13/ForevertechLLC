import os
import time
import uuid
import asyncio
from typing import Optional, List, Literal, Dict, Any
from io import BytesIO
import struct
import zlib
import binascii
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response, RedirectResponse
from fastapi.staticfiles import StaticFiles
import json
try:
    from PIL import Image  # type: ignore
except Exception:
    Image = None  # type: ignore

# --- Mocked AI Generation for compatibility with Python 3.14 ---
# Removed torch, diffusers, etc. to allow the service to run locally.

app = FastAPI(title="Fusion Service (Mocked)")

import random
import glob

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    chunk = tag + data
    return struct.pack("!I", len(data)) + chunk + struct.pack("!I", binascii.crc32(chunk) & 0xFFFFFFFF)


def write_png_rgb(path: str, width: int, height: int, rgb: bytes) -> None:
    if len(rgb) != width * height * 3:
        raise ValueError("invalid_rgb_buffer")
    rows = []
    stride = width * 3
    for y in range(height):
        rows.append(b"\x00" + rgb[y * stride : (y + 1) * stride])
    raw = b"".join(rows)
    compressed = zlib.compress(raw, level=6)
    ihdr = struct.pack("!IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png = PNG_SIGNATURE + _png_chunk(b"IHDR", ihdr) + _png_chunk(b"IDAT", compressed) + _png_chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def _blend_channel(dst: int, src: int, a: int) -> int:
    return (dst * (255 - a) + src * a + 127) // 255


def procedural_rgb(width: int, height: int, prompt: str, seed: int) -> bytes:
    rng = random.Random(seed)
    buf = bytearray(width * height * 3)

    top = (rng.randint(5, 40), rng.randint(10, 60), rng.randint(30, 90))
    bottom = (rng.randint(90, 180), rng.randint(90, 180), rng.randint(130, 220))
    for y in range(height):
        t = y / max(1, height - 1)
        r = int(top[0] * (1 - t) + bottom[0] * t)
        g = int(top[1] * (1 - t) + bottom[1] * t)
        b = int(top[2] * (1 - t) + bottom[2] * t)
        row_start = y * width * 3
        for x in range(width):
            i = row_start + x * 3
            buf[i] = r
            buf[i + 1] = g
            buf[i + 2] = b

    shape_count = max(12, min(80, (width * height) // 25000))
    for _ in range(shape_count):
        x0 = rng.randint(-width // 10, width)
        y0 = rng.randint(-height // 10, height)
        x1 = x0 + rng.randint(max(8, width // 40), max(12, width // 3))
        y1 = y0 + rng.randint(max(8, height // 40), max(12, height // 3))
        r = rng.randint(40, 255)
        g = rng.randint(40, 255)
        b = rng.randint(40, 255)
        a = rng.randint(25, 110)
        x_min = max(0, min(x0, x1))
        x_max = min(width - 1, max(x0, x1))
        y_min = max(0, min(y0, y1))
        y_max = min(height - 1, max(y0, y1))

        if rng.random() < 0.55:
            cx = (x_min + x_max) / 2.0
            cy = (y_min + y_max) / 2.0
            rx = max(1.0, (x_max - x_min) / 2.0)
            ry = max(1.0, (y_max - y_min) / 2.0)
            inv_rx2 = 1.0 / (rx * rx)
            inv_ry2 = 1.0 / (ry * ry)
            for yy in range(y_min, y_max + 1):
                dy = yy - cy
                dy2 = (dy * dy) * inv_ry2
                row_start = yy * width * 3
                for xx in range(x_min, x_max + 1):
                    dx = xx - cx
                    if (dx * dx) * inv_rx2 + dy2 <= 1.0:
                        i = row_start + xx * 3
                        buf[i] = _blend_channel(buf[i], r, a)
                        buf[i + 1] = _blend_channel(buf[i + 1], g, a)
                        buf[i + 2] = _blend_channel(buf[i + 2], b, a)
        else:
            for yy in range(y_min, y_max + 1):
                row_start = yy * width * 3
                for xx in range(x_min, x_max + 1):
                    i = row_start + xx * 3
                    buf[i] = _blend_channel(buf[i], r, a)
                    buf[i + 1] = _blend_channel(buf[i + 1], g, a)
                    buf[i + 2] = _blend_channel(buf[i + 2], b, a)

    return bytes(buf)

def _hsv_to_rgb(h: float, s: float, v: float):
    # h in [0,1), s,v in [0,1] -> (r,g,b) 0..255
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


def _cap_render_dims(width: int, height: int, max_side: int = 448):
    """Cap the longest side to keep the pure-Python render under the request
    timeout on Render's CPU, preserving aspect ratio."""
    long_side = max(width, height)
    if long_side <= max_side:
        return width, height
    scale = max_side / long_side
    return max(64, int(round(width * scale))), max(64, int(round(height * scale)))


def fractal_fusion_rgb(
    width: int,
    height: int,
    prompt: str,
    seed: int,
    quality: int = 1,
    iterations: int = 130,
    palette_index: int = 0,
    rotation: float = 0.0,
    zoom_level: float = 1.45,
    center_x: float = -0.15,
    center_y: float = 0.0,
) -> bytes:
    """Pure-Python Julia + Mandelbrot fusion with quantum-style interference
    and pseudo-3D normal shading. No third-party deps, so it stays compatible
    with the lightweight Render deploy."""
    import math

    rng = random.Random(seed)

    # Julia constant orbits a circle in the complex plane, seeded for variety.
    angle = (seed % 100000) / 100000.0 * 2.0 * math.pi
    radius = 0.7885 + (rng.random() - 0.5) * 0.08
    cr = radius * math.cos(angle)
    ci = radius * math.sin(angle)

    # Quantum interference parameters derived from the prompt for determinism.
    phash = abs(hash(prompt)) if prompt else seed
    q_freq = 2.0 + (phash % 7)
    q_phase = ((phash >> 3) % 360) * math.pi / 180.0
    base_hue = (phash % 360) / 360.0
    palette_shift = (int(palette_index) % 24) / 24.0
    base_hue = (base_hue + palette_shift) % 1.0

    # Complex-plane viewport (slightly zoomed, centered for a rich composition).
    quality = max(1, min(3, int(quality)))
    zoom = max(0.05, float(zoom_level))
    aspect = width / max(1, height)
    span_x = zoom * (aspect if aspect >= 1 else 1.0)
    span_y = zoom * (1.0 if aspect >= 1 else 1.0 / aspect)
    cx_center, cy_center = float(center_x), float(center_y)
    rot_rad = float(rotation) * math.pi / 180.0
    rot_cos = math.cos(rot_rad)
    rot_sin = math.sin(rot_rad)

    log2 = math.log(2.0)
    bailout = 16.0

    # Performance: the escape-time loops are the bottleneck, so compute the
    # fused field on a capped low-res grid, then bilinearly upscale into the
    # full-resolution shading/color pass. Keeps the look, ~10x faster on Render.
    MAX_FIELD_DIM = 320
    long_side = max(width, height)
    scale = 1.0 if long_side <= MAX_FIELD_DIM else MAX_FIELD_DIM / long_side
    fw = max(2, min(width, int(round(width * scale))))
    fh = max(2, min(height, int(round(height * scale))))
    max_iter = (130 if fw * fh <= 200 * 200 else 90) * quality
    user_iterations = max(1, int(iterations))
    if user_iterations != 130:
        max_iter = user_iterations

    # Pass 1: compute the fused smooth-escape field on the low-res grid.
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
            ix = cx_center + rot_x
            iy = cy_center + rot_y

            # Julia: fixed c, varying z.
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

            # Mandelbrot: c = pixel, z starts at 0.
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

            # Quantum-style interference (the extra "dimension").
            interference = 0.5 + 0.5 * math.sin(q_freq * (ix + iy) * math.pi + q_phase)

            fused = (j_norm * 0.62 + m_norm * 0.38) * (0.75 + 0.25 * interference)
            field[row + x] = fused

    # Bilinearly sample the low-res field at full resolution.
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

    # Pass 2: cinematic, radiant pseudo-3D shading -> "heavenly / god's eye" look.
    # We add a strong key light + specular highlights for sculpted 3D relief, a
    # divine central glow (god rays / heaven's door), bloom on bright crests, a
    # vivid saturated palette, and a gamma lift so everything reads brighter.
    pixels = width * height
    buf = bytearray(pixels * 3)

    # Key light (sculpts the 3D form) - steep angle for dramatic relief.
    light_x, light_y, light_z = -0.55, -0.65, 0.52
    lnorm = math.sqrt(light_x * light_x + light_y * light_y + light_z * light_z)
    light_x, light_y, light_z = light_x / lnorm, light_y / lnorm, light_z / lnorm
    # Rim/fill light from the opposite side for extra dimensional pop.
    rim_x, rim_y, rim_z = 0.6, 0.45, 0.3
    rnorm = math.sqrt(rim_x * rim_x + rim_y * rim_y + rim_z * rim_z)
    rim_x, rim_y, rim_z = rim_x / rnorm, rim_y / rnorm, rim_z / rnorm
    # View direction (toward camera) for specular reflection.
    view_z = 1.0
    relief = 9.5  # stronger normal displacement = deeper 3D

    inv_w = 1.0 / max(1, width - 1)
    inv_h = 1.0 / max(1, height - 1)
    gamma = 1.0 / 1.18  # <1 brightens midtones (gentle lift)

    for y in range(height):
        fy = y * sy
        ny = (y * inv_h - 0.5)
        i3 = y * width * 3
        for x in range(width):
            fx = x * sx
            v = sample(fx, fy)

            # Surface normal from the field gradient.
            dx = (sample(fx - 1.0, fy) - sample(fx + 1.0, fy)) * relief
            dy = (sample(fx, fy - 1.0) - sample(fx, fy + 1.0)) * relief
            nz = 1.0
            nlen = math.sqrt(dx * dx + dy * dy + nz * nz)
            nx, ny_n, nz_n = dx / nlen, dy / nlen, nz / nlen

            # Diffuse from key light + softer rim light.
            diffuse = max(0.0, nx * light_x + ny_n * light_y + nz_n * light_z)
            rim = max(0.0, nx * rim_x + ny_n * rim_y + nz_n * rim_z)

            # Specular highlight (Blinn-ish) -> glossy 3D crests.
            hx, hy, hz = light_x, light_y, light_z + view_z
            hl = math.sqrt(hx * hx + hy * hy + hz * hz) + 1e-9
            spec_dot = max(0.0, (nx * hx + ny_n * hy + nz_n * hz) / hl)
            spec = spec_dot ** 28

            shade = 0.30 + 0.85 * diffuse + 0.25 * rim

            # Divine central glow: a soft luminous core like light through
            # heaven's doors / a glowing iris. Kept subtle so the fractal
            # structure stays crisp and vivid rather than blown out.
            nx_c = (x * inv_w - 0.5)
            dist2 = nx_c * nx_c + ny * ny
            glow = math.exp(-dist2 * 14.0) * 0.40   # tight, gentle core
            halo = math.exp(-dist2 * 4.0) * 0.16    # wide soft halo

            # Vivid, ethereal palette: gold/amber core easing into deep azure
            # and magenta in the depths, cycling for fractal richness.
            hue = (base_hue + v * 2.4 + 0.08 * interference_hue(q_phase)) % 1.0
            sat = 0.78 + 0.22 * (1.0 - v)
            val = (0.28 + 0.85 * v) * shade

            r, g, b = _hsv_to_rgb(hue, min(1.0, sat), min(1.0, val))
            rf, gf, bf = r / 255.0, g / 255.0, b / 255.0

            # Add the warm divine glow (golden-white). Modulated by the field
            # value so the glow illuminates the fractal structure instead of
            # washing the center into flat white.
            glow_mod = glow * (0.45 + 0.55 * v)
            halo_mod = halo * (0.4 + 0.6 * v)
            rf += glow_mod * 0.85 + halo_mod * 0.30
            gf += glow_mod * 0.72 + halo_mod * 0.26
            bf += glow_mod * 0.48 + halo_mod * 0.32

            # Specular adds a near-white sparkle on crests.
            rf += spec * 0.85
            gf += spec * 0.85
            bf += spec * 0.95

            # Bloom: let very bright crests bleed a little for a radiant feel.
            luma = 0.299 * rf + 0.587 * gf + 0.114 * bf
            if luma > 0.85:
                bloom = (luma - 0.85) * 0.5
                rf += bloom
                gf += bloom
                bf += bloom

            # Gamma lift for overall brightness, then tone-map / clamp.
            rf = rf ** gamma
            gf = gf ** gamma
            bf = bf ** gamma

            buf[i3] = 255 if rf >= 1.0 else int(rf * 255)
            buf[i3 + 1] = 255 if gf >= 1.0 else int(gf * 255)
            buf[i3 + 2] = 255 if bf >= 1.0 else int(bf * 255)
            i3 += 3

    return bytes(buf)


def interference_hue(phase: float) -> float:
    """Small deterministic hue shimmer derived from the quantum phase so the
    palette feels alive without breaking determinism."""
    import math
    return 0.5 + 0.5 * math.sin(phase)


class MockTrainer:
    device = "mock_cpu"
    style_memory = None
    style_memory_path = "mock_path"
    shape_memory = None
    shape_memory_path = "mock_path"

    async def train(self, tensors, prompt, job_callback=None):
        if job_callback:
            await job_callback("training", 0.5)
        return "mock_pipe"

    def generate(self, pipe, prompt, strength, steps, seed):
        if Image is None:
            raise RuntimeError("pillow_missing")
        return Image.new("RGB", (512, 512), (160, 180, 220))

    def brain_roulette(self, dataset_path, steps, size):
        images = []
        if os.path.exists(dataset_path):
            for ext in ('*.png', '*.jpg', '*.jpeg', '*.webp'):
                images.extend(glob.glob(os.path.join(dataset_path, ext)))
        
        if images:
            if Image is None:
                raise RuntimeError("pillow_missing")
            base_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            for i, img_path in enumerate(images):
                try:
                    with Image.open(img_path) as im:
                        img = im.convert("RGBA").resize((size, size))
                        alpha = 1.0 / (i + 1)
                        base_img = Image.blend(base_img, img, alpha)
                except Exception:
                    pass
            # Create a randomized overlay or tint to make each generation unique
            r, g, b = random.randint(0, 50), random.randint(0, 50), random.randint(0, 50)
            tint = Image.new("RGBA", (size, size), (r, g, b, 50))
            base_img = Image.alpha_composite(base_img, tint)
            final_img = base_img.convert("RGB")
        else:
            if Image is None:
                raise RuntimeError("pillow_missing")
            final_img = Image.new("RGB", (size, size), (255, 100, 100))
            
        return final_img, {"mode": "roulette", "dataset": dataset_path, "blended_count": len(images)}

class MockProcessor:
    async def process_uploads(self, file_paths):
        return []

    def compute_clip_similarity(self, image, prompt):
        return 0.85
        
    def to_outline_rgba(self, image, line_color, thickness):
        return image.convert("RGBA")
        
    def to_outline_color_rgba(self, image, thickness):
        return image.convert("RGBA")
        
    def create_tshirt_mockup(self, design, outline_only=False):
        # Return the design directly as the mockup for simplicity in the mock
        return design

processor = MockProcessor()
trainer = MockTrainer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REQUESTS = Counter('fusion_requests_total', 'Total requests to Fusion API', ['endpoint'])
LATENCY = Histogram('fusion_request_latency_seconds', 'Latency of Fusion requests', ['device'])
CLIP_SCORE = Histogram("fusion_clip_score", "CLIP similarity scores")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/ui", StaticFiles(directory="web", html=True), name="ui")

jobs = {}

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

class StyleFitRequest(BaseModel):
    dataset_path: str
    style_name: str = "default"
    limit: int = 200
    resize: int = 128

class ShapeFitRequest(BaseModel):
    dataset_path: str
    style_name: str = "default"
    limit: int = 200
    resize: int = 256

class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = ""
    width: int = 512
    height: int = 512
    steps: int = 30
    seed: int = -1
    guidance_scale: float = 7.5
    quality: int = 1
    iterations: int = 130
    palette_index: int = 0
    rotation: float = 0.0
    zoom_level: float = 1.45
    center_x: float = -0.15
    center_y: float = 0.0

@app.post("/generate")
async def generate_image(payload: GenerateRequest):
    REQUESTS.labels(endpoint="/generate").inc()
    start_time = time.time()
    job_id = str(uuid.uuid4())

    width = int(payload.width) if payload.width else 512
    height = int(payload.height) if payload.height else 512
    width = max(64, min(1536, width))
    height = max(64, min(1536, height))
    # Cap the actual raster size so the pure-Python shading pass stays well under
    # the site's request timeout on Render's CPU. The image is displayed scaled.
    width, height = _cap_render_dims(width, height)
    seed = payload.seed if isinstance(payload.seed, int) and payload.seed != -1 else (abs(hash(payload.prompt)) % (2**31))

    try:
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
        )
        provider = "fusion-julia-mandelbrot-3d"
    except Exception as e:
        print(f"[fusion] fractal generation failed, falling back to procedural: {e}")
        rgb = procedural_rgb(width, height, payload.prompt, seed)
        provider = "fusion-service-procedural"
    os.makedirs("uploads", exist_ok=True)
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
            "provider": provider,
            "latency": latency,
            "seed": seed,
            "width": width,
            "height": height
        }
    }

@app.get("/health")
async def health():
    return {"status": "ok", "device": "mock_cpu", "timestamp": time.time()}

@app.get("/")
async def root():
    return RedirectResponse(url="/ui/randomize.html")

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/fuse")
async def fuse(
    background_tasks: BackgroundTasks,
    payload: str = Form(...),
    files: List[UploadFile] = File(...)
):
    REQUESTS.labels(endpoint="/fuse").inc()
    job_id = str(uuid.uuid4())

    try:
        request_data = json.loads(payload)
        fusion_request = FusionRequest(**request_data)
    except (json.JSONDecodeError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid request format: {e}")

    # Store job status
    jobs[job_id] = {
        "status": "upload_start",
        "progress": 0,
        "result": None,
        "error": None
    }
    
    # Save uploaded files to a temporary directory for the background task
    file_paths = []
    # Ensure the base uploads directory exists
    os.makedirs("uploads", exist_ok=True)
    for file in files:
        # Use a unique filename to avoid collisions
        _, extension = os.path.splitext(file.filename)
        temp_filename = f"{job_id}_{uuid.uuid4()}{extension}"
        file_path = os.path.join("uploads", temp_filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        file_paths.append(file_path)

    # Background task for fusion pipeline, passing file paths instead of UploadFile objects
    background_tasks.add_task(run_fusion_pipeline, job_id, fusion_request, file_paths)
    
    return {"jobId": job_id}


@app.post("/brain")
async def brain_generate(payload: BrainRequest):
    REQUESTS.labels(endpoint="/brain").inc()
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "brain_start", "progress": 0, "result": None, "error": None}
    start_time = time.time()
    try:
        jobs[job_id]["status"] = "brain_generate"
        jobs[job_id]["progress"] = 0.3
        design, meta = trainer.brain_generate(
            prompt=payload.prompt,
            seed=payload.seed,
            steps=payload.steps,
            mode=payload.mode,
            randomize=payload.randomize,
            realism=payload.realism,
        )

        jobs[job_id]["status"] = "brain_mockup"
        jobs[job_id]["progress"] = 0.7
        mockup = processor.create_tshirt_mockup(design)

        filename = f"brain_{job_id}.png"
        path = os.path.join("uploads", filename)
        mockup.save(path)

        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 1.0
        jobs[job_id]["result"] = f"/uploads/{filename}"
        jobs[job_id]["meta"] = meta

        latency = time.time() - start_time
        LATENCY.labels(device=trainer.device).observe(latency)

        buf = BytesIO()
        mockup.save(buf, format="PNG")
        body = buf.getvalue()
        headers = {
            "X-Job-Id": job_id,
            "X-Image-Url": jobs[job_id]["result"],
            "X-Emotion": str(meta.get("emotion", "")),
            "X-Seed": str(meta.get("seed", "")),
        }
        return Response(content=body, media_type="image/png", headers=headers)
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        raise


@app.post("/brain/img2img")
async def brain_img2img(
    prompt: str = Form(...),
    negative_prompt: str = Form(""),
    file: UploadFile = File(...),
    seed: int = Form(-1),
    steps: int = Form(12),
    strength: float = Form(0.55),
    guidance_scale: float = Form(7.0),
    size: int = Form(512),
    realism: Literal["none", "photo"] = Form("photo"),
):
    REQUESTS.labels(endpoint="/brain/img2img").inc()
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "img2img_start", "progress": 0, "result": None, "error": None}
    start_time = time.time()
    try:
        jobs[job_id]["status"] = "img2img_decode"
        jobs[job_id]["progress"] = 0.15

        raw = await file.read()
        try:
            init_image = Image.open(BytesIO(raw)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image upload")

        jobs[job_id]["status"] = "img2img_generate"
        jobs[job_id]["progress"] = 0.55
        design, meta = trainer.brain_img2img(
            init_image=init_image,
            prompt=prompt,
            negative_prompt=negative_prompt,
            seed=seed,
            steps=steps,
            strength=strength,
            guidance_scale=guidance_scale,
            size=size,
            realism=realism,
        )

        jobs[job_id]["status"] = "img2img_mockup"
        jobs[job_id]["progress"] = 0.85
        mockup = processor.create_tshirt_mockup(design)

        filename = f"img2img_{job_id}.png"
        path = os.path.join("uploads", filename)
        mockup.save(path)

        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 1.0
        jobs[job_id]["result"] = f"/uploads/{filename}"
        jobs[job_id]["meta"] = meta

        latency = time.time() - start_time
        LATENCY.labels(device=trainer.device).observe(latency)

        buf = BytesIO()
        mockup.save(buf, format="PNG")
        body = buf.getvalue()
        headers = {
            "X-Job-Id": job_id,
            "X-Image-Url": jobs[job_id]["result"],
            "X-Seed": str(meta.get("seed", "")),
            "X-Mode": str(meta.get("mode", "")),
        }
        return Response(content=body, media_type="image/png", headers=headers)
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        raise


@app.post("/brain/roulette")
async def brain_roulette(payload: Dict[str, Any] = Body(default={})):
    REQUESTS.labels(endpoint="/brain/roulette").inc()
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "roulette_start", "progress": 0, "result": None, "error": None}
    start_time = time.time()
    try:
        size = int(payload.get("size") or 512)
        size = max(64, min(1024, size))
        size, _ = _cap_render_dims(size, size)
        prompt = str(payload.get("prompt") or "quantum fusion roulette julia mandelbrot art")
        provided_seed = payload.get("seed")
        seed = int(provided_seed) if isinstance(provided_seed, int) and provided_seed != -1 else random.randint(0, 2**31 - 1)

        jobs[job_id]["status"] = "roulette_generate"
        jobs[job_id]["progress"] = 0.55

        # Pure-stdlib fractal fusion render (no Pillow dependency).
        try:
            rgb = fractal_fusion_rgb(size, size, prompt, seed)
            provider = "fusion-julia-mandelbrot-3d"
        except Exception as e:
            print(f"[fusion] roulette fractal failed, falling back to procedural: {e}")
            rgb = procedural_rgb(size, size, prompt, seed)
            provider = "fusion-service-procedural"

        jobs[job_id]["status"] = "roulette_render"
        jobs[job_id]["progress"] = 0.85

        os.makedirs("uploads", exist_ok=True)
        filename = f"roulette_{job_id}.png"
        path = os.path.join("uploads", filename)
        write_png_rgb(path, size, size, rgb)
        with open(path, "rb") as fh:
            body = fh.read()

        meta = {"mode": "roulette", "provider": provider, "seed": seed, "prompt": prompt, "size": size}
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 1.0
        jobs[job_id]["result"] = f"/uploads/{filename}"
        jobs[job_id]["meta"] = meta

        latency = time.time() - start_time
        LATENCY.labels(device=trainer.device).observe(latency)

        headers = {
            "X-Job-Id": job_id,
            "X-Image-Url": jobs[job_id]["result"],
            "X-Seed": str(seed),
            "X-Mode": "roulette",
            "X-Prompt": prompt,
            "X-Provider": provider,
        }
        return Response(content=body, media_type="image/png", headers=headers)
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        raise


@app.get("/brain/style")
async def brain_style_status():
    REQUESTS.labels(endpoint="/brain/style").inc()
    mem = trainer.style_memory
    if mem is None:
        return {"loaded": False, "styleMemoryPath": trainer.style_memory_path}
    return {"loaded": True, "styleMemoryPath": trainer.style_memory_path, **mem.__dict__}


@app.post("/brain/style/fit")
async def brain_style_fit(payload: StyleFitRequest):
    REQUESTS.labels(endpoint="/brain/style/fit").inc()
    result = trainer.fit_style_memory(
        dataset_path=payload.dataset_path,
        style_name=payload.style_name,
        limit=payload.limit,
        resize=payload.resize,
        save_path=trainer.style_memory_path,
    )
    return {"ok": True, **result}


@app.get("/brain/shape")
async def brain_shape_status():
    REQUESTS.labels(endpoint="/brain/shape").inc()
    mem = trainer.shape_memory
    if mem is None:
        return {"loaded": False, "shapeMemoryPath": trainer.shape_memory_path}
    return {"loaded": True, "shapeMemoryPath": trainer.shape_memory_path, **mem.__dict__}


@app.post("/brain/shape/fit")
async def brain_shape_fit(payload: ShapeFitRequest):
    REQUESTS.labels(endpoint="/brain/shape/fit").inc()
    result = trainer.fit_shape_memory(
        dataset_path=payload.dataset_path,
        style_name=payload.style_name,
        limit=payload.limit,
        resize=payload.resize,
        save_path=trainer.shape_memory_path,
    )
    return {"ok": True, **result}

@app.websocket("/progress/{job_id}")
async def progress_websocket(websocket: WebSocket, job_id: str):
    await websocket.accept()
    try:
        while True:
            if job_id in jobs:
                status = jobs[job_id]
                await websocket.send_json(status)
                if status["status"] in ["done", "error"]:
                    break
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass

async def run_fusion_pipeline(job_id: str, request: FusionRequest, file_paths: List[str]):
    start_time = time.time()
    try:
        # 1. Upload and Preprocess
        jobs[job_id]["status"] = "preprocess_start"
        tensors = await processor.process_uploads(file_paths)
        jobs[job_id]["status"] = "preprocess_done"
        jobs[job_id]["progress"] = 0.2

        # 2. Fine-tune
        jobs[job_id]["status"] = "train_start"
        
        async def job_callback(status, progress):
            jobs[job_id]["status"] = status
            jobs[job_id]["progress"] = 0.2 + (progress * 0.6)

        pipe = await trainer.train(tensors, request.prompt, job_callback=job_callback)
        
        # 3. Generate
        jobs[job_id]["status"] = "generate_start"
        image = trainer.generate(pipe, request.prompt, request.strength, request.steps, request.seed)
        
        # 4. Finalize
        result_filename = f"result_{job_id}.png"
        result_path = os.path.join("uploads", result_filename)
        image.save(result_path)
        
        # Compute CLIP score for metrics
        similarity = processor.compute_clip_similarity(image, request.prompt)
        CLIP_SCORE.observe(similarity)
        
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 1.0
        jobs[job_id]["result"] = f"/uploads/{result_filename}"
        
        latency = time.time() - start_time
        LATENCY.labels(device=trainer.device).observe(latency)

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        print(f"Error in job {job_id}: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
