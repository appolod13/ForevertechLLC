# Generator Reset, Detail Guard, and 3D Wormhole Implementation Plan

## Objective

Implement the approved design by:

- adding a free-session reset flow that clears preview state and generator drift state after 20 generations
- upgrading the live generator to reject weak-detail outputs before they become visible
- adding a dimensional drift wormhole layer that increases spatial depth while preserving dense fractal detail

## Workstreams

### 1. Studio Reset Experience

Files:

- `public-catalog/src/app/studio/page.tsx`
- `public-catalog/src/app/studio/page.test.tsx`
- optional shared helpers in `public-catalog/src/lib/` if session-state logic needs extraction

Tasks:

- add UI state for free-session generation count
- show the current count and a reset affordance when relevant
- enforce the free-session threshold at `20` generations
- add a `Reset Generator` action that:
  - clears latest preview state
  - clears saved generation metadata used in Studio
  - clears the local session counter
  - starts the next generation cycle from a clean state
- preserve the main Studio flow:
  - prompt
  - generate
  - latest preview
  - merch preview
  - customize action
- keep reset fast and non-destructive from the user’s perspective

Acceptance criteria:

- the user can see generation progress toward the free limit
- reaching `20` generations exposes a reset path instead of leaving the generator in a drifted state
- reset clears the active preview state and returns the generator to a fresh session
- the main Studio flow remains intact

### 2. Route Session State And Reset Handling

Files:

- `public-catalog/src/app/api/generate/image/route.ts`
- optional helper extraction under `public-catalog/src/lib/`

Tasks:

- introduce a lightweight generator session model including:
  - `generation_count`
  - `reset_version`
  - `family_bias_seed`
  - `bad_output_streak`
- derive a fresh render plan from `prompt + seed + session state`
- increment session count on successful generation
- support reset requests that:
  - set `generation_count` to `0`
  - increment `reset_version`
  - clear `bad_output_streak`
  - regenerate `family_bias_seed`
- keep the existing Render-safe proxied image URL behavior
- return metadata describing:
  - selected family mix
  - retry count
  - reset version
  - quality gate result

Acceptance criteria:

- route state is deterministic for the same `prompt + seed + reset_version`
- reset requests clear the session state cleanly
- Render-safe image URLs still work after reset
- metadata explains what render path was used

### 3. Fusion Renderer Family Blend

Files:

- `fusion-service/main.py`

Tasks:

- refine `fractal_fusion_rgb()` around four coordinated layers:
  - `magma_ribbon`
  - `rainbow_scallop`
  - `pastel_lace`
  - `dimensional_drift_wormhole`
- keep all four present in the result, but assign seeded hierarchy:
  - primary structural family
  - secondary color/banding family
  - accent family
  - wormhole drift layer across the final composition
- keep Mandelbrot tiny and localized only
- preserve deterministic output for the same seed and route-provided settings
- avoid the failure mode shown in the user screenshot:
  - flat purple background
  - only thin edge detail
  - weak recursive density

Acceptance criteria:

- generated images stay within the approved reference family
- the output shows stronger recursive density and contour richness
- Mandelbrot does not dominate the full frame
- the generator no longer defaults into the weak purple-edge-only look

### 4. Weak-Detail Quality Gate

Files:

- `fusion-service/main.py`
- `fusion-service/tests/test_api.py`

Tasks:

- compute candidate-image quality signals such as:
  - edge density
  - local variance
  - recursive contour richness
  - flat-area coverage
- define bounded thresholds for rejection
- add a retry loop that strengthens detail when quality is too low:
  - increase contour density
  - reduce flat wash influence
  - strengthen branch, filament, and support-mask detail
- cap retry count and fall back to the strongest approved family recipe if needed

Acceptance criteria:

- weak-detail candidates are rejected before becoming the saved result
- bounded retries preserve performance and avoid infinite loops
- fallback still produces an approved family style instead of a placeholder-like image

### 5. Dimensional Drift Wormhole Layer

Files:

- `fusion-service/main.py`
- `fusion-service/tests/test_api.py`

Tasks:

- add a depth field separate from the base color field
- use seeded focal centers and phase values to drive:
  - radial pull
  - angular twist
  - depth-dependent warp
- tie the strongest warp to recursive ridges, branch tips, and story zones
- keep the effect structural and dimensional rather than blurry or tunnel-like
- adapt the existing wormhole warp logic where possible rather than creating a disconnected second system

Acceptance criteria:

- the image feels more spatial and cinematic
- drift increases depth without erasing detail
- the wormhole layer supports the fractal structure instead of replacing it

### 6. Automated Coverage

Files:

- `public-catalog/src/app/studio/page.test.tsx`
- `public-catalog/src/app/api/generate/image.route.test.ts`
- `fusion-service/tests/test_api.py`

Tasks:

- add or update Studio tests for:
  - generation count display
  - reset button visibility
  - reset clearing active preview state
- add route tests for:
  - session counter behavior
  - reset behavior
  - metadata fields for family mix and reset version
  - continued Render-safe proxied image URL behavior
- add Fusion tests for:
  - approved family blend characteristics
  - detail guard rejection and fallback behavior
  - deterministic output for the same seed and reset version

Acceptance criteria:

- tests cover the user-visible reset path and the main generator safeguards
- tests stay focused on behavior, not implementation noise

## Suggested Execution Order

1. Add route-level session/reset model and response metadata shape.
2. Add Studio reset UI and session count handling.
3. Implement Fusion family blend refinements and dimensional drift wormhole layer.
4. Add the weak-detail quality gate and bounded retry logic.
5. Update and expand automated tests.
6. Run build and targeted app/Python verification.

## Verification Plan

### Automated

- run targeted Studio and route tests in `public-catalog`
- run targeted Fusion tests in `fusion-service`
- run `npm -C public-catalog run build`

### Manual

- generate multiple images across one session and confirm the count increments correctly
- confirm reset clears preview/session state and allows a fresh cycle
- confirm bad weak-detail outputs do not become the latest preview
- confirm generated images stay closer to the approved references
- confirm the resulting image URLs still work in the Render deployment model

## Risks And Mitigations

- risk: session state gets split between UI and route logic
- mitigation: keep a single route-owned session model and have Studio consume its response

- risk: detail gating causes too many retries or slow responses
- mitigation: keep the retry loop bounded and fall back to the strongest approved family recipe

- risk: wormhole depth effect creates empty voids or blurred tunnels
- mitigation: bind the drift effect to recursive edges and detail masks instead of broad background-only warps

- risk: reset logic accidentally breaks current latest-preview behavior
- mitigation: add focused Studio and route tests before wiring the final UI reset path

## Done Definition

- free users can reset the generator after reaching `20` generations
- reset clears preview and generator drift state without destructive server cleanup
- the generator rejects weak-detail outputs before saving them as latest preview
- dimensional drift increases depth while preserving fractal density
- generated images remain Render-safe and closer to the approved reference family
- tests and build pass
