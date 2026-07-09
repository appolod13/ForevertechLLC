# AOP Sleeve And Neck Tag Printify Implementation Plan

## Objective

Implement the approved all-over-print mockup enhancement by expanding the Printify mockup route to apply artwork across:

- `front`
- `back`
- `left_sleeve`
- `right_sleeve`

and by adding optional inside neck-tag branding and optional collar/neck accent support when the selected AOP template exposes those placements.

## Workstreams

### 1. Placement Discovery And Classification

Files:

- `public-catalog/src/app/api/printify/mockups/route.ts`
- `public-catalog/src/app/api/printify/mockups/route.test.ts`

Tasks:

- add helper logic to inspect all placeholders for the selected AOP variant
- classify placeholders into:
  - required body placements
  - optional neck-tag placement
  - optional collar/neck accent placement
- support placement name matching for template variations such as:
  - `front`
  - `back`
  - `left_sleeve`
  - `right_sleeve`
  - `inside neck tag`
  - template-specific neck/collar naming variants
- fail clearly when any required AOP body placement is missing

Acceptance criteria:

- the route can reliably find all required sleeve/body placements from the template
- optional neck placements are discovered when present
- required placement gaps produce a clear error

### 2. Multi-Asset Upload Flow

Files:

- `public-catalog/src/app/api/printify/mockups/route.ts`
- optional supporting asset under `public-catalog/public/`

Tasks:

- keep the main generated artwork as the shared asset for:
  - `front`
  - `back`
  - `left_sleeve`
  - `right_sleeve`
- use the existing logo asset for inside neck-tag branding:
  - `public/images/Forevertech_logo.jpg`
- create a simple collar/neck accent asset in memory or from a tiny deterministic source when that optional placement exists
- upload the additional branding assets only when their placements are available

Acceptance criteria:

- the route can upload and reference both the main artwork asset and the neck-tag logo asset
- optional collar accent asset is only created when needed

### 3. Multi-Placement Printify Payload

Files:

- `public-catalog/src/app/api/printify/mockups/route.ts`

Tasks:

- replace the current single-placeholder print payload with a multi-placeholder payload
- map the main artwork transform to:
  - `front`
  - `back`
  - `left_sleeve`
  - `right_sleeve`
- map the logo asset to the inside neck-tag placement when present
- map the collar accent asset to the optional neck/collar placement when present
- keep variant and template handling compatible with the existing AOP flow

Acceptance criteria:

- created Printify products include the full required AOP body placements
- neck-tag branding is applied when supported
- optional collar treatment is applied only when supported

### 4. Response Metadata And Fallback Behavior

Files:

- `public-catalog/src/app/api/printify/mockups/route.ts`
- optional consumer tests if metadata is surfaced later

Tasks:

- return structured metadata describing:
  - applied placements
  - skipped optional placements
  - whether the neck-tag logo was applied
  - whether collar accent treatment was applied
- keep the current ready/pending/error contract for public mockup URLs
- only mark mockups `ready` when public mockup images exist for:
  - `front`
  - `back`
  - `left`
  - `right`

Acceptance criteria:

- route responses explain what happened without weakening the current mockup readiness rules
- incomplete public mockups do not get mislabeled as ready

### 5. Test-First Coverage

Files:

- `public-catalog/src/app/api/printify/mockups/route.test.ts`
- `public-catalog/src/components/MerchPreviewPanel.mockups.test.tsx` only if needed

Tasks:

- first add failing route tests for:
  - missing required sleeve/body placement failure
  - multi-placement payload construction for `front`, `back`, `left_sleeve`, and `right_sleeve`
  - optional inside neck-tag logo placement
  - optional collar/neck accent skip behavior
- keep preview tests unchanged unless metadata or fallback messages require small adjustments
- verify tests fail for the intended reasons before implementing production code

Acceptance criteria:

- the new AOP placement behavior is covered by focused route tests
- tests stay behavioral and do not overfit to implementation details

## Suggested Execution Order

1. Add failing route tests for required placement detection and expanded Printify payload behavior.
2. Add helper logic for placement classification and transform lookup.
3. Add multi-asset upload flow for artwork, neck-tag logo, and optional collar accent.
4. Build the multi-placeholder Printify payload.
5. Return applied/skipped placement metadata.
6. Run targeted tests and production build.

## Verification Plan

### Automated

- run `vitest` for `src/app/api/printify/mockups/route.test.ts`
- run `vitest` for any preview tests touched
- run `npm -C public-catalog run build`

### Manual

- request AOP mockups and confirm the route no longer uses front-only placement logic
- confirm inside neck-tag branding is applied when the template supports it
- confirm collar accent is skipped cleanly when unsupported
- confirm Finished Product still uses front/back/left/right mockup views

## Risks And Mitigations

- risk: Printify placement names vary across templates
- mitigation: centralize placement matching with flexible normalization and explicit required/optional classification

- risk: collar accent support is not consistently exposed by templates
- mitigation: treat collar treatment as optional and never fail the main body+sleeve flow because of it

- risk: extra asset uploads complicate the route
- mitigation: keep assets limited to the main artwork, one logo asset, and one optional simple accent asset

- risk: route tests become brittle against Printify payload details
- mitigation: assert the required placement coverage and asset mapping, not every incidental field

## Done Definition

- AOP mockup generation applies art to `front`, `back`, `left_sleeve`, and `right_sleeve`
- inside neck-tag branding is applied when supported
- optional collar/neck accent behavior is supported without breaking unsupported templates
- mockups are still only marked ready when all public views exist
- targeted tests and build pass
