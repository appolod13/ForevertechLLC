# AOP Sleeve And Neck Tag Printify Design

## Goal

Expand the all-over-print mockup generation flow so it applies artwork to the full supported garment surface for the AOP tee, including:

- `front`
- `back`
- `left_sleeve`
- `right_sleeve`

Also add site branding to the inside neck tag area when the Printify template supports that placement, and preserve the current Finished Product preview flow so it reflects the fuller AOP layout.

## Approved Direction

- Use the AOP Printify template as the source of truth for supported placements.
- Expand the mockup payload beyond the current single front placement.
- Require full public AOP body coverage for:
  - `front`
  - `back`
  - `left_sleeve`
  - `right_sleeve`
- Add the site logo to the `inside neck tag` placement when that placeholder exists.
- Treat collar/neck color treatment as optional and template-driven, not a fake preview-only decoration.
- Keep the Finished Product preview based on real Printify mockups whenever available.

## Scope

- Update `src/app/api/printify/mockups/route.ts` to map multiple AOP placements from the selected template.
- Add support for a second upload asset for the site logo used in the inside neck tag placement.
- Add optional handling for neck/collar color treatment only when a usable template placement exists.
- Return enough metadata for the UI and tests to understand which placements were applied and which were skipped.
- Keep using the existing Finished Product preview component and view tabs.
- Add or update focused route/component tests for the new placement behavior.

## Non-Goals

- No redesign of the Studio, Gallery, or Customize UI beyond consuming the richer mockup result.
- No attempt to invent Printify placements that are not exposed by the selected template.
- No replacement of the current cached mockup model.
- No requirement to add a public neck-tag preview tab if Printify does not provide that view.
- No changes to the fractal image generator itself.

## Current Problem

The current AOP mockup route is only creating one print area using a front-focused placeholder. That means:

- the AOP shirt can still look front-only in practice
- sleeve coverage is not explicitly applied in the generated Printify product payload
- inside neck tag branding is not currently used
- the Finished Product preview can only show richer wrap coverage if Printify already returns those views from a fuller placement payload

The preview system is already prepared to show:

- `front`
- `back`
- `left`
- `right`

But the route needs to actually populate the underlying Printify product with the corresponding print placements.

## Product Design

### AOP Placement Coverage

For the AOP tee, the route should construct the Printify `print_areas` payload using the template's actual placeholders and map the generated artwork to:

- `front`
- `back`
- `left_sleeve`
- `right_sleeve`

All four of these are part of the required AOP surface for this feature.

### Site Branding

The site logo should be uploaded as a separate Printify image asset and applied to:

- `inside neck tag`

This branding is preferred, but not mandatory for successful public mockup generation.

### Neck/Collar Treatment

Neck or collar color treatment should only be added when the template exposes a usable neck-area placement.

Rules:

- if the template exposes a safe neck-area placeholder, use a simple brand color asset there
- if not, skip that treatment
- do not fake collar color in the Printify payload using unrelated placements

## Placement Model

### Source Of Truth

The selected Printify AOP template product remains the source of truth for what can actually be applied.

The route should inspect all placeholders for the chosen variant and normalize them into:

- required body placements
- optional branding placements
- optional neck/collar treatment placements

### Required Placements

These must exist for full AOP sleeve mode to succeed:

- `front`
- `back`
- `left_sleeve`
- `right_sleeve`

If any of these are missing, the route should fail clearly instead of silently creating a partial AOP product.

### Optional Placements

These may be present and should be used if available:

- `inside neck tag`
- supported neck/collar placement if the template exposes one

If optional placements are missing:

- body+sleeve mockup generation should continue
- the response metadata should mark those optional placements as skipped

## API Design

### Mockup Generation Route

`src/app/api/printify/mockups/route.ts` should:

1. load the chosen AOP template
2. inspect the available placeholders for the primary variant
3. resolve placeholder transforms for:
   - `front`
   - `back`
   - `left_sleeve`
   - `right_sleeve`
4. upload the artwork image asset
5. upload the site logo asset for the neck tag when needed
6. optionally upload or generate a neck/collar accent asset if supported
7. construct a multi-placeholder `print_areas` payload
8. create the Printify product
9. poll until the route can extract:
   - `frontUrl`
   - `backUrl`
   - `leftUrl`
   - `rightUrl`

### Response Metadata

The route should include metadata that explains:

- which placements were applied
- which placements were skipped
- whether the neck tag logo was applied
- whether collar/neck treatment was applied or skipped

This metadata is useful for testing and future UI messaging even if it is not immediately shown to the user.

## Finished Product Preview

### Existing UI

The current Finished Product preview already supports switching between:

- `Front`
- `Back`
- `Left`
- `Right`

This should remain the primary public-facing viewer for the richer AOP mockups.

### Preview Rules

- if Printify returns all required public mockup views, use them as the hero preview
- if mockups are still pending, keep the current pending/polling behavior
- if the route fails because required sleeve/body placements are missing, show the existing fallback preview with an error state
- the inside neck tag does not require its own preview tab unless Printify provides a dedicated mockup view for it

## Assets

### Artwork Asset

The main generated artwork remains the shared asset used for:

- `front`
- `back`
- `left_sleeve`
- `right_sleeve`

### Site Logo Asset

The route should use a site-logo image asset for the inside neck tag.

Implementation direction:

- prefer a stable existing site logo asset from the repo if available
- if none exists in the needed format, create or derive a small clean logo asset suitable for tag branding
- keep the logo treatment simple and legible

### Collar Accent Asset

If collar/neck placement is supported, use a simple brand-color asset rather than a complex image composition.

## Error Handling

- If any required AOP body placement is missing, fail mockup generation with a clear placement-related error.
- If `inside neck tag` is missing, continue without failing the full mockup generation.
- If collar/neck treatment placement is unavailable, skip it without failing the main mockup generation.
- If Printify returns incomplete public mockup images after product creation, keep the existing pending/error handling and avoid marking the result `ready` until all required public views exist.

## Testing

Add or update focused tests for:

- placement discovery for AOP templates
- expansion of the Printify payload to:
  - `front`
  - `back`
  - `left_sleeve`
  - `right_sleeve`
- optional `inside neck tag` logo placement
- skip behavior for missing optional neck/collar placements
- failure behavior for missing required sleeve/body placements
- continued Finished Product support for left/right/front/back view switching

## Files Expected To Change

- `src/app/api/printify/mockups/route.ts`
- route tests for Printify mockups
- `src/components/MerchPreviewPanel.tsx` only if small metadata or fallback messaging adjustments are needed
- `src/components/MerchPreviewPanel.mockups.test.tsx` if preview behavior needs test updates
- optional logo/branding asset file if the neck tag needs a dedicated source image

## Success Criteria

- AOP mockup generation applies artwork to `front`, `back`, `left_sleeve`, and `right_sleeve`.
- Inside neck tag branding is added when supported by the Printify template.
- Collar/neck accent treatment is applied only when a valid template placement exists.
- Finished Product continues to show front/back/left/right views using real Printify mockups.
- Partial or misleading AOP success is avoided when required sleeve/body placements are missing.
