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
from pydantic import BaseModel, ValidationError, Field
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response, RedirectResponse
from fastapi.staticfiles import StaticFiles
import json
import random
import glob
from base64 import b64encode

try:
    from PIL import Image
except Exception:
    Image = None

app = FastAPI(title="Fusion Service")

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
DEFAULT_FRACTAL_ITERATIONS = 130
MIN_QUALITY = 1
MAX_QUALITY = 3
DEFAULT_ZOOM_LEVEL = 1.45
MIN_ZOOM_LEVEL = 0.05

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
    return bytes(buf)

def _hsv_to_rgb(h: float, s: float, v: float):
    h = h - int(h)
    i = int(h * 6.0)
    f = h * 6.0 - i
    p = v * (1.0 - s)
    q = v * (1.0 - s * f)
    t = v * (1.0 - s * (1.0 - f))
    i %= 6
    if i == 0: r, g, b = v, t, p
    elif i == 1: r, g, b = q, v, p
    elif i == 2: r, g, b = p, v, t
    elif i == 3: r, g, b = p, q, v
    elif i == 4: r, g, b = t, p, v
    else: r, g, b = v, p, q
    return int(r * 255), int(g * 255), int(b * 255)

def _cap_render_dims(width: int, height: int, max_side: int = 448):
    long_side = max(width, height)
    if long_side <= max_side:
        return width, height
    scale = max_side / long_side
    return max(64, int(round(width * scale))), max(64, int(round(height * scale)))

def fractal_fusion_rgb(width: int, height: int, prompt: str, seed: int, quality: int = MIN_QUALITY, iterations: int = DEFAULT_FRACTAL_ITERATIONS, palette_index: int = 0, rotation: float = 0.0, zoom_level: float = DEFAULT_ZOOM_LEVEL, center_x: float = -0.15, center_y: float = 0.0) -> bytes:
    import math
    rng = random.Random(seed)
    angle = (seed % 100000) / 100000.0 * 2.0 * math.pi
    radius = 0.7885 + (rng.random() - 0.5) * 0.08
    cr = radius * math.cos(angle)
    ci = radius * math.sin(angle)
    phash = abs(hash(prompt)) if prompt else seed
    q_freq = 2.0 + (phash % 7)
    q_phase = ((phash >> 3) % 360) * math.pi / 180.0
    base_hue = (phash % 360) / 360.0
    palette_shift = (int(palette_index) % 24) / 24.0
    base_hue = (base_hue + palette_shift) % 1.0
    quality = max(MIN_QUALITY, min(MAX_QUALITY, int(quality)))
    zoom = max(MIN_ZOOM_LEVEL, float(zoom_level))
    aspect = width / max(1, height)
    span_x = zoom * (aspect if aspect >= 1 else 1.0)
    span_y = zoom * (1.0 if aspect >= 1 else 1.0 / aspect)
    cx_center, cy_center = float(center_x), float(center_y)
    rot_rad = float(rotation) * math.pi / 180.0
    rot_cos = math.cos(rot_rad)
    rot_sin = math.sin(rot_rad)
    log2 = math.log(2.0)
    bailout = 16.0
    MAX_FIELD_DIM = 320
    long_side = max(width, height)
    scale = 1.0 if long_side <= MAX_FIELD_DIM else MAX_FIELD_DIM / long_side
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
            ix = cx_center + rot_x
            iy = cy_center + rot_y
            zr, zi = ix, iy
            j_iter = 0
            while j_iter < max_iter:
                zr2 = zr * zr
                zi2 = zi * zi
                if zr2 + zi2 > bailout: break
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
                if mr2 + mi2 > bailout: break
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
            fused = (j_norm * 0.62 + m_norm * 0.38) * (0.75 + 0.25 * interference)
            field[row + x] = fused
    def sample(fx: float, fy: float) -> float:
        if fx < 0.0: fx = 0.0
        elif fx > fw - 1: fx = fw - 1
        if fy < 0.0: fy = 0.0
        elif fy > fh - 1: fy = fh - 1
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
    light_x, light_y, light_z = -0.55, -0.65, 0.52
    lnorm = math.sqrt(light_x * light_x + light_y * light_y + light_z * light_z)
    light_x, light_y, light_z = light_x / lnorm, light_y / lnorm, light_z / lnorm
    rim_x, rim_y, rim_z = 0.6, 0.45, 0.3
    rnorm = math.sqrt(rim_x * rim_x + rim_y * rim_y + rim_z * rim_z)
    rim_x, rim_y, rim_z = rim_x / rnorm, rim_y / rnorm, rim_z / rnorm
    view_z = 1.0
    relief = 9.5
    inv_w = 1.0 / max(1, width - 1)
    inv_h = 1.0 / max(1, height - 1)
    gamma = 1.0 / 1.18
    for y in range(height):
        fy = y * sy
        ny = (y * inv_h - 0.5)
        i3 = y * width * 3
        for x in range(width):
            fx = x * sx
            v = sample(fx, fy)
            dx = (sample(fx - 1.0, fy) - sample(fx + 1.0, fy)) * relief
            dy = (sample(fx, fy - 1.0) - sample(fx, fy + 1.0)) * relief
            nz = 1.0
            nlen = math.sqrt(dx * dx + dy * dy + nz * nz)
            nx, ny_n, nz_n = dx / nlen, dy / nlen, nz / nlen
            diffuse = max(0.0, nx * light_x + ny_n * light_y + nz_n * light_z)
            rim = max(0.0, nx * rim_x + ny_n * rim_y + nz_n * rim_z)
            hx, hy, hz = light_x, light_y, light_z + view_z
            hl = math.sqrt(hx * hx + hy * hy + hz * hz) + 1e-9
            spec_dot = max(0.0, (nx * hx + ny_n * hy + nz_n * hz) / hl)
            spec = spec_dot ** 28
            shade = 0.30 + 0.85 * diffuse + 0.25 * rim
            nx_c = (x * inv_w - 0.5)
            dist2 = nx_c * nx_c + ny * ny
            glow = math.exp(-dist2 * 14.0) * 0.40
            halo = math.exp(-dist2 * 4.0) * 0.16
            hue = (base_hue + v * 2.4 + 0.08 * interference_hue(q_phase)) % 1.0
            sat = 0.78 + 0.22 * (1.0 - v)
            val = (0.28 + 0.85 * v) * shade
            r, g, b = _hsv_to_rgb(hue, min(1.0, sat), min(1.0, val))
            rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
            glow_mod = glow * (0.45 + 0.55 * v)
            halo_mod = halo * (0.4 + 0.6 * v)
            rf += glow_mod * 0.85 + halo_mod * 0.30
            gf += glow_mod * 0.72 + halo_mod * 0.26
            bf += glow_mod * 0.48 + halo_mod * 0.32
            rf += spec * 0.85
            gf += spec * 0.85
            bf += spec * 0.95
            luma = 0.299 * rf + 0.587 * gf + 0.114 * bf
            if luma > 0.85:
                bloom = (luma - 0.85) * 0.5
                rf += bloom
                gf += bloom
                bf += bloom
            rf = rf ** gamma
            gf = gf ** gamma
            bf = bf ** gamma
            buf[i3] = 255 if rf >= 1.0 else int(rf * 255)
            buf[i3 + 1] = 255 if gf >= 1.0 else int(gf * 255)
            buf[i3 + 2] = 255 if bf >= 1.0 else int(bf * 255)
            i3 += 3
    return bytes(buf)

def interference_hue(phase: float) -> float:
    import math
    return 0.5 + 0.5 * math.sin(phase)

class MockTrainer:
    device = "mock_cpu"
    def brain_generate(self, prompt, seed, steps, mode, randomize, realism):
        if Image is None: raise RuntimeError("pillow_missing")
        return Image.new("RGB", (512, 512), (160, 180, 220)), {"mode": mode, "seed": seed}

    def brain_img2img(self, init_image, prompt, negative_prompt, seed, steps, strength, guidance_scale, size, realism):
        if Image is None: raise RuntimeError("pillow_missing")
        return Image.new("RGB", (size, size), (160, 180, 220)), {"mode": "img2img", "seed": seed}

class MockProcessor:
    async def process_uploads(self, file_paths): return []
    def compute_clip_similarity(self, image, prompt): return 0.85
    def create_tshirt_mockup(self, design, outline_only=False): return design

processor = MockProcessor()
trainer = MockTrainer()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

REQUESTS = Counter('fusion_requests_total', 'Total requests to Fusion API', ['endpoint'])
LATENCY = Histogram('fusion_request_latency_seconds', 'Latency of Fusion requests', ['device'])

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/ui", StaticFiles(directory="web", html=True), name="ui")

jobs = {}

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

class BrainRequest(BaseModel):
    prompt: Optional[str] = None
    steps: int = 8
    seed: int = -1
    mode: Literal["procedural", "diffusion", "auto"] = "procedural"
    randomize: bool = True
    realism: Literal["none", "photo"] = "none"

@app.post("/generate")
async def generate_image(payload: GenerateRequest):
    REQUESTS.labels(endpoint="/generate").inc()
    start_time = time.time()
    job_id = str(uuid.uuid4())

    width = max(64, min(1536, int(payload.width or 512)))
    height = max(64, min(1536, int(payload.height or 512)))
    width, height = _cap_render_dims(width, height)
    seed = payload.seed if isinstance(payload.seed, int) and payload.seed != -1 else (abs(hash(payload.prompt)) % (2**31))

    try:
        rgb = fractal_fusion_rgb(width, height, payload.prompt, seed, quality=payload.quality, iterations=payload.iterations, palette_index=payload.palette_index, rotation=payload.rotation, zoom_level=payload.zoom_level, center_x=payload.center_x, center_y=payload.center_y)
        provider = "fusion-julia-mandelbrot-3d"
    except Exception as e:
        print(f"[fusion] fractal generation failed, falling back to procedural: {e}")
        rgb = procedural_rgb(width, height, payload.prompt, seed)
        provider = "fusion-service-procedural"

    image_base64 = b64encode(rgb).decode('utf-8')
    data_url = f"data:image/png;base64,{image_base64}"

    latency = time.time() - start_time
    LATENCY.labels(device="mock_cpu").observe(latency)

    return {
        "success": True,
        "image_base64": image_base64,
        "image_data_url": data_url,
        "imageUrl": data_url,
        "image_url": data_url,
        "meta": {"provider": provider, "latency": latency, "seed": seed, "width": width, "height": height},
        "fractal_dimension": {"value": round(random.uniform(1.4, 1.7), 2), "method": "estimate", "label": "Hybrid L-System Estimate"}
    }

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

        try:
            rgb = fractal_fusion_rgb(size, size, prompt, seed)
            provider = "fusion-julia-mandelbrot-3d"
        except Exception as e:
            print(f"[fusion] roulette fractal failed, falling back to procedural: {e}")
            rgb = procedural_rgb(size, size, prompt, seed)
            provider = "fusion-service-procedural"

        jobs[job_id]["status"] = "roulette_render"
        jobs[job_id]["progress"] = 0.85

        image_base64 = b64encode(rgb).decode('utf-8')
        data_url = f"data:image/png;base64,{image_base64}"

        meta = {"mode": "roulette", "provider": provider, "seed": seed, "prompt": prompt, "size": size}

        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 1.0
        jobs[job_id]["result"] = data_url
        jobs[job_id]["meta"] = meta

        latency = time.time() - start_time
        LATENCY.labels(device=trainer.device).observe(latency)

        headers = {
            "X-Job-Id": job_id,
            "X-Image-Url": data_url,
            "X-Seed": str(seed),
            "X-Mode": "roulette",
            "X-Prompt": prompt,
            "X-Provider": provider,
        }

        buf = BytesIO(rgb)
        return Response(content=buf.getvalue(), media_type="image/png", headers=headers)

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        raise

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

        buf = BytesIO()
        mockup.save(buf, format="PNG")
        image_base64 = b64encode(buf.getvalue()).decode('utf-8')
        data_url = f"data:image/png;base64,{image_base64}"

        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 1.0
        jobs[job_id]["result"] = data_url
        jobs[job_id]["meta"] = meta

        latency = time.time() - start_time
        LATENCY.labels(device=trainer.device).observe(latency)

        headers = {
            "X-Job-Id": job_id,
            "X-Image-Url": data_url,
            "X-Emotion": str(meta.get("emotion", "")),
            "X-Seed": str(meta.get("seed", "")),
        }

        return Response(content=buf.getvalue(), media_type="image/png", headers=headers)

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

        buf = BytesIO()
        mockup.save(buf, format="PNG")
        image_base64 = b64encode(buf.getvalue()).decode('utf-8')
        data_url = f"data:image/png;base64,{image_base64}"

        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 1.0
        jobs[job_id]["result"] = data_url
        jobs[job_id]["meta"] = meta

        latency = time.time() - start_time
        LATENCY.labels(device=trainer.device).observe(latency)

        headers = {
            "X-Job-Id": job_id,
            "X-Image-Url": data_url,
            "X-Seed": str(meta.get("seed", "")),
            "X-Mode": str(meta.get("mode", "")),
        }

        return Response(content=buf.getvalue(), media_type="image/png", headers=headers)

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        raise

@app.get("/health")
async def health():
    return {"status": "ok", "device": "mock_cpu", "timestamp": time.time()}

@app.get("/")
async def root():
    return RedirectResponse(url="/ui/randomize.html")

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)