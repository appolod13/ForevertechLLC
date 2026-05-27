import hashlib
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from quantum_gen.wolfram_qiskit import _contains_future_city, _future_city_concept


class GenerationRequest(BaseModel):
    prompt: str = Field(default="")
    width: int = Field(default=1024, ge=64, le=4096)
    height: int = Field(default=1024, ge=64, le=4096)
    steps: int = Field(default=30, ge=1, le=200)
    quantum_mode: bool = Field(default=False)
    ipfs_upload: bool = Field(default=False)


def _request_id(prompt: str, width: int, height: int, quantum_mode: bool) -> str:
    raw = f"{prompt}|{width}x{height}|q={int(quantum_mode)}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:16]


def _now_tag() -> str:
    return datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")


APP_DIR = Path(__file__).resolve().parent.parent
IMAGES_DIR = Path(os.environ.get("IMAGES_DIR", str(APP_DIR / "images"))).resolve()
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Quantum Image Generator", version="1.0.0")
app.mount("/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/v1/images/generations")
def generate(req: GenerationRequest):
    prompt = (req.prompt or "").strip()
    width = int(req.width)
    height = int(req.height)

    if _contains_future_city(prompt):
        rule = int(_request_id(prompt, width, height, req.quantum_mode), 16) % 128
        img = _future_city_concept(prompt, width, height, rule=rule)
        provider = "future_city_concept_v1"
    else:
        rule = int(_request_id(prompt, width, height, req.quantum_mode), 16) % 128
        img = _future_city_concept(f"future city | {prompt}", width, height, rule=rule)
        provider = "fallback_concept_v1"

    rid = _request_id(prompt, width, height, req.quantum_mode)
    filename = f"{_now_tag()}_{rid}_{width}x{height}.png"
    out = IMAGES_DIR / filename
    img.save(out, format="PNG", optimize=True)

    meta: dict[str, Any] = {
        "provider": provider,
        "width": width,
        "height": height,
        "quantum_mode": bool(req.quantum_mode),
        "steps": int(req.steps),
        "request_id": rid,
        "filename": filename,
    }

    if req.ipfs_upload:
        meta["ipfs_url"] = None
        meta["ipfs_status"] = "disabled"

    return JSONResponse(
        {
            "success": True,
            "imageUrl": f"/images/{filename}",
            "meta": meta,
        }
    )
