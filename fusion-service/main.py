import os
import time
import uuid
import random
from io import BytesIO
from base64 import b64encode
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.responses import Response, RedirectResponse
from typing import Optional, List, Literal, Dict, Any

app = FastAPI(title="Fusion Service - Stable with Brain")

# ==================== Simple Stable Fractal Generator ====================

def fractal_fusion_rgb(width: int, height: int, prompt: str, seed: int) -> bytes:
    import math
    rng = random.Random(seed)
    buf = bytearray(width * height * 3)
    for y in range(height):
        for x in range(width):
            i = (y * width + x) * 3
            val = math.sin((x + seed) * 0.02) * math.cos((y + seed) * 0.02)
            r = int((val + 1) * 127) % 256
            g = int((val * 1.3 + 1) * 127) % 256
            b = int((val * 0.7 + 1) * 127) % 256
            buf[i] = r
            buf[i+1] = g
            buf[i+2] = b
    return bytes(buf)

def procedural_rgb(width: int, height: int, prompt: str, seed: int) -> bytes:
    rng = random.Random(seed)
    buf = bytearray(width * height * 3)
    for y in range(height):
        for x in range(width):
            i = (y * width + x) * 3
            buf[i] = (x * 7 + y * 13 + seed) % 256
            buf[i+1] = (x * 11 + y * 17 + seed) % 256
            buf[i+2] = (x * 5 + y * 19 + seed) % 256
    return bytes(buf)

# ==================== Mock Trainer (Stable Version) ====================

class MockTrainer:
    device = "mock_cpu"
    style_memory = None
    shape_memory = None

    def brain_generate(self, prompt, seed, steps, mode, randomize, realism):
        # Returns a simple generated image + metadata
        img = procedural_rgb(512, 512, prompt or "random", seed or random.randint(0, 999999))
        return BytesIO(img), {"mode": mode, "seed": seed, "prompt": prompt}

    def brain_img2img(self, init_image, prompt, negative_prompt, seed, steps, strength, guidance_scale, size, realism):
        img = procedural_rgb(size, size, prompt or "img2img", seed or random.randint(0, 999999))
        return BytesIO(img), {"mode": "img2img", "seed": seed}

# ==================== Models ====================

class GenerateRequest(BaseModel):
    prompt: str
    width: int = 512
    height: int = 512
    seed: int = -1
    quality: int = Field(default=1, ge=1, le=3)

class BrainRequest(BaseModel):
    prompt: Optional[str] = None
    steps: int = 8
    seed: int = -1
    mode: Literal["procedural", "diffusion", "auto"] = "procedural"
    randomize: bool = True
    realism: Literal["none", "photo"] = "none"

# ==================== App Setup ====================

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

trainer = MockTrainer()
jobs = {}

@app.post("/generate")
async def generate_image(payload: GenerateRequest):
    start = time.time()
    seed = payload.seed if payload.seed != -1 else abs(hash(payload.prompt)) % (2**31)

    try:
        rgb = fractal_fusion_rgb(payload.width, payload.height, payload.prompt, seed)
        provider = "fusion-fractal"
    except Exception:
        rgb = procedural_rgb(payload.width, payload.height, payload.prompt, seed)
        provider = "procedural"

    image_base64 = b64encode(rgb).decode("utf-8")
    data_url = f"data:image/png;base64,{image_base64}"

    return {
        "success": True,
        "image_base64": image_base64,
        "image_data_url": data_url,
        "imageUrl": data_url,
        "meta": {"provider": provider, "seed": seed, "width": payload.width, "height": payload.height},
        "fractal_dimension": {"value": round(random.uniform(1.35, 1.65), 2), "method": "estimate"}
    }

@app.post("/brain/roulette")
async def brain_roulette(payload: Dict[str, Any] = Body(default={})):
    size = int(payload.get("size", 512))
    prompt = payload.get("prompt", "random quantum tshirt")
    seed = payload.get("seed", random.randint(0, 2**31 - 1))

    rgb = fractal_fusion_rgb(size, size, prompt, seed)
    image_base64 = b64encode(rgb).decode("utf-8")
    data_url = f"data:image/png;base64,{image_base64}"

    return {
        "success": True,
        "image_base64": image_base64,
        "image_data_url": data_url,
        "meta": {"mode": "roulette", "seed": seed, "prompt": prompt}
    }

@app.post("/brain")
async def brain_generate(payload: BrainRequest):
    design, meta = trainer.brain_generate(
        prompt=payload.prompt,
        seed=payload.seed,
        steps=payload.steps,
        mode=payload.mode,
        randomize=payload.randomize,
        realism=payload.realism,
    )
    buf = design if isinstance(design, BytesIO) else BytesIO()
    image_base64 = b64encode(buf.getvalue()).decode("utf-8")
    data_url = f"data:image/png;base64,{image_base64}"

    return {"success": True, "image_data_url": data_url, "meta": meta}

@app.post("/brain/img2img")
async def brain_img2img(
    prompt: str = Form(...),
    file: UploadFile = File(...),
    seed: int = Form(-1),
):
    content = await file.read()
    init_image = Image.open(BytesIO(content)).convert("RGB") if Image else None

    design, meta = trainer.brain_img2img(
        init_image=init_image,
        prompt=prompt,
        negative_prompt="",
        seed=seed,
        steps=12,
        strength=0.55,
        guidance_scale=7.0,
        size=512,
        realism="photo",
    )
    buf = design if isinstance(design, BytesIO) else BytesIO()
    image_base64 = b64encode(buf.getvalue()).decode("utf-8")
    data_url = f"data:image/png;base64,{image_base64}"

    return {"success": True, "image_data_url": data_url, "meta": meta}

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)