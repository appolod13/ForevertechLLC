## Overview
- Repo contains multiple subprojects; relevant service: fusion-service (FastAPI microservice for image “fusion” + generation).
- public-catalog is a Next.js (App Router) web app that handles the customer catalog + checkout + admin control center.

## Architecture
- FastAPI app entry: fusion-service/main.py
- REST endpoints: /health, /metrics, /fuse, /brain, /brain/style, /brain/style/fit
- REST endpoints: /, /health, /metrics, /fuse, /brain, /brain/img2img, /brain/roulette, /brain/style, /brain/style/fit, /brain/shape, /brain/shape/fit
- WebSocket: /progress/{job_id}
- Pipeline steps inside run_fusion_pipeline: preprocess uploads → (mock) train → generate → save result under fusion-service/uploads/
  - /brain: generates a T-shirt mockup PNG + saves it to uploads/; also exposes uploads via static mount /uploads
  - /brain/style/fit: CPU-only “style memory” extraction from a local dataset directory; saves stats JSON and biases procedural generation
  - /brain/style: returns whether style memory is loaded + current stats
  - /brain/shape/fit: CPU-only “shape memory” extraction (skyline building widths/heights + window grid stats) from a local dataset directory; saves JSON and biases utopian skyline generation
  - /brain/shape: returns whether shape memory is loaded + current stats
  - /brain/img2img: accepts an uploaded init image + prompt; runs diffusion img2img when ENABLE_DIFFUSION=1 and weights are available, otherwise falls back to a CPU “procedural img2img” blend; returns a T-shirt mockup PNG and saves it under uploads/
  - /brain/roulette: one-call “beautiful generator” that picks a strong city init image from CITY_DATASET_PATH, randomizes prompt/seed/strength, and returns a new T-shirt mockup PNG
  - /ui/: static web page (`fusion-service/web/index.html`) with image roulette controls that repeatedly calls `/brain` and displays a rolling history of generated mockups

## Components
- ImageProcessor (fusion-service/processors/image_processor.py)
  - Validates uploaded images (size + extension)
  - Resizes to 512x512 and saves normalized tensors under uploads/
  - Computes CLIP similarity when available; otherwise uses a deterministic fallback score in [-1, 1]
  - create_tshirt_mockup(): photo-style light background, shirt silhouette with shading/collar/texture; print stays square (no wavy mesh warp)
- FusionTrainer (fusion-service/trainer/fusion_trainer.py)
  - Lazy-loads StableDiffusionPipeline when available
  - Provides superposition_sampling() without requiring pipeline initialization
  - Uses a deterministic fallback image generator when Stable Diffusion weights are unavailable
  - brain_generate(): “emotion → palette → idea” planning + quantum-inspired outline + Wolfram-guided numeric params; when style memory is utopian, city/skyline is foreground and space/flowers/stars are pushed to subtle background; optional diffusion refinement when ENABLE_DIFFUSION=1
  - StyleMemory: palette + sky/building/greenery colors + brightness/saturation/edges; loaded from uploads/style_memory.json via STYLE_MEMORY_PATH
  - ShapeMemory: building width/height/spacing + window grid distributions; loaded from uploads/shape_memory.json via SHAPE_MEMORY_PATH; used when generating utopian skylines
  - Photo realism: brain_generate(realism="photo") applies CPU-only postprocess (bloom + tone mapping + sharpen + vignette + grain) and adds subtle glass reflections in utopian skyline

## Patterns
- “Build” expectation: use Python 3.11 to satisfy torch==2.2.0 wheels on macOS; add pytest-asyncio to run async tests.

## public-catalog (Next.js)
- App: public-catalog/src/app (Next.js 16 App Router, runs on port 3001)
- Admin Control Center: /admin (login via /admin/login; cookie session ft_admin_session; env ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_SESSION_SECRET)
- Config stores (in-memory per server instance): src/lib/aiGeneratorsConfig.ts, cryptoConfig.ts, shippingConfig.ts, printifyBackText.ts
- Checkout + fulfillment: /checkout UI calls /api/checkout (Stripe session) → /api/stripe/webhook (creates Printify order, uploads assets, stores OrderRecord in cartStore). Checkout supports optional customer-provided qrUrl which is stored in Stripe session metadata and used as the QR stamp target URL. Admin sample endpoint /api/admin/printify-back-text also accepts qrUrl for preview/product samples.
- Printify back print: src/lib/printifyBackText.ts renders the back panel as a PNG via @napi-rs/canvas and route handlers composite the QR stamp via sharp. Modes: words collage (white words, per-cell clipping) or abstract wireframe “mesh blob” line art with thick black strokes; abstract mesh is drawn larger + more elongated vertically. Back shape is seeded per generated front image/order item so each customer design gets a different mesh even if the same words/prompt occur. Controlled by env PRINTIFY_BACK_STYLE=words|abstract (default words); admin sample API accepts backStyle too.
- NFT claim (gasless): /checkout/success UI calls /api/nft/claim (server-mint); chain list exposed via /api/crypto/config
- Quantum Verified: /api/quantum/status + src/lib/quantumVerified.ts (IBM seed/proof service via IBM_QUANTUM_SEED_SERVICE_URL)

## User Defined Namespaces
- [Leave blank - user populates]
