# Generator Reset, Detail Guard, and 3D Wormhole Design

## Goal

Upgrade the Studio image generator so it consistently produces dense, beautiful fractal designs closer to the approved references, avoids weak-detail or empty-looking renders, and gives free users a safe way to reset generator state after reaching the 20-generation limit.

This iteration focuses on two linked outcomes:

- improve the live fractal generator so it produces richer, more reliable combinations of the approved fractal styles
- add a reset path that clears generator memory and saved preview state when the free-generation session reaches its limit

## Approved Direction

- Use quality gate plus hard reset as the core approach.
- Keep a little of a profile system inside it by generating from a small set of strong pattern families.
- Combine the approved visual families in one render instead of selecting only one family.
- Add a 3D dimensional drift wormhole effect that increases spatial depth without collapsing the design into an empty tunnel.
- Avoid the current bad result pattern: weak-detail, flat, purple-heavy, edge-only images.
- Keep the whole flow safe for deployed Render usage.

## Scope

- Update `fusion-service/main.py` to:
  - generate stronger fractal family combinations
  - add a depth-oriented dimensional drift wormhole layer
  - reject or retry weak-detail outputs before they become final
- Update `public-catalog/src/app/api/generate/image/route.ts` to:
  - track generation session count
  - support reset behavior and clean session restart
  - keep Render-safe image URL behavior intact
- Update `public-catalog/src/app/studio/page.tsx` to:
  - show free-version generation count state
  - show a reset button when the free limit is reached
  - clear latest preview state when reset is triggered
- Add or update focused tests covering reset behavior, detail guards, and Render-safe generation.

## Non-Goals

- No change to checkout, merch pricing, or purchase flows.
- No new advanced art-direction control panel with sliders or tabs.
- No destructive server-side cleanup of uploaded files on Render.
- No attempt to reproduce any one attached image exactly.
- No external model integration or replacement of the current Fusion architecture.

## Current Problems

### 1. Weak Detail Failure Mode

The current generator can still produce outputs that have:

- too much flat area
- too little recursive density
- large regions of background wash with only thin contour edges
- insufficient relationship between color structure and fractal geometry

This is the main visual failure to block.

### 2. Generator Drift

Repeated generations can drift into weak or repetitive directions during a free session. The user wants a way to clear the saved output and generator memory state after hitting the session limit.

### 3. Render Compatibility

Any reset behavior must work in deployed Render environments where direct file cleanup is not the right primitive. Reset must operate through app-side session state and generator bias state, not through destructive server wipes.

## Reference Aesthetic

The approved references establish four compatible visual families:

### 1. Magma Ribbon

- thick red, orange, and yellow ribbons
- bright contour bands
- sharp metallic or white ridges

### 2. Rainbow Scallop

- large scalloped color lobes
- bold rainbow transitions
- recursive coastlines and cavities

### 3. Pastel Fractal Lace

- glowing cyan, pink, violet, and white branching forms
- bright luminous centers
- delicate recursive lace edges

### 4. Dimensional Drift Wormhole

- space-bending movement through the design
- depth cues that make some ridges feel closer and some zones feel farther away
- spiral or radial drift around branch tips and recursive structure

The goal is not to clone any one reference, but to produce new combinations that stay recognizably within this family.

## Product Design

### Free Session Counter

The Studio experience should track the current generation session count for free usage.

Behavior:

- increment on each successful generation attempt
- once the session reaches `20`, mark the session as full
- surface a reset affordance instead of silently continuing to drift

### Reset Generator Button

Add a visible `Reset Generator` action for free users.

When triggered, reset clears:

- latest generated preview image
- saved current generation metadata
- session generation counter
- generator family drift state and weak-output retry history

After reset, the next generation starts from a clean approved family mix.

### User Experience Rules

- reset should feel fast and safe
- reset should not require a page reload
- reset should not break the current Studio flow
- reset should be available both when the user reaches the free limit and when they want to recover from a bad direction

## Visual Design Principles

### 1. Dense Recursive Beauty

The generator should favor images with clear recursive density and internal variation.

Target behavior:

- visible substructure at multiple scales
- meaningful contour stacks and branch detail
- no large dead regions unless explicitly requested by prompt

### 2. Controlled Combination

Every render should combine all approved families, but with hierarchy:

- one family acts as the primary structural driver
- one family acts as the secondary color and banding driver
- one family acts as the accent driver
- the dimensional drift wormhole layer modifies depth and motion across the whole result

This keeps output inventive while avoiding chaotic equal-weight blending.

### 3. 3D Dimensional Drift

The wormhole layer should create the feeling that the fractal folds into depth.

Rules:

- use a depth field that separates near ridges from farther background zones
- apply drift through radial pull, angular twist, and depth-dependent warp
- concentrate the effect near recursive edges, branch tips, and story centers
- do not let the effect erase detail or create a large empty tunnel

### 4. Detail-First Safety

The generator should reject low-detail renders before they become the latest preview.

Rules:

- flat-area ratio must stay below a threshold
- edge density must stay above a threshold
- recursive variation must stay above a threshold
- family fingerprint checks should confirm presence of approved structure types

If a render fails, the system retries with stronger detail settings.

## Architecture

### Studio Responsibilities

`public-catalog/src/app/studio/page.tsx`

Responsibilities:

- display current session generation count
- show reset state and reset button
- clear preview state on reset
- continue showing latest successful Render-safe image after valid generations

### Route Responsibilities

`public-catalog/src/app/api/generate/image/route.ts`

Responsibilities:

- derive a fresh seeded render plan from `prompt + seed + session state`
- track session count and free-limit state
- support reset requests that clear count and generator memory
- preserve the existing `/api/fusion-image` proxy-safe image URL behavior
- return metadata describing family mix, retry count, and quality gate outcomes

### Fusion Responsibilities

`fusion-service/main.py`

Responsibilities:

- generate the blended fractal field
- compute the dimensional drift wormhole depth field
- keep Mandelbrot tiny and local only
- enforce detail quality checks before final acceptance
- retry with stronger recursive settings when quality checks fail

## Rendering Model

### Family Blend Model

Each render should be composed from four coordinated layers:

1. `magma_ribbon`
- thick warm flow bands
- major contour rhythm

2. `rainbow_scallop`
- large rainbow transitions and cavity bands
- scalloped recursive coastlines

3. `pastel_lace`
- luminous branching highlights
- bright cyan, pink, violet, and white resolution zones

4. `dimensional_drift_wormhole`
- depth field
- radial drift
- angular twist
- perspective-like pull through recursive zones

### Detail Guard

The renderer should score each candidate image using metrics such as:

- edge density
- local variance
- recursive contour richness
- flat-area coverage

If the score is below threshold:

- increase contour density
- reduce flat wash influence
- strengthen recursive support masks
- strengthen branch and filament detail
- rerun within a bounded retry count

### Wormhole Drift Model

The dimensional layer should include:

- radial distance from one or more seeded focal centers
- angular phase for twist
- depth modulation tied to recursive edges
- story-phase bias so some zones feel closer and others feel more distant

The result should feel spatial and cinematic, not blurry.

## Reset Model

### Session State

Store a lightweight generator session object that can include:

- `generation_count`
- `reset_version`
- `family_bias_seed`
- `bad_output_streak`

### Reset Behavior

When reset is triggered:

- set `generation_count` back to `0`
- increment `reset_version`
- clear `bad_output_streak`
- regenerate `family_bias_seed`
- clear the latest preview override shown in Studio

This gives the user a real fresh start without server-side destructive cleanup.

## Error Handling

- If the reset request fails, keep the last valid image visible and show a clear recoverable error.
- If a candidate image fails the detail gate too many times, fall back to the strongest approved family recipe rather than returning a weak result.
- If Fusion returns a relative uploaded image path, continue using the existing proxy-safe URL translation.
- If deployed Fusion rejects any new route fields, keep compatibility retry behavior in place where possible.

## Testing

Add or update focused tests for:

- session count reaching `20`
- reset clearing session count and preview state
- detail guard rejecting weak-detail candidates
- family blend metadata staying within approved family names
- Render-safe proxied image URLs continuing to work after reset
- deterministic behavior for a given seed and reset version

## Success Criteria

This iteration is successful when:

- free users can reset the generator cleanly after reaching `20` generations
- latest preview resets without breaking Studio flow
- weak-detail outputs no longer become the latest visible result
- generated images stay much closer to the approved reference family
- dimensional drift adds depth without creating empty tunnel-like failures
- the system remains safe to run on Render
