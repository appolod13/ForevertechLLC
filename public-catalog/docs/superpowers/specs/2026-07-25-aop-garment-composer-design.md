# AOP Garment Composer Design

## Goal

Add a pre-Printify garment composition step so generated shirt designs are prepared as true all-over-print artwork before they reach Printify.

This slice must:

- make the shirt design feel fully covered instead of lightly placed
- generate explicit front, back, left sleeve, and right sleeve assets before Printify
- use the user's logo as the inside-tag graphic
- support collar and neck-area placement rules when the template exposes compatible placeholders
- keep mockups, buyer preview, and production order payloads aligned with the same prepared asset package

## Approved Direction

- Use a pre-Printify garment composer instead of relying on one image reused across template placements.
- Build explicit sliced assets for garment zones before Printify upload.
- Treat inside branding as first-class AOP output, not a hardcoded side behavior.
- Add collar and neck placement support only when the current template actually exposes valid placeholders.
- Reuse one shared garment package across mockup generation, Stripe fulfillment, and crypto fulfillment.

## Scope

- Add a new internal garment composer that converts a generated design into a prepared AOP asset package.
- Extend Printify placement mapping so the app can resolve collar, neck, and label-style aliases safely.
- Replace current AOP "same image everywhere" behavior in:
  - `src/app/api/printify/mockups/route.ts`
  - `src/app/api/stripe/webhook/route.ts`
  - `src/app/api/crypto/confirm/route.ts`
- Allow the inside-neck-tag asset to come from the user's uploaded logo instead of the hardcoded site logo path.
- Return placement metadata that explains which zones were applied, skipped, or unavailable.
- Add focused tests for composer output, placement matching, and fallback behavior.

## Non-Goals

- No full redesign of the merch customizer UI in this slice.
- No attempt to support every possible Printify garment template on day one.
- No freeform visual editor for manually dragging slices.
- No removal of the current standard front/back non-AOP print flow.
- No promise that unsupported templates will magically gain collar placements if Printify does not expose them.

## Current Problems

### AOP Uses One Shared Image

The current AOP pipeline reuses the same uploaded image across front, back, and sleeves, with placement driven only by Printify template transforms.

That causes three problems:

- coverage is inconsistent and can leave the shirt feeling under-designed
- sleeves and back are not intentionally composed as part of one garment layout
- the visual result depends too heavily on Printify placeholder defaults

### Inside Tag Is Hardcoded

The mockup flow uploads a site logo from `public/images/Forevertech_logo.jpg` whenever an inside neck tag placeholder exists.

That is too rigid because:

- it does not use the customer's logo asset
- it does not behave like part of a composed garment package
- it does not extend consistently across all production flows

### Collar / Neck Handling Is Incomplete

The current code can detect some neck-like placeholders, but it does not intentionally prepare neck-area art. In mockups it records support and skips application, while production AOP logic often excludes label and neck placements entirely.

### Fulfillment Flows Diverge

Mockups, Stripe checkout, and crypto checkout do not currently share one AOP preparation model.

Current behavior is split:

- mockups support AOP plus optional inside neck tag
- Stripe fulfillment expands AOP placements broadly but excludes neck/label placements
- crypto fulfillment applies a simpler AOP expansion and does not add logo branding

This creates a mismatch between preview, prepared art, and final fulfillment.

## Product Intent

The shirt should look like the generated artwork was designed for the entire garment, not dropped into a few template boxes.

The user's requested behavior is:

- the generated design covers the shirt more fully
- slices are prepared before Printify
- the user's logo becomes the inside tag
- collar and neck placements follow explicit rules when supported

The uploaded reference images are treated as guidance for the desired coverage behavior:

- strong front coverage
- intentional continuation across the garment
- branding integrated into the inside tag

## Proposed Architecture

### Shared Garment Composer

Add a new internal module, likely under `src/lib/`, that builds a garment package for AOP items.

Suggested module boundary:

- `src/lib/garmentComposer/composeAopGarment.ts`
- supporting helpers for zone mapping, logo asset resolution, and Printify upload packaging

Input:

- generated image URL or source image asset
- prompt metadata
- print type
- optional user branding asset or logo URL
- template placement capabilities

Output:

- `front` asset
- `back` asset
- `left_sleeve` asset
- `right_sleeve` asset
- `inside_neck_tag` asset when branding exists
- optional `neck` / `collar` asset when supported
- composer metadata describing:
  - applied zones
  - skipped zones
  - unsupported zones
  - branding source

### Placement Capability Resolver

Extend current placeholder discovery and alias matching so the system can reason about:

- `front`
- `back`
- `left_sleeve`
- `right_sleeve`
- `inside_neck_tag`
- `inside_label`
- `inner_label`
- `label`
- `neck`
- `collar`

Rules:

- inside branding aliases and neck accent aliases must be treated separately
- a neck-area placeholder that is really the inside label should not be double-filled
- unsupported collar or neck placeholders should be reported, not treated as hard failures

### Shared Printify Packaging Layer

All three flows should use the same garment package:

- mockup generation
- Stripe fulfillment
- crypto fulfillment

That means:

- composer runs once for the chosen source design
- each exported zone is uploaded as a distinct Printify image asset
- Printify print areas are built from those explicit zone assets, not one reused uploaded image

## Composition Model

### 1. Full-Wrap Base

The composer begins by building a normalized all-over garment layout from the generated design.

The first implementation should favor a deterministic fill strategy:

- scale the artwork to ensure strong torso coverage
- allow structured overspill so edges and sleeves feel visually connected
- avoid large empty or weakly designed garment regions

The intent is not photorealistic cloth simulation. The intent is consistent, strong print coverage before Printify receives the assets.

### 2. Zone Slicing

After the base layout is built, the composer slices it into garment zones:

- front
- back
- left sleeve
- right sleeve

Slice rules:

- each zone is exported as its own image asset
- slices should preserve the overall garment story instead of looking like unrelated crops
- sleeve art should feel connected to the body design, not accidental

### 3. Inside Tag Branding

Inside tag handling becomes part of the garment composer, not a hardcoded upload shortcut.

Rules:

- if the user has provided a logo asset, use that for the inside tag
- if no user logo exists, fall back to the current site-logo behavior only if product rules allow fallback
- inside tag output should be a dedicated branding asset, not a crop from the main wrap design

### 4. Collar And Neck Accents

Collar and neck control should be rule-based.

Rules:

- only apply neck-area art if the template exposes supported placeholders
- do not reuse the main artwork blindly in collar zones
- if a collar asset is used, prefer a simplified continuation or branded accent treatment rather than a noisy torso crop
- if no suitable placeholder exists, skip neck accent placement and report it in metadata

## Data Flow

### Mockup Flow

1. Studio or preview requests a Printify mockup.
2. `POST /api/printify/mockups` resolves template and placement capabilities.
3. Garment composer creates zone assets and branding assets.
4. Each zone asset is uploaded to Printify.
5. Printify product placeholders are filled with explicit per-zone assets.
6. Mockup metadata returns applied and skipped zones.

### Stripe Fulfillment Flow

1. Checkout webhook prepares the purchased design.
2. If `printType === 'all_over_print'`, the garment composer creates the AOP package.
3. Order payload uses explicit zone assets for AOP placements.
4. Inside tag and supported neck placements are added from the same package.

### Crypto Fulfillment Flow

1. Crypto order confirmation resolves the purchased design.
2. If `printType === 'all_over_print'`, the same garment composer runs.
3. Order payload mirrors Stripe fulfillment behavior so crypto orders no longer lag behind branding and placement support.

## File Changes

### New Files

- `src/lib/garmentComposer/composeAopGarment.ts`
- `src/lib/garmentComposer/placementAliases.ts`
- `src/lib/garmentComposer/logoSource.ts`
- supporting tests for the garment composer and placement resolver

### Existing Files Expected To Change

- `src/app/api/printify/mockups/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/crypto/confirm/route.ts`
- `src/lib/printifyProductMode.ts`
- any preview code that needs to surface applied zones or garment-package metadata

## API And Metadata Changes

### Mockup Response Metadata

Extend mockup metadata to include composer details such as:

- `appliedZones`
- `skippedZones`
- `unsupportedZones`
- `brandingSource`
- `collarMode`

This helps debug template-specific behavior and verify that the composed package matches the expected garment coverage.

### Logo Source Contract

The composer needs a clear branding input contract.

Recommended priority:

1. user-uploaded logo asset
2. stored account branding asset
3. site-logo fallback

The exact source lookup can be finalized in implementation, but the contract should be explicit and shared by all order flows.

## Fallback Rules

- If required AOP body placements are missing, fail the AOP preparation for that template with a clear error.
- If inside neck tag is missing, continue without branding and report it in metadata.
- If collar or neck accents are unsupported, skip them without failing the order.
- If the user logo is unavailable, use configured fallback behavior instead of blocking garment preparation completely.
- If the composer fails in a mockup flow, return a clear error and avoid silently creating misleading mockups.

## Testing Strategy

- Add unit tests for:
  - placement alias resolution
  - zone package generation
  - logo source selection
  - collar/neck fallback behavior
- Add route tests for:
  - mockup flow using explicit per-zone assets
  - Stripe AOP fulfillment using composer output
  - crypto AOP fulfillment using composer output
- Add regression checks so inside-tag branding is no longer hardcoded to one site asset when a user logo exists.
- Add metadata assertions proving skipped and applied zones are surfaced correctly.

## Rollout Plan

### Phase 1: Composer Foundations

- add garment composer
- add explicit front/back/left/right sleeve asset generation
- add user-logo-aware inside tag handling

### Phase 2: Placement Integration

- integrate composer output into mockup route
- integrate composer output into Stripe and crypto fulfillment
- unify AOP placement mapping across flows

### Phase 3: Collar / Neck Control

- add neck and collar alias resolution
- add safe collar accent application rules
- report supported-but-skipped collar situations in metadata

### Phase 4: Verification

- run focused tests
- verify generated mockups show fuller garment coverage
- verify inside tag uses the intended branding asset
- verify Stripe and crypto orders use the same composer behavior

## Acceptance Criteria

- AOP items no longer rely on one reused image across all garment placements.
- The app prepares explicit front, back, left sleeve, and right sleeve assets before sending AOP artwork to Printify.
- Inside tag output uses the user's branding asset when available.
- Collar and neck placements are applied only when the template supports them and are skipped safely otherwise.
- Mockup generation, Stripe fulfillment, and crypto fulfillment all use the same garment package model.
- Response metadata clearly identifies applied, skipped, and unsupported garment zones.
