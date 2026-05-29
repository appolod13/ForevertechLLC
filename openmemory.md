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
- quantum-image-gen: generate_quantum_image picks prompt-unique Julia parameters by blending a theme base C with a prompt-seeded Mandelbrot-boundary sample (+ jitter) and varies Julia zoom/iterations per prompt; then fuses Julia+Mandelbrot mathematically into one combined line field by default (disable via prompt containing "no mandelbrot") and attaches qf_derived_prompt/qf_image_hash into returned image metadata for uniqueness.
- quantum-image-gen: when quantum_mode=true and qiskit is available, it samples a Wolfram cellular automaton-derived circuit on Qiskit Aer and reports qf_quantum_engine=qiskit-aer; otherwise it falls back to a deterministic pseudo-quantum distribution (qf_quantum_engine=pseudo). Returned meta also includes derived_prompt, image_hash, and (when seed_salt is provided) qf_quantum_seed_hash.
- quantum-image-gen: requirements.runtime.txt includes fastapi, uvicorn, pillow, numpy, wolframalpha, and qiskit/qiskit-aer/matplotlib to support full quantum_mode without fallback. Service runs on port 5328 (exposed via /health and /v1/images/generations) with images directory for output files.
- public-catalog: Playwright E2E suite (tests/e2e) runs cross-browser + mobile presets via playwright.config.ts webServer; customer journeys are mocked for auth/checkout/stripe/nft while validating real UI flows; test data lives in tests/e2e/fixtures/customerProfiles.ts. /api/generate/image responses are wrapped as { success: true, data: { image_url, meta, requestId } } (clients/tests should handle both image_url and legacy imageUrl shapes).
- public-catalog: Live Printify sample tests: tests/e2e/printify.sample.spec.ts can create a real Printify product seeded from a real IBM quantum job when PRINTIFY_E2E=1 REAL_QUANTUM_E2E=1 and IBM_QUANTUM_SEED_SERVICE_URL is set; it logs PRINTIFY_PRODUCT_URL_REAL_QUANTUM and qf_quantum_engine.
- “Build” expectation: use Python 3.11 to satisfy torch==2.2.0 wheels on macOS; add pytest-asyncio to run async tests.
- Studio prompt UX: /studio no longer pre-fills the prompt with the long “futuristic megacity” example; prompt starts blank (and ignores that legacy default if it’s found in restored localStorage).

## public-catalog (Next.js)
- App: public-catalog/src/app (Next.js 16 App Router, runs on port 3001)
- Admin Control Center: /admin (login via /admin/login; cookie session ft_admin_session; env ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_SESSION_SECRET)
- Admin Orders: /admin shows “Recent Orders” by calling /api/admin/orders (admin-only) and displays IBM jobId/backend plus qf_quantum_seed_hash + image_hash when Quantum Verified was used.
- Config stores (in-memory per server instance): src/lib/aiGeneratorsConfig.ts, cryptoConfig.ts, shippingConfig.ts, printifyBackText.ts
- Studio generation: /api/generate/image rewrites generator responses that return /images/<file> into same-origin /api/images/<file> so production sites (https) can serve images without mixed-content issues; /api/images proxies to the configured AI_IMAGE_GEN_URL when the file is not present locally.
- Checkout + fulfillment: /checkout UI calls /api/checkout (Stripe session) → /api/stripe/webhook (creates Printify order, uploads assets, stores OrderRecord in cartStore). Checkout supports optional customer-provided qrUrl which is stored in Stripe session metadata and used as the QR stamp target URL. Admin sample endpoint /api/admin/printify-back-text also accepts qrUrl for preview/product samples; admin UI requests SVG previews via POST {previewSvg:true} to avoid bundling server-only canvas code into the client.
- Back customization: ProductCustomizer back text supports draft + Done/Enter apply; preview can reflect draft text and stores backCustomerText for orders. /api/back-preview overlays it at the top of the back panel for preview, and /api/stripe/webhook includes it when generating the uploaded Printify back image (without changing the abstract pattern seed). Overlay scales horizontally to span the red panel width; max length 64 chars.
- Production origin: set NEXT_PUBLIC_SITE_URL so /api/checkout and /api/admin/printify-back-text can build absolute URLs; handlers otherwise derive from x-forwarded-host/proto and will fail closed in production if origin can’t be resolved.
- Quantum Verified (order-time): /checkout can add a “Quantum Verified Premium” fee; /api/stripe/webhook requests an IBM quantum seed proof and (when present) regenerates the Printify front image using quantum-image-gen with seed_salt derived from the IBM seed so the printed artwork is tied to the real quantum job.
- Admin Printify samples: /admin/printify-back-text can upload a back preview image to Printify and can create a full shirt product sample (front generated from prompt + back QR/text) in the configured Printify shop.
- Printify back print: src/lib/printifyBackText.ts renders the back panel as a PNG via @napi-rs/canvas and route handlers composite the QR stamp via sharp/qrcode. Modes: words collage or abstract scute-style mesh line art (darker + larger geometry) with thick black strokes plus a large centered “diamond/hypercube” wireframe overlay; currently the rendered back panel does not draw the word tiles (to avoid crowding). Back no longer includes a fixed top header; customer-entered back text (if provided) is overlaid at the top by /api/back-preview and /api/stripe/webhook when creating Printify back images. QR stamp includes “Quantum Verified” + https://www.pixelqrypt.com (no “Pixel Crypted” line and no QV badge on the stamp); stamp labels are drawn via canvas (not SVG text) to avoid missing text when fonts aren’t available to SVG renderers. Controlled by env PRINTIFY_BACK_STYLE=words|abstract (default abstract); admin sample API accepts backStyle too.
- Customizer back preview: /api/back-preview renders the same back print PNG server-side (including header + stamp) so the Customize page matches Printify output and stays clipped inside the red panel.
- Back preview caching: /api/back-preview is forced dynamic + no-store (incl. CDN/surrogate) and ProductCustomizer appends a nonce param to avoid stale cached images after deploys/navigation.
- Customizer base layer: for T-shirt back view, ProductCustomizer uses the generic Shirt icon base (not a Printify mockup image) to avoid “double printing” where a baked-in mockup design shows behind the dynamic back preview.
- Latest Drops feed: CatalogGrid no longer injects the live SSE `latestPost` item into the grid to avoid duplicate/overlapping “generated” entries on the landing page.
- NFT claim (gasless): /checkout/success UI calls /api/nft/claim (server-mint); chain list exposed via /api/crypto/config
- Quantum Verified: /api/quantum/status + src/lib/quantumVerified.ts (IBM seed/proof service via IBM_QUANTUM_SEED_SERVICE_URL)
- UI stability: CatalogItem uses deterministic like counts (no Math.random) to avoid hydration mismatches; maps legacy http://localhost:5328/images/<file> URLs to /api/images/<file> so images load without the 5328 service running.
- UI images: components use standard <img> tags (instead of next/image) to avoid remote image domain constraints and reduce production friction.
- Customizer back preview: ProductCustomizer generates the back “emotional” abstract pattern client-side as an SVG seeded from bannerText + last generated image identifier so it varies per prompt/image; pattern is clipped into the red back panel.
- Tools page: Brain Randomizer (Train the Brain) moved out of /studio into /tools and is linked from Header only when dev tools are visible (dev or admin).
- Social auth/posting: Twitter/X OAuth1 uses /api/auth/twitter/login + /api/auth/twitter/callback; callback URL is derived from request origin (or TWITTER_CALLBACK_URL) and OAuth token/secret are stored in httpOnly cookies. Instagram OAuth2 uses /api/auth/instagram/login + /api/auth/instagram/callback; callback stores a token + ig user id in cookies and /api/post can publish to Instagram feed + stories (and reels when media is video). Telegram posting uses a Bot token + chat id from env (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) and /api/post can publish message/photo to Telegram; Studio shows Telegram as connected when those env vars are set. TikTok OAuth2 Login Kit uses /api/auth/tiktok/login + /api/auth/tiktok/callback (TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET) and /api/post can create a TikTok photo post via Content Posting API (requires https public image URL and a verified URL prefix). YouTube OAuth2 uses /api/auth/youtube/login + /api/auth/youtube/callback (YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET) and stores access/refresh tokens in cookies; /api/post currently treats YouTube as “connected” only (upload not implemented yet). Remaining platforms still use mock login routes for UI testing only.
- Compliance: Privacy Policy page at /privacy-policy with its own page title metadata; linked in Header navigation (desktop + mobile) as “Privacy”.
- Customer education: FAQs page at /faqs explains Studio → Customize → Cart → Checkout → Printify plus crypto payments + NFT claiming and splits benefits for Quantum Verified Premium vs NFT claims; linked in Header navigation (desktop + mobile).
- Go-live reverse proxy: traefik-enterprise/docker-compose.yml runs Traefik v3.6 + public-catalog + quantum-image-gen (+ optional fusion-service) with Cloudflare DNS-01 Let’s Encrypt. Traefik static config is traefik-enterprise/config/traefik-static.yml and file-provider middlewares are in traefik-enterprise/config/dynamic/middlewares.yml (secure headers, rate limit, retry). Dashboard is routed at traefik.<DOMAIN> and protected via basic auth label (DASHBOARD_AUTH env).
- Upload hardening: public-catalog API routes /api/upload and /api/fuse enforce image-only uploads using magic-byte sniffing (PNG/JPG/WebP/GIF) and reject ZIP signatures; size limit is configurable via UPLOAD_MAX_BYTES.

## User Defined Namespaces
- [Leave blank - user populates]
