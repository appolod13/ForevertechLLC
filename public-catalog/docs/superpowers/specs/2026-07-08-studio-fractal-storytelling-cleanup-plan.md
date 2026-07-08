# Studio Fractal Storytelling Cleanup Implementation Plan

## Objective

Implement the approved design by:

- simplifying the Studio page to focus on creation and preview
- upgrading the live generation route to compute explicit storytelling settings
- updating the Fusion renderer to produce cleaner, brighter, more electric outputs with rare Mandelbrot usage

## Workstreams

### 1. Studio Cleanup

Files:

- `public-catalog/src/app/studio/page.tsx`
- `public-catalog/src/app/studio/page.test.tsx`

Tasks:

- reduce the main Studio layout to a generator-first flow
- keep the prompt, generation mode, generate button, status, preview, merch preview, and customize action visible
- remove or relocate the noisy secondary sections from the primary layout:
  - cross-optimize report details
  - live chat
  - multi-channel poster
  - social connection grid
  - scheduling calendar
  - posting controls and status
- preserve existing generation and preview state management where possible
- update Studio tests to match the simplified main experience

Acceptance criteria:

- the main flow is obvious on load
- the generate action still works
- preview and customize links still render correctly
- removed sections are no longer part of the primary Studio screen

### 2. Narrative Route Planning

Files:

- `public-catalog/src/app/api/generate/image/route.ts`
- optional helper extraction in `public-catalog/src/lib/` if the route grows too large

Tasks:

- add a deterministic narrative settings builder keyed by `prompt + seed`
- compute fields such as:
  - `story_mode`
  - `mandelbrot_mode`
  - `mandelbrot_weight`
  - `julia_weight`
  - `ring_bias`
  - `diamond_bias`
  - `string_flow_strength`
  - `diagonal_filament_strength`
  - `texture_style`
  - `texture_mix`
  - `detail_density`
  - `brightness_floor`
  - `metallic_outline_strength`
  - `palette_motion`
- ensure every request computes a fresh settings object with no stale artistic state leakage
- pass the richer settings object to Fusion
- return render metadata that exposes the chosen visual recipe

Acceptance criteria:

- the same prompt and seed produce the same narrative settings
- most renders select low Mandelbrot weight
- Fusion receives the richer parameter set
- the API response includes the new render metadata

### 3. Fusion Renderer Rewrite

Files:

- `fusion-service/main.py`

Tasks:

- expand `GenerateRequest` with explicit storytelling fields from the route
- refactor `fractal_fusion_rgb()` so it no longer treats Mandelbrot as a major baseline contributor
- introduce a simpler visual hierarchy:
  - base flow field
  - story geometry
  - recursive support masks
  - filament and grain detail
  - metallic contour pass
  - highlight finish
- add seeded story modes such as:
  - `diamond_resonance`
  - `ring_memory`
  - `diagonal_current`
  - `spiral_filament`
- bias the palette toward electric cyan, magenta, violet, and blue with healthier mid-value brightness
- localize rare Mandelbrot accents to limited story zones
- keep metallic highlights controlled and layered above the base color field

Acceptance criteria:

- default renders are cleaner and less dark
- the image feels closer to the approved sample direction
- Mandelbrot is uncommon and localized
- brightness and metallic settings stay bounded

### 4. Automated Test Coverage

Files:

- `public-catalog/src/app/studio/page.test.tsx`
- existing route tests near `public-catalog/src/app/api/generate/`
- add focused tests if a new helper module is introduced

Tasks:

- update Studio assertions to reflect the simplified surface
- test deterministic narrative settings generation
- test rare Mandelbrot selection behavior
- test Fusion payload shape and response metadata

Acceptance criteria:

- changed tests pass
- new tests validate the main logic instead of implementation noise

## Suggested Execution Order

1. Add narrative settings builder in the route or an extracted helper.
2. Expand Fusion request model and implement the new render hierarchy.
3. Wire the route to send the richer settings and metadata.
4. Simplify the Studio page around the generator and preview flow.
5. Update tests and run targeted verification.

## Verification Plan

### Automated

- run targeted app tests for Studio and route logic
- run targeted Fusion checks if Python-side tests are added

### Manual

- generate several images from similar prompts and confirm visible variation
- confirm most outputs are vivid and electric rather than black-heavy
- confirm the page feels cleaner and more focused
- confirm preview and customize flows still work

## Risks And Mitigations

- risk: the Studio cleanup removes functionality users still need
- mitigation: move non-core tools below the main flow instead of deleting them if removal is too disruptive

- risk: the cleaner renderer becomes too simple
- mitigation: keep fine-grain filament and recursive support passes strong enough to preserve richness

- risk: brighter palettes become noisy
- mitigation: clamp brightness floor, highlight intensity, and filament density

## Done Definition

- Studio main flow is simplified and readable
- route computes and returns deterministic storytelling settings
- Fusion renders cleaner electric storytelling images with rare Mandelbrot usage
- tests cover the changed behavior
