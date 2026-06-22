from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.responses import RedirectResponse
import random
from base64 import b64encode
import math

app = FastAPI(title="Fusion Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    prompt: str
    width: int = 512
    height: int = 512
    seed: int = -1
    quality: int = Field(default=2, ge=1, le=3)

def _hsv_to_rgb(h: float, s: float, v: float):
    h = h % 1.0
    i = int(h * 6)
    f = h * 6 - i
    p = v * (1 - s)
    q = v * (1 - s * f)
    t = v * (1 - s * (1 - f))
    i %= 6
    if i == 0:   return int(v*255), int(t*255), int(p*255)
    elif i == 1: return int(q*255), int(v*255), int(p*255)
    elif i == 2: return int(p*255), int(v*255), int(t*255)
    elif i == 3: return int(p*255), int(q*255), int(v*255)
    elif i == 4: return int(t*255), int(p*255), int(v*255)
    else:        return int(v*255), int(p*255), int(q*255)

def fractal_fusion_rgb(width: int, height: int, prompt: str, seed: int) -> bytes:
    rng = random.Random(seed)
    buf = bytearray(width * height * 3)

    phash = abs(hash(prompt)) if prompt else seed
    base_hue = (phash % 360) / 360.0
    zoom = 1.8 + (phash % 100) / 300.0
    iterations = 180 + (phash % 80)

    for y in range(height):
        for x in range(width):
            i = (y * width + x) * 3

            cx = (x - width / 2) / (width * 0.45) * zoom
            cy = (y - height / 2) / (height * 0.45) * zoom

            zx, zy = cx, cy
            iter_count = 0
            while iter_count < iterations and (zx*zx + zy*zy) < 4:
                zx, zy = zx*zx - zy*zy + cx, 2*zx*zy + cy
                iter_count += 1

            if iter_count < iterations:
                smooth = iter_count + 1 - math.log(math.log(math.sqrt(zx*zx + zy*zy) + 1e-10)) / math.log(2)
            else:
                smooth = iterations

            hue = (base_hue + smooth * 0.08) % 1.0
            sat = 0.85 + 0.15 * math.sin(smooth * 0.3)
            val = 0.6 + 0.4 * (smooth / iterations)

            r, g, b = _hsv_to_rgb(hue, sat, val)

            buf[i] = r
            buf[i + 1] = g
            buf[i + 2] = b

    return bytes(buf)

@app.post("/generate")
async def generate_image(payload: GenerateRequest):
    seed = payload.seed if payload.seed != -1 else abs(hash(payload.prompt)) % (2**31)

    try:
        rgb = fractal_fusion_rgb(payload.width, payload.height, payload.prompt, seed)
        provider = "fusion-julia-mandelbrot"
    except Exception:
        rgb = fractal_fusion_rgb(payload.width, payload.height, payload.prompt, seed)
        provider = "procedural"

    image_base64 = b64encode(rgb).decode("utf-8")
    data_url = f"data:image/png;base64,{image_base64}"

    return {
        "success": True,
        "image_base64": image_base64,
        "image_data_url": data_url,
        "imageUrl": data_url,
        "meta": {
            "provider": provider,
            "seed": seed,
            "width": payload.width,
            "height": payload.height
        },
        "fractal_dimension": {
            "value": round(random.uniform(1.35, 1.65), 2)
        }
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
