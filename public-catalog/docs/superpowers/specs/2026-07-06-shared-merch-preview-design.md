# Shared Merch Preview Design

## Goal

Extend the approved buyer-facing merch preview experience beyond `/customize` so shoppers can also see a finished-product mockup and a Printify sample area from the generation flow and from My Gallery.

## Approved Direction

- Apply the approved finished-product preview experience to both:
  - the generation preview flow
  - the gallery flow
- Reuse one shared preview panel across generation, gallery, and `/customize`.
- Keep `/customize` as the full merch editing flow.
- Keep the image generator unchanged.
- Show the Printify sample in-app when available, with a clear external link as needed.

## Scope

- Extract the buyer-facing finished-product preview into a reusable UI component.
- Reuse that component in:
  - `src/components/ImagePreview.tsx`
  - `src/app/gallery/page.tsx`
  - `src/components/ProductCustomizer.tsx`
- Add an in-app gallery preview interaction so users can inspect the merch preview without immediately leaving the gallery.
- Preserve the existing `/customize` route as the full editing and add-to-cart flow.
- Support optional product-level or entry-level `printifyPreviewUrl` data in every preview surface.

## Non-Goals

- No changes to the image generation APIs or generation providers.
- No changes to cart, checkout, or fulfillment behavior.
- No requirement to generate live Printify samples on demand.
- No forced navigation to `/customize` just to see the finished-product mockup.

## Architecture

### Shared Preview Panel

- Introduce a reusable component such as `MerchPreviewPanel`.
- The panel owns the approved buyer-facing display:
  - finished-product mockup
  - Printify sample section
  - fallback message when no Printify sample URL exists
- The component should accept a small, stable input shape so it can render consistently across all entry points.

### Responsibilities

- `ImagePreview.tsx`
  - continues to show the generated image itself
  - adds the shared merch preview panel when an image URL is present
  - keeps the existing `Customize Your Gear` action
- `gallery/page.tsx`
  - keeps the current gallery grid
  - adds a new in-app preview action for each owned image
  - opens the shared merch preview panel in a modal, drawer, or equivalent in-page container
- `ProductCustomizer.tsx`
  - keeps product selection, surfaces, add-to-cart behavior, and full editor controls
  - reuses the shared finished-product and Printify sample rendering instead of duplicating that buyer-preview UI

## UX Design

### Generation Flow

- When a generated image exists, show the shared merch preview panel next to or below the main image preview.
- The user can inspect how the design looks as a finished product before deciding whether to open `/customize`.
- Keep the generation preview primary, with the merch preview acting as a secondary buyer-confidence panel.

### Gallery Flow

- Add a preview action on each gallery card that opens the shared merch preview in-app.
- The preview should show the selected gallery image inside the same finished-product layout already approved for merch previews.
- Keep the existing `Customize Your Gear` action so users can still jump into the full editor when needed.

### Customize Flow

- Keep the existing full customizer behavior.
- Replace the current buyer-facing finished-product markup with the shared preview panel so the same preview look appears everywhere.

### Printify Sample

- If `printifyPreviewUrl` exists, show:
  - an in-app preview image
  - an obvious `Open Printify sample` link
- If `printifyPreviewUrl` does not exist, show the approved fallback copy that explains the finished-product mockup still lets the shopper judge the shirt before purchase.

## Data Flow

### Shared Preview Input

The shared panel should accept data equivalent to:

- `imageUrl`
- `prompt`
- `productName`
- `printType`
- `printifyPreviewUrl`
- optional presentation labels or CTA metadata where needed

### Source Mapping

- Generation flow:
  - `ImagePreview` passes the current generated image URL
  - prompt text can come from the existing locally stored last generation record
- Gallery flow:
  - the selected gallery item passes `imageUrl` and `prompt`
  - any future gallery-level Printify preview metadata can be passed through if available
- Customize flow:
  - `ProductCustomizer` passes the selected product name, current image URL, print type, and optional `printifyPreviewUrl`

## Files Expected To Change

- `src/components/ImagePreview.tsx`
- `src/app/gallery/page.tsx`
- `src/components/ProductCustomizer.tsx`
- `src/components/ProductCustomizer.test.tsx`
- `src/app/gallery/page.test.tsx`
- `src/components/__tests__/ImagePreview.test.tsx`
- a new shared preview component file under `src/components/`

## Testing Strategy

- Add a focused test for the shared merch preview component:
  - renders finished-product buyer preview
  - renders Printify sample image and link when URL exists
  - renders fallback copy when URL is missing
- Extend `ImagePreview` tests to verify the shared merch preview appears when an image is present.
- Extend gallery tests to verify users can open the in-app merch preview from a gallery card.
- Keep existing customizer tests and add or adjust assertions so `/customize` still exposes the approved finished-product preview using the shared component.

## Risks And Guardrails

- Avoid duplicating preview markup across three files; the shared component is the main guardrail.
- Keep the merch preview visually secondary in the generation flow so it does not overwhelm image generation controls.
- Preserve current routing and checkout behavior so preview improvements do not change commerce flow.

## Verification

- Confirm the generation flow shows the approved finished-product preview and Printify sample section when an image exists.
- Confirm the gallery flow opens the same merch preview in-app for a selected item.
- Confirm `/customize` still shows the same buyer-facing finished-product preview after the refactor.
- Confirm fallback copy appears anywhere `printifyPreviewUrl` is missing.
- Confirm the generator flow and existing `Customize Your Gear` navigation still work.
