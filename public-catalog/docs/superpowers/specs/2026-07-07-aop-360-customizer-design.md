# All-Over-Print And 360 Preview Design

## Goal

Add a real All-over-print shirt option to the current product flow, redesign the customizer to feel more premium and easier to use on a dark theme, and introduce a 360 degree preview mode for shirt products without changing or risking the image generator pipeline.

## Approved Direction

- Use the existing product-mode architecture inside the current customizer instead of building a separate page.
- Add a real, orderable All-over-print product option.
- Add a 360 degree preview mode for shirt previews.
- Keep the current image generator, generation APIs, and studio generation logic unchanged.

## Scope

- Extend the products API to return:
  - the current premium tee product
  - a new All-over-print tee product
- Update the product customizer UI to support:
  - product tabs for standard and All-over-print shirts
  - a more professional black premium layout
  - easier product, size, color, and preview navigation
  - preview tabs for front, back, overview, and 360 degree preview
- Carry the selected shirt mode and Printify template metadata through cart and checkout.
- Update Printify fulfillment logic so the All-over-print product can be fulfilled safely.
- Mirror the same AOP fulfillment metadata handling in the crypto confirm route for consistency.

## Non-Goals

- No changes to the image generation providers or generation prompts.
- No changes to studio generation APIs.
- No change to the Premium Creator payment flow.

## Product Model

Add explicit product-mode metadata to the product records returned by `/api/products`.

Suggested shape additions:

- `printType`: `standard` or `all_over_print`
- `surfaces`: list of preview/placement surfaces such as `front`, `back`, `overview`
- `previewMode`: `flat` or `aop`
- `templateProductId`: optional explicit Printify template identifier
- `placementMode`: `single_front_with_back_optional` or `all_over_print`

The standard tee should continue to use the existing fulfillment defaults.
The All-over-print tee should include its own SKU mapping and placement metadata so fulfillment can branch cleanly.

## UI Architecture

Keep one customizer component, but split it into product modes.

- `designMode`: derived from selected product and used to switch between `standard` and `all_over_print`
- `view`: expanded from just `front/back` to include `front`, `back`, `overview`, and `spin360`
- `spinAngle`: client-only state used by the 360 degree preview renderer

The current generator output remains the source artwork for both shirt types.

## Page Design

Refresh the customizer page with a more professional dark commerce layout inspired by Printify-style configurators:

- stronger product selection cards at the top
- clearer split between preview panel and controls panel
- improved visual hierarchy for product type, size, color, and optional back extras
- stronger CTA area with cleaner pricing and checkout readiness
- black-first styling with more refined borders, spacing, and contrast

## Preview Design

### Standard Tee

- Preserve front and back preview support.
- Add:
  - `Overview`: a split or staged premium preview of front and back together
  - `360 Preview`: a simulated rotational shirt preview using the existing design art mapped to a rotating shirt silhouette

### All-Over-Print Tee

- Use dedicated preview tabs:
  - `Front`
  - `Back`
  - `Overview`
  - `360 Preview`
- The AOP preview does not require generator changes.
- The preview may simulate wrap coverage by using the current art across a wider garment area and varying transform/perspective in the 360 state.

## Fulfillment Design

### Cart Metadata

Store additional metadata when adding items to cart:

- `printType`
- `placementMode`
- `templateProductId`
- `surfaces`
- `previewMode`

This keeps the current checkout route stable while giving fulfillment enough context to branch cleanly.

### Stripe Webhook Fulfillment

Branch fulfillment in `/api/stripe/webhook`:

- `standard`
  - keep current front placement and optional back placement behavior
- `all_over_print`
  - expand print areas using the selected AOP metadata and the available template placement keys for the variant
  - map uploaded front artwork to the AOP-compatible placements
  - preserve optional back/branding behavior only when supported by the AOP template

### Crypto Confirm Fulfillment

Apply the same product-type branching in `/api/crypto/confirm`.

## Safety Constraints

- Do not modify `generate/image` logic.
- Do not change generator config or provider selection.
- Do not change studio generation request structure.
- Keep all new logic in products, customizer, checkout metadata, and fulfillment mapping layers.

## Files Expected To Change

- `src/app/api/products/route.ts`
- `src/components/ProductCustomizer.tsx`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/crypto/confirm/route.ts`
- possibly targeted tests that cover product options or customizer behavior

## Verification

- Confirm `/api/products` returns both standard tee and All-over-print tee options.
- Confirm the customizer renders a new All-over-print option and new preview tabs.
- Confirm the 360 degree preview mode works client-side without changing generator output.
- Confirm cart metadata carries the selected product mode and AOP placement fields.
- Confirm standard tee fulfillment remains unchanged.
- Confirm All-over-print fulfillment branches safely and does not remove support for the existing tee flow.
