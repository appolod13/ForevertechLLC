# Quantum Multi-Fractal Wormhole Generator (Design)

## Goal
Generate more unique, premium-looking fractal images by combining multiple fractal structures and a “quantum field wormhole” aesthetic:
- Base structure: Mandelbrot + Julia fusion (current renderer baseline)
- Subtle geometric layers: Sierpinski + Koch-inspired structure
- Subtle quantum field grid / string-field interference
- Wormhole/tunnel warp effect
- Emotion-driven palette selection based on user prompt text
- Random variety by default (no new UI required)

The output should feel like a neon fractal emerging from a quantum field wormhole, with ancient-geometry-inspired structure that enhances detail without looking like a flat overlay.

## Non-Goals
- Reproducing any specific copyrighted artwork 1:1
- Introducing new UI controls (initial iteration)
- External model calls for emotion classification (initial iteration)
- Changing checkout, pricing, or payment logic

## Current System Summary (As-Is)
- Web app: `public-catalog` (Next.js)
- Image generation pipeline calls `fusion-service` backend renderer.
- Backend renderer currently computes and fuses Julia + Mandelbrot fields and outputs an RGB image.
- TypeScript has catalog/types for multiple fractal names, but the backend does not yet render those fractals as separate layers.

Key code locations:
- Backend renderer: `fusion-service/main.py`
- Image generation route: `public-catalog/src/app/api/generate/image/route.ts`
- Fractal selection logic: `public-catalog/src/lib/fractal-generator.ts`

## Proposed Approach (A): Backend Multi-Layer Blend (Recommended)
Extend the backend renderer to compute additional procedural layers and blend them into the final image. Keep the existing Julia/Mandelbrot fusion as the base field, then add subtle structure and warp consistently in the same coordinate system.

### Layer Model
All layers operate on the same normalized coordinate field `z` after applying a warp transform.

1) Base field (existing)
- Julia escape field
- Mandelbrot escape field
- Existing fusion logic remains and becomes the “hero” structure.

2) Sierpinski structure layer (new)
- Generate a triangular recursion/bitwise mask (Sierpinski-like) in continuous space.
- Use it as an intensity modulator for highlights/edge glow rather than a solid fill.
- Visibility target: subtle; strongest on high-gradient ridges.

3) Koch structure layer (new)
- Generate a Koch-curve-inspired ridge mask (iterative segment displacement and distance-field style mask, or a procedural approximation).
- Use it as a secondary accent modulator, primarily along energy boundaries.
- Visibility target: subtle.

4) Quantum field grid / string-field (new)
- Generate a faint interference lattice:
  - sinusoidal grid in 2 axes
  - phase offsets driven by seed
  - mild domain-warp noise to avoid perfect uniformity
- Apply primarily to glow/edge intensity and slight hue shift.
- Visibility target: subtle; appears like “field lines” around ridges, not a uniform overlay.

5) Wormhole warp (new)
- Apply coordinate warping before sampling all layers:
  - radial tunnel effect + swirl
  - mild lensing near center (or a randomized off-center focal point)
- Warp strength varies by seed but is bounded to preserve clarity for print.

### Random Variety Policy
Default behavior is random variety:
- A new seed is generated per request unless explicitly provided.
- Randomize within bounded ranges:
  - wormhole focal point, warp strength, swirl strength
  - Julia constant and base zoom/rotation jitter
  - weights for Sierpinski/Koch/grid modulators
  - palette micro-variations within the selected palette profile

The generator should remain reproducible when a seed is supplied.

## Emotion-Driven Palette Selection (Prompt → Palette Profile)
Requirement: “Don’t make it all one color; make the color match the emotion typed in the prompt.”

### Initial Implementation (Deterministic Keyword Mapping)
Implement a lightweight prompt classifier:
- Extract prompt text (already available on the studio flow).
- Match keywords/phrases to a palette profile using deterministic rules.
- If no match: default to “neon violet/pink” profile aligned with current aesthetic.

Example profiles:
- calm: teal/blue + soft violet highlights
- energetic: magenta/orange + high contrast
- mystic: violet/indigo + pink electric edges
- dark: deep indigo/black + restrained highlights
- romantic: pink/violet + warm highlights
- rage: red/magenta + harsh contrast
- joy: cyan/magenta + bright highlights

### Palette Application
Backend maps computed scalar fields to RGB using:
- base gradient stops (per profile)
- gamma/contrast curve (per profile)
- highlight tint (edge glow)
- shadow tint
- optional accent tint for grid modulation

## API and Data Contract Changes
### Backend request model additions (non-breaking)
Add optional parameters:
- `seed?: number|string`
- `palette_profile?: string`
- `wormhole?: { strength, swirl, center_x, center_y }`
- `layers?: { sierpinski_weight, koch_weight, grid_weight }`

If absent, the backend uses defaults that approximate current output.

### Response metadata additions
Return (in response JSON alongside image URL/data):
- `seed`
- `palette_profile`
- chosen layer weights
- wormhole parameters

This supports debugging and reproducibility.

## Integration Points
### public-catalog
- Determine palette profile from prompt text in the generation route or in shared lib logic.
- Pass `palette_profile` + generated `seed` to the backend.
- Preserve existing behavior and endpoints; only extend payload.

### fusion-service
- Implement wormhole warp and layer modulators.
- Implement palette profiles and color mapping.
- Keep performance acceptable by:
  - using vectorized numpy operations
  - limiting extra computations to small constant factor
  - scaling modulation layers by quality/iterations settings

## Quality Targets
- Strong center/tunnel impression (“wormhole”)
- Neon energy ridges with subtle field-line texture
- Visible variety across multiple generations from the same prompt (seed changes)
- Palettes noticeably shift when prompt emotion changes
- Avoid muddy single-tone outputs; preserve contrast for print

## Testing Strategy
### Unit tests (public-catalog)
- Prompt emotion mapping:
  - given prompt strings, returns expected palette profiles
  - stable/deterministic mapping

### Backend tests (fusion-service)
- Request parsing accepts new fields and remains compatible with old payloads.
- Determinism:
  - same seed + same params yields stable output hash (within tolerance if compression differs).

### Smoke/integration
- End-to-end generation returns image successfully and includes metadata (`seed`, `palette_profile`).

## Rollout / Backward Compatibility
- Keep defaults matching current output as closely as possible when new fields absent.
- Gate new effects behind safe defaults:
  - subtle weights by default
  - bounded warp parameters
- Once stable, enable new random variety behavior by default for studio generation.

## Open Questions (Resolved)
- Variety mode: random by default.
- Geometry intensity: subtle.
- Quantum grid intensity: subtle.

