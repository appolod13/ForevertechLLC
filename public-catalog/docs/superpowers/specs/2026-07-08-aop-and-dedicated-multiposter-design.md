# AOP Sleeve Printify And Dedicated MultiPoster Design

## Goal

Finish the all-over-print Printify expansion for fuller garment coverage and move the multiposter into its own dedicated top-level site page so it no longer lives inside the main Studio creation flow.

This combined slice includes:

- AOP mockup placement expansion for:
  - `front`
  - `back`
  - `left_sleeve`
  - `right_sleeve`
- inside neck tag branding with the site logo
- optional neck/collar color treatment when the Printify template supports it
- a dedicated top-nav `MultiPoster` page separate from `Studio`

## Approved Direction

- Keep the AOP Printify work focused on template-aware placement expansion and branding.
- Add a dedicated top-level route for the multiposter, such as `/poster`.
- Add `MultiPoster` to the main site navigation.
- Remove the embedded multiposter UI from the Studio page once the dedicated page exists.
- Keep Studio focused on generation, preview, and merch customization.
- Reuse the existing backend poster routes and connection model instead of creating a second posting system.

## Scope

- Update `src/app/api/printify/mockups/route.ts` to fully map AOP body placements and optional branding placements.
- Keep the existing finished-product preview using front/back/left/right Printify mockups.
- Create a new page for the multiposter workflow.
- Update navigation in `src/components/Header.tsx` to expose the new page.
- Move poster-specific UI state out of `src/app/studio/page.tsx` into the new poster page.
- Update send-to-poster entry points in the app to target the dedicated page.
- Add or update focused tests for:
  - Printify route behavior
  - new poster page behavior
  - navigation updates
  - send-to-poster links

## Non-Goals

- No redesign of the image generator itself.
- No redesign of the Printify finished-product tabs beyond using richer mockups.
- No new posting backend architecture beyond the current `/api/post` and `/api/auth/session` flow.
- No requirement to create a public neck-tag-specific preview tab.
- No change to the existing Gallery, Customize, or Catalog core behavior except redirecting poster entry points to the new page.

## Current Problems

### AOP Printify

The current Printify mockup route has been front-heavy and does not guarantee full explicit placement mapping for the AOP tee across sleeves and the full body.

The route needs to treat AOP as a multi-placement product rather than a single front placement.

### MultiPoster Location

The multiposter currently lives inside `Studio`, which creates two problems:

- it competes with the main creation flow
- future poster improvements risk cluttering the Studio page again

The user wants the multiposter preserved, but not embedded in the main Studio workflow.

## Product Design

### Studio

The Studio page should remain focused on:

1. prompt
2. generate
3. generation status/logs
4. latest preview
5. merch-ready preview
6. customize

The full multiposter panel should no longer live directly in Studio.

### Dedicated MultiPoster Page

Create a dedicated page, preferably:

- `/poster`

This page becomes the home for:

- connected platform status
- editable post copy
- selected image/media
- platform toggles
- publish action
- per-platform result feedback

### Navigation

Add a dedicated header nav item:

- `MultiPoster`

This should appear as a first-class destination beside the existing top-level app pages.

## AOP Placement Design

### Required Body Placements

For AOP mode, the mockup route must apply the main artwork to:

- `front`
- `back`
- `left_sleeve`
- `right_sleeve`

These are required for successful full AOP mockup generation.

If any required body placement is missing from the chosen template:

- fail the AOP mockup generation clearly
- do not silently create a partial AOP product

### Site Logo Branding

Use the site logo in:

- `inside neck tag`

This uses a separate logo asset and should be applied only when the template exposes that placement.

### Neck/Collar Color Treatment

Treat collar/neck color as optional and template-aware.

Rules:

- use it only when the template exposes a suitable neck-area placeholder
- skip it when unsupported
- do not fake this visually through unrelated Printify placements

## Poster Data Flow

### Entry Points

The following surfaces can send content to the new multiposter page:

- Studio
- Customize
- Gallery
- Catalog item preview/import actions

Instead of routing to `/studio`, those entry points should route to `/poster` with the existing share payload style:

- `shareImage`
- `shareText`
- `sharePrompt`

### Poster Page Autofill

The dedicated multiposter page should:

- accept incoming share params
- prefill image and text
- allow editing before publish
- load live platform status from `/api/auth/session`
- publish through `/api/post`

## Architecture

### Printify Route Responsibilities

`src/app/api/printify/mockups/route.ts` should:

- inspect AOP template placements
- classify required vs optional placements
- upload artwork asset
- upload site logo asset for the neck tag
- optionally generate/use neck accent asset when supported
- construct a multi-placement Printify payload
- return structured metadata describing applied and skipped placements
- keep current ready/pending/error behavior for front/back/left/right public mockup images

### Poster Page Responsibilities

The new poster page should own:

- poster UI state
- platform connection loading
- share-param import
- posting submission
- per-platform result display

### Studio Responsibilities

`src/app/studio/page.tsx` should:

- keep creation-focused behavior
- remove the embedded multiposter panel
- optionally keep a simple link/action that opens the new poster page with the current image/text prefilled

## Error Handling

### Printify

- fail when required AOP placements are missing
- skip optional neck placements when unavailable
- do not mark mockups ready until public front/back/left/right images exist

### MultiPoster

- show recoverable errors if connection state fails to load
- show platform-specific post failures instead of one opaque error
- still allow the page to render even when the user arrives without image/text

## Testing

Add or update focused tests for:

- Printify route AOP placement expansion
- inside neck tag logo placement
- optional neck/collar skip behavior
- dedicated multiposter page rendering and status loading
- navigation showing the new `MultiPoster` destination
- send-to-poster links routing to `/poster`
- Studio no longer rendering the full embedded multiposter panel once the dedicated page exists

## Files Expected To Change

- `src/app/api/printify/mockups/route.ts`
- `src/app/api/printify/mockups/route.test.ts`
- `src/app/poster/page.tsx` or equivalent new route
- tests for the new poster page
- `src/components/Header.tsx`
- `src/app/studio/page.tsx`
- `src/app/studio/page.test.tsx`
- entry-point components/pages that currently route users to poster behavior through `/studio`
- optional small shared poster helper/component files

## Success Criteria

- AOP mockups apply artwork to `front`, `back`, `left_sleeve`, and `right_sleeve`
- inside neck tag branding uses the site logo when supported
- optional neck/collar treatment only applies when supported
- the multiposter has its own dedicated top-nav page
- Studio returns to a creation-focused layout without losing poster capability
- existing send-to-poster flows route into the new dedicated page
- tests and build pass
