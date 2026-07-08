# Narrative Fractal Storytelling Generator Design

## Goal

Upgrade Studio image generation so outputs feel like vivid, emotionally expressive "fractal storytelling" scenes instead of mostly dark Mandelbrot-heavy backgrounds.

The new generator should:

- make Mandelbrot structure rare instead of the default background foundation
- combine multiple fractal families into a layered visual narrative
- feel more random, detailed, and impressive across generations
- keep colors vivid and mixed rather than dark or black-dominant
- place metallic outlines and light accents above the color field for a futuristic 3D/4D feel
- better support printed compositions so art frames and enhances the merch design

## Approved Direction

- Use the backend-led narrative fractal director approach.
- Keep this iteration prompt-driven and automatic; do not add new Studio controls in this slice.
- Prioritize "story first" output:
  - an image should feel like it moves through phases rather than looking like one repeated fractal texture
  - color should still respond to emotion in the prompt
  - the composition should remain suitable for print

## Scope

- Update the live Fusion renderer in `fusion-service/main.py`.
- Update the Studio generation route in `public-catalog/src/app/api/generate/image/route.ts`.
- Reuse and extend the existing prompt-to-palette and fractal-parameter logic already present in the repo.
- Add regression tests for the new parameter-selection and render-behavior rules.
- Keep the existing Studio UI flow intact.

## Non-Goals

- No new Studio sliders, tabs, or advanced controls in this iteration.
- No external image model or third-party art model integration.
- No attempt to reproduce any referenced sample, paper, or repository output 1:1.
- No change to checkout, merch pricing, or posting flows.
- No full replacement of the current Fusion service architecture.

## Current Problem Summary

Today the live generator already includes Julia, Mandelbrot, Sierpinski, Koch, grid, texture, and metallic shaping, but the visual weighting still has two problems for this request:

- Mandelbrot remains part of the baseline fused field instead of being a rare accent or special event.
- The route only forwards a narrow parameter set to Fusion, so much of the richer fractal configuration logic in TypeScript does not actually drive production renders.

The result is that generations can still feel too dark, too similar, and too centered on one underlying fractal identity rather than telling a richer visual story.

## Visual Design Principles

### 1. Fractal Storytelling

Each render should read like a narrative with progression, not a single static texture.

The composition should feel like:

- an origin or seed point
- branching growth and directional motion
- moments of tension or density
- a calmer or more luminous resolution zone

This does not require literal characters or scenes. The storytelling effect comes from layered structure, depth, directional flow, and evolving detail density.

### 2. Rare Mandelbrot

Mandelbrot should no longer dominate the background field.

Rules:

- Make Mandelbrot-derived structure rare, used only as an occasional accent layer or narrative "event."
- Default hero layers should come from Julia, warped flow fields, Sierpinski masks, Koch-like ridges, and sample-inspired procedural textures.
- When Mandelbrot does appear, it should strengthen complexity locally rather than flattening the whole canvas into a familiar Mandelbrot look.

Target behavior:

- Mandelbrot contributes strongly in roughly 10-15% of renders.
- In the remaining renders, Mandelbrot weight stays low and supportive.

### 3. Mixed Vivid Color

The generator should avoid black-heavy and muddy outputs.

Rules:

- Keep brightness in the middle range: not washed out, not too dark.
- Prefer dominant vivid mixed colors with emotional variation.
- Use richer hue travel across the image so outputs feel alive and varied.
- Preserve color contrast for print while avoiding giant dark voids.

### 4. Metallic Edge Hierarchy

Outlines and highlights should sit visually above the base color field.

Rules:

- Metallic edges should be guided by fractal ridges, texture intersections, and story transitions.
- Specular light should be concentrated on high-value contours, not sprayed uniformly.
- The metallic treatment should suggest depth and polish rather than chrome everywhere.

## Architecture

### Studio Route Responsibilities

`public-catalog/src/app/api/generate/image/route.ts` becomes the orchestration layer for narrative render presets.

Responsibilities:

- derive palette profile from the prompt
- derive narrative render settings from prompt + seed
- widen the randomized parameter space used for live Fusion requests
- clear or bypass stale generation state so each render uses a fresh computed configuration
- forward the selected narrative parameters to Fusion
- return metadata that explains what render choices were made

### Fusion Service Responsibilities

`fusion-service/main.py` becomes the actual narrative fractal director.

Responsibilities:

- compute the final layered render
- enforce rare-Mandelbrot weighting
- apply story-phase transitions across the image
- generate metallic edge treatment and controlled specular lighting
- support brighter and more varied palette motion
- keep results deterministic for the same seed and prompt-derived settings

## Narrative Render Model

### Story Phases

Each render should combine four soft composition phases:

1. Seed
- localized point of origin
- tighter detail and stronger line coherence

2. Expansion
- branching or flowing movement outward
- richer color travel and geometry buildup

3. Tension
- denser intersections, sharper ridges, more metallic emphasis

4. Resolution
- smoother release zone with a calmer or more luminous finish

Implementation shape:

- compute one or more directional masks across the image
- map those masks into phase weights
- use phase weights to modulate fractal family contribution, brightness, saturation, edge glow, and texture density

The phase transitions should be continuous, not divided into hard quadrants.

### Fractal Family Mix

The default render should be driven by a weighted blend of:

- Julia field: primary organic and emotional structure
- Sierpinski-like masking: recursive branching and spacing accents
- Koch-like ridges: story tension and contour sharpening
- sample-inspired textures: diagonal hatch, diamond wave, spiral, plus additional string-flow variants
- grid/interference field: subtle ancient-tech or quantum-field scaffolding

Mandelbrot behavior:

- low baseline weight in normal renders
- optional high-weight accent mode in rare renders
- when active, it should reinforce a specific story zone rather than flood the full image

### String-Flow Layer

Add a new "string-flow" or "story filament" layer that visually ties the phases together.

Purpose:

- make the image feel like it is coming from a string or field line
- create guided motion through the composition
- help the eye read a beginning, transition, and destination

Implementation options can include:

- curved interference bands
- directional warped sine ridges
- multi-path flow masks derived from seed-driven attractors

The layer should be prominent enough to shape the narrative, but still feel like part of the fractal system.

## Parameter Strategy

### New Prompt-Derived Narrative Settings

The live route should compute and pass a richer parameter object, such as:

- `story_mode`
- `story_phase_bias`
- `mandelbrot_mode`
- `mandelbrot_weight`
- `julia_weight`
- `string_flow_strength`
- `texture_style`
- `texture_mix`
- `detail_density`
- `brightness_floor`
- `metallic_outline_strength`
- `print_safe_emphasis`
- existing wormhole and geometry weights

This can be translated into the current Python request model either by:

- expanding `GenerateRequest`, or
- mapping the new settings into existing numeric fields plus a few new fields

The preferred path is to add explicit fields where the behavior would otherwise be ambiguous.

### Randomness Policy

Increase visible variety without making outputs chaotic.

Rules:

- keep deterministic output for the same seed and prompt-derived settings
- widen seeded variation in:
  - phase directions
  - focal points
  - texture family
  - geometry weighting
  - line density
  - hue drift
  - metallic intensity
- prevent repetition by choosing from broader bounded ranges than the current implementation

### Memory And Cache Hygiene

The generation route currently keeps an in-memory cache map, but the live generation path should not reuse stale artistic state when generating a new image.

Design requirements:

- each new render computes a fresh narrative config from current prompt + seed
- no previous render-specific palette, geometry, or story settings should leak into the next render
- if cache remains in place for other reasons, cache keys must include the full narrative settings object
- if the cache is unused in practice, remove or ignore it for the active generation path

## Palette Design

### Emotion Mapping

Keep emotion-driven palettes, but broaden them away from mostly dark cosmic output.

Requirements:

- retain deterministic prompt-to-palette matching
- introduce brighter mixed-color variants for joy, wonder, energy, romance, curiosity, and transcendence
- keep darker profiles available for prompts that explicitly ask for void, shadow, grief, or ominous moods
- avoid defaulting to dark output when the prompt is neutral

### Palette Application

The renderer should:

- use wider hue travel across the image
- allow complementary accent shifts between story phases
- reserve the brightest values for metallic contours and climax zones
- keep background luminance above the current darker baseline

## Print-Aware Composition

The generated image should better support merch printing and overlaid text.

Requirements:

- avoid placing the highest-noise detail everywhere at equal intensity
- emphasize framing contours and directional movement around likely print focal zones
- preserve enough open structure that shirt graphics and text remain readable
- treat "print interaction" as composition support, not literal text rendering in the generator

This slice should not attempt OCR, text reading, or direct shirt-layout detection. It should simply bias the art toward more presentation-friendly structure.

## Implementation Plan Shape

### Route Changes

In `public-catalog/src/app/api/generate/image/route.ts`:

- replace the narrow Fusion payload with a narrative render payload
- wire in the existing fractal helper logic where useful instead of leaving it disconnected from production generation
- compute rare-Mandelbrot mode per render
- attach narrative metadata to the returned result

### Fusion Changes

In `fusion-service/main.py`:

- add story-phase masking
- add string-flow composition logic
- reduce default Mandelbrot contribution
- make Mandelbrot rare and localized
- brighten the value curve and reduce black-heavy output
- expand texture families and weighted combinations
- strengthen metallic contours while keeping them controlled

### Backward Compatibility

If new narrative fields are omitted:

- the Fusion service should still render successfully
- defaults should approximate the new preferred look rather than the older darker Mandelbrot-heavy baseline

## Testing Strategy

### Route Tests

Add or update tests to verify:

- narrative settings are derived deterministically from prompt + seed
- Mandelbrot rare-mode selection is deterministic and bounded
- the Fusion request includes the richer narrative parameter set
- returned metadata preserves the chosen narrative settings

### Fusion Tests

Add or update tests to verify:

- Mandelbrot contribution is rare by rule, not dominant by default
- story-phase helpers return sane normalized weights
- brightness floor stays above the intended lower bound for non-dark profiles
- metallic outline settings remain bounded
- string-flow selection is deterministic for a given seed

### Verification

Manually verify on Studio that:

- repeated generations from similar prompts show more variation
- outputs are less dark and less black-dominant
- metallic contours appear above the base colors
- some renders use Mandelbrot accents, but most do not read as Mandelbrot backgrounds
- the overall image feels more like a fractal narrative than a single repeated texture

## Risks

- Too much randomness could reduce print clarity if not bounded carefully.
- Too little Mandelbrot may remove some visual complexity if the alternate layers are not strong enough.
- Brighter palettes can become washed out unless highlights and background values are separated carefully.
- More layered logic can increase render cost, so new masks and flow fields should stay vectorized or lightweight where possible.

## Success Criteria

- Studio generations feel more vivid, varied, and emotionally expressive.
- Most renders no longer look like Mandelbrot-first backgrounds.
- The image reads as a layered fractal story with progression and directional flow.
- Metallic outlines and light accents improve depth without overpowering the art.
- The resulting output still works for printed merch and preview flows.
