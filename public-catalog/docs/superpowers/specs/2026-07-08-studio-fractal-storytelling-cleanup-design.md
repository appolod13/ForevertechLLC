# Studio Fractal Storytelling Cleanup Design

## Goal

Refocus the Studio experience around a cleaner creation flow and upgrade the live generator so outputs feel closer to the provided sample: vivid, electric, layered, and controlled instead of dark, Mandelbrot-heavy, or visually overcrowded.

This iteration combines two changes:

- simplify the Studio page to center the main creative workflow
- update the live Fusion renderer and generation route to produce cleaner fractal storytelling images

## Approved Direction

- Keep the Studio main flow focused on `prompt -> generate -> preview -> customize`.
- Use the provided sample image as the visual anchor for the new generator style.
- Reduce visible dashboard clutter and secondary interaction layers on the Studio page.
- Make Mandelbrot rare and supportive instead of a dominant background identity.
- Favor cleaner ring, diamond, diagonal, and string-flow structures with electric magenta, cyan, and blue dominance.

## Scope

- Update `public-catalog/src/app/studio/page.tsx` to simplify the Studio layout and remove or relocate distracting secondary tools from the primary view.
- Update `public-catalog/src/app/api/generate/image/route.ts` to derive a richer seeded narrative render configuration.
- Update `fusion-service/main.py` to render a cleaner storytelling field with fewer dominant layers and better palette control.
- Add or update focused automated tests for the route and Studio behavior where they reduce regression risk.

## Non-Goals

- No redesign of checkout, merch purchase, or product customization flows.
- No new advanced user controls or multi-tab art direction UI in this slice.
- No external model integration or replacement of the current Fusion service architecture.
- No attempt to copy the reference image exactly.

## Current Problems

### Studio Page

The current Studio page mixes too many responsibilities into the main screen:

- image generation
- prompt optimization reports
- live chat
- multi-channel posting
- social sign-in tiles
- scheduling calendar
- posting workflow controls

This makes the core creative action harder to find and makes the page feel more like an operations dashboard than a creation surface.

### Generator Look

The current Fusion render stack still has several issues for the requested direction:

- Mandelbrot remains part of the baseline fused field instead of a rare accent
- multiple geometry layers compete too evenly, creating busy output
- the palette system still often lands too dark or too black-heavy
- the image can feel like layered math fields rather than a cleaner visual story

## Reference Aesthetic

The provided sample suggests a specific visual direction:

- dominant electric cyan, magenta, violet, and blue
- concentric diamond or circular wave structures
- diagonal line energy and fine-grain luminous texture
- fewer competing macro layers
- crisp internal motion with a subtle metallic or dimensional finish

The goal is not to clone the sample, but to capture its cleaner hierarchy and energy.

## Product Design

### Primary Studio Flow

The main Studio screen should show only the creation essentials:

- prompt textarea
- generation mode selector
- generate button
- generation progress and errors
- latest result preview
- merch-ready preview
- `Customize Your Gear` action

### Secondary Features

The following features should not remain prominent in the main creation flow:

- cross-agent optimization report details
- live chat
- multi-channel poster
- social platform authentication grid
- posting scheduler calendar
- posting status controls

For this iteration, the preferred behavior is:

- remove them from the main Studio layout, or
- move them below the primary creation flow in a clearly secondary section if immediate removal would create too much implementation risk

The main rule is that a user should understand the primary action without scanning unrelated tooling.

## Visual Design Principles

### 1. Cleaner Story Field

Each image should feel like one coherent visual field instead of many equally loud layers.

The composition should read as:

- an origin
- outward or inward motion
- a controlled density build
- a resolved luminous finish

### 2. Rare Mandelbrot

Mandelbrot should no longer define the whole render.

Rules:

- default Mandelbrot weight should stay low
- rare renders may activate a stronger Mandelbrot accent mode
- when active, Mandelbrot should affect a local story zone instead of the entire image

Target behavior:

- Mandelbrot-first renders should be uncommon
- most renders should read as Julia, string-flow, ring, diamond, or recursive geometry first

### 3. Fewer Dominant Layers

The renderer should reduce visible layer competition.

Preferred dominant stack:

- Julia or flow-based field as the emotional base
- ring, diamond, or spiral story structure
- Sierpinski and Koch as support for masking and contour accents
- fine grain and diagonal filament detail as a finishing layer

Avoid:

- too many equal-weight geometry systems at once
- noisy full-canvas interference that destroys focal clarity

### 4. Electric Mixed Color

The palette should stay vivid and energetic without becoming overexposed.

Rules:

- favor cyan, magenta, violet, blue, and selective white highlights
- keep mid-value brightness above the current darker baseline
- reserve the brightest values for contours and local climax zones
- avoid large dead black regions unless the prompt explicitly asks for darkness

### 5. Metallic Depth

The image should feel dimensional and polished.

Rules:

- metallic treatment follows ridges, diagonal filaments, and story transitions
- highlights sit above the base color field
- specular treatment stays controlled rather than covering the entire frame

## Architecture

### Route Responsibilities

`public-catalog/src/app/api/generate/image/route.ts` becomes the seeded narrative planner.

Responsibilities:

- derive a fresh render plan from `prompt + seed`
- compute a simplified storytelling parameter object
- widen deterministic variation while keeping outputs controlled
- forward explicit narrative fields to Fusion
- return metadata describing the chosen visual recipe

Suggested fields include:

- `story_mode`
- `story_phase_bias`
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

### Fusion Responsibilities

`fusion-service/main.py` becomes the visual compositor that turns those settings into the final image.

Responsibilities:

- keep the render deterministic for a given seed and settings object
- reduce baseline Mandelbrot contribution
- generate cleaner ring, diamond, or spiral storytelling structures
- support fine-grain electric texture and diagonal filament passes
- keep brightness in a healthier mid-range
- apply metallic contours and controlled highlights

## Rendering Model

### Story Modes

The renderer should support a small set of seeded story modes rather than blending everything equally.

Examples:

- `diamond_resonance`
- `ring_memory`
- `diagonal_current`
- `spiral_filament`

Each mode changes which geometry family leads the composition, but all should preserve the same clean, premium look.

### Layer Hierarchy

The final render should follow a clear hierarchy:

1. base flow field
2. story geometry
3. recursive support masks
4. grain and filament detail
5. metallic contour pass
6. highlight and glow finish

This hierarchy is important because it keeps the image readable and stops the output from looking overbuilt.

### Randomness Policy

Increase visible variety through bounded seeded choices in:

- story mode
- focal center
- ring versus diamond emphasis
- filament angle and density
- Mandelbrot rarity and locality
- hue drift
- grain strength
- metallic intensity

Do not allow randomness to:

- destroy print readability
- flatten the image into static noise
- reintroduce heavy dark backgrounds as the default

## Studio Cleanup Plan

### Main Layout

The Studio page should have one primary generator panel and one primary result panel.

The layout should emphasize:

- entering a prompt
- generating artwork
- seeing the result quickly
- moving into customization

### Remove Or Relocate

The following sections should be removed from the primary Studio screen or clearly relegated to a secondary section:

- cross-optimize report block
- live chat panel
- multi-channel poster panel
- social connection buttons
- scheduling calendar
- posting button and posting status area

If there is uncertainty during implementation, the bias should be toward a simpler Studio screen, not preserving clutter.

## Backward Compatibility

- If the new narrative fields are not provided, Fusion should still render successfully.
- Default Fusion behavior should move closer to the new cleaner aesthetic rather than the previous darker baseline.
- Existing generation mode selection and merch preview behavior should continue to work.

## Testing Strategy

### Route Tests

Add or update tests to verify:

- narrative settings are deterministic for a given prompt and seed
- Mandelbrot rare-mode selection is bounded and repeatable
- the Fusion request includes the richer narrative settings
- returned metadata preserves the chosen visual recipe

### Studio Tests

Add or update tests to verify:

- the main Studio generator flow still renders correctly
- the primary generate action remains usable
- removed or relocated secondary sections no longer appear in the main screen as before
- preview and customize actions still work

### Manual Verification

Verify that:

- the Studio page feels cleaner and more focused
- the main creative action is obvious on load
- generated images feel closer to the sample direction
- most renders are vivid and electric rather than dark
- Mandelbrot appears rarely and does not dominate the whole frame

## Risks

- Removing too much from the Studio page could hide workflows still needed elsewhere.
- A cleaner layer stack could reduce complexity if the supporting textures are too weak.
- Stronger electric palettes could become noisy without careful brightness control.
- More explicit render settings add integration work between the route and Fusion service.

## Success Criteria

- The Studio page feels focused and premium instead of crowded.
- The main workflow is immediately understandable.
- Generated images feel cleaner, sharper, more electric, and more controlled.
- Most renders no longer read as Mandelbrot-first or black-heavy.
- The final output still works for merch preview and customization flows.
