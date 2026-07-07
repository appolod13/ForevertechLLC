# Finished Product Preview Design

## Goal

Show shoppers a more realistic final shirt presentation before purchase by adding a buyer-facing finished product mockup inside the customizer and surfacing a Printify sample preview when available.

## Approved Direction

- Add both:
  - an in-site finished product mockup
  - a Printify sample preview area
- Keep the image generator unchanged.
- Build on top of the current customizer and preview system.

## Scope

- Extend the customizer preview states to include a buyer-facing finished product sample.
- Add a preview section that makes the shirt look closer to a completed product, not just a flat design overlay.
- Add a Printify sample preview panel or link area for final buyer confidence.
- Keep all changes in the UI preview layer.

## Non-Goals

- No changes to generation APIs or providers.
- No required live Printify sample generation during checkout.
- No checkout flow changes.

## UX Design

### Finished Product Mockup

- Add a new preview state such as `finished`.
- Render the generated design inside a more polished shirt card with:
  - stronger garment lighting
  - visible shirt body and product framing
  - clearer front-facing finished-product presentation
- For All-over-print, use broader artwork coverage.
- For standard tees, keep the current front-print logic but present it in a more realistic product-shot layout.

### Printify Sample

- Show a secondary buyer-facing panel below or beside the main preview.
- If a Printify preview URL is available, render it directly as an image or obvious external preview link.
- If no Printify sample is available yet, show a graceful placeholder message that explains a production sample preview becomes available when linked.

## UI Integration

- Add `Finished Product` to the preview tabs in the customizer.
- Keep existing `Front`, `Back`, `Overview`, and `360 Preview`.
- Add a “Buyer Preview” section near the main preview area.
- Add a “Printify Sample” section in the controls area or under the preview.

## Data Handling

- Reuse the existing generated image URL as the source art.
- Add optional product-level preview metadata such as a future `printifyPreviewUrl`, but do not require it.
- Support a local fallback when no Printify sample URL exists.

## Files Expected To Change

- `src/components/ProductCustomizer.tsx`
- `src/components/ProductCustomizer.test.tsx`

## Verification

- Confirm the customizer shows a `Finished Product` preview option.
- Confirm the finished product sample renders before checkout.
- Confirm the UI shows a Printify sample section with either a preview URL or a fallback message.
- Confirm the current generator-backed preview modes still work.
