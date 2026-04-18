import os
import uuid
import time
import asyncio
import torch
from typing import List, Optional, Literal
from io import BytesIO
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
import json
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from PIL import Image
from processors.image_processor import ImageProcessor
from trainer.fusion_trainer import FusionTrainer

app = FastAPI(title="Fusion AI Microservice")

# Initialize components
processor = ImageProcessor()
trainer = FusionTrainer()
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS for external UI integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Metrics
LATENCY = Histogram("fusion_latency_seconds", "End-to-end latency", ["device"])
CLIP_SCORE = Histogram("fusion_clip_score", "CLIP similarity scores")
REQUESTS = Counter("fusion_requests_total", "Total requests", ["endpoint"])

# Job management
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

@app.get("/health")
async def health():
    return {"status": "ok", "device": trainer.device, "timestamp": time.time()}

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
