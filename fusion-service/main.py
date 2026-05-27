import os
import uuid
import time
import asyncio
import torch
from typing import List
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
import json
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
from processors.image_processor import ImageProcessor
from trainer.fusion_trainer import FusionTrainer

app = FastAPI(title="Fusion AI Microservice")

# Initialize components
processor = ImageProcessor()
trainer = FusionTrainer()

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
