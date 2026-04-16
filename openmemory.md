## Overview
- Repo contains multiple subprojects; relevant service: fusion-service (FastAPI microservice for image “fusion” + generation).

## Architecture
- FastAPI app entry: fusion-service/main.py
- REST endpoints: /health, /metrics, /fuse, /brain
- WebSocket: /progress/{job_id}
- Pipeline steps inside run_fusion_pipeline: preprocess uploads → (mock) train → generate → save result under fusion-service/uploads/
  - /brain: generates a T-shirt mockup PNG + saves it to uploads/; also exposes uploads via static mount /uploads

## Components
- ImageProcessor (fusion-service/processors/image_processor.py)
  - Validates uploaded images (size + extension)
  - Resizes to 512x512 and saves normalized tensors under uploads/
  - Computes CLIP similarity when available; otherwise uses a deterministic fallback score in [-1, 1]
-  - create_tshirt_mockup(): photo-style light background, shirt silhouette with shading/collar/texture; print stays square (no wavy mesh warp)
- FusionTrainer (fusion-service/trainer/fusion_trainer.py)
  - Lazy-loads StableDiffusionPipeline when available
  - Provides superposition_sampling() without requiring pipeline initialization
  - Uses a deterministic fallback image generator when Stable Diffusion weights are unavailable
-  - brain_generate(): “emotion → palette → idea” planning + quantum-inspired outline + Wolfram-guided numeric params; procedural painter blends space + flowers + birds + metallic sheen + organic blobs; optional diffusion refinement when ENABLE_DIFFUSION=1

## Patterns
- “Build” expectation: use Python 3.11 to satisfy torch==2.2.0 wheels on macOS; add pytest-asyncio to run async tests.

## User Defined Namespaces
- [Leave blank - user populates]
