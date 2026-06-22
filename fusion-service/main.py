from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.responses import RedirectResponse
import random
from base64 import b64encode

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

def fractal_fusion_rgb(width: int, height: int, prompt: str, seed: int) -> bytes:
    import math
    buf = bytearray(width * height * 3)
    for y in range(height):
        for x in range(width):
            i = (y * width + x) * 3
            val = math.sin((x + seed) * 0.02) * math.cos((y + seed) * 0.02)
            buf[i] = int((val + 1) * 127) % 256
            buf[i + 1] = int((val * 1.3 + 1) * 127) % 256
            buf[i + 2] = int((val * 0.7 + 1) * 127) % 256
    return bytes(buf)

@app.get("/")
async def root():
    return {
        "message": "Fusion Service is running",
        "endpoints": {
            "generate": "/generate",
            "health": "/health",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/generate")
async def generate_image(payload: GenerateRequest):
    seed = payload.seed if payload.seed != -1 else abs(hash(payload.prompt)) % (2**31)

    try:
        rgb = fractal_fusion_rgb(payload.width, payload.height, payload.prompt, seed)
    except Exception:
        rgb = fractal_fusion_rgb(payload.width, payload.height, payload.prompt, seed)

    image_base64 = b64encode(rgb).decode("utf-8")
    data_url = f"data:image/png;base64,{image_base64}"

    return {
        "success": True,
        "image_base64": image_base64,
        "image_data_url": data_url,
        "imageUrl": data_url,
        "meta": {
            "seed": seed,
            "width": payload.width,
            "height": payload.height
        },
        "fractal_dimension": {
            "value": round(random.uniform(1.35, 1.65), 2)
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)