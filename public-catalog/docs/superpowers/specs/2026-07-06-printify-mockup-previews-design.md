# Printify Mockup Previews (Front/Back/Left/Right)

## Goal

Make the Finished Product preview look like a real Printify mockup (full shirt render), and ensure mockups are always available for a design with:

- Front
- Back
- Left shoulder
- Right shoulder

## Approved Direction

- Use Printify mockup images as the primary Finished Product preview when available.
- Generate mockups on-demand the first time a user opens Finished Product.
- Cache mockups so they are reusable across catalog, studio, gallery, and customize.
- Use the AOP template product for mockup generation so shoulder/sleeve views exist reliably.

## Non-Goals

- No changes to the image generation model/provider behavior.
- No requirement to fetch a live Printify product catalog.
- No requirement to generate mockups only at checkout (buyer needs to see them before purchase).

## Architecture

### Design Keying

Mockups are generated and cached per design (artwork image URL + optional prompt), not per cart item.

- `design_hash = sha256(normalizedImageUrl + "\n" + normalizedPrompt)`
- `normalizedImageUrl`: trimmed, no trailing spaces
- `normalizedPrompt`: trimmed, can be empty

This allows any app surface that has `imageUrl` (+ optional prompt) to request mockups and get the same cached result.

### Persistence

Persist mockups durably in Supabase, independent of Gallery, so they are “always available” even if the image is not explicitly saved.

New table: `design_mockups`

- `design_hash` (PK)
- `image_url`
- `prompt`
- `printify_product_id` (optional, used for debug/regeneration)
- `mockup_front_url`
- `mockup_back_url`
- `mockup_left_url`
- `mockup_right_url`
- `status` (`pending` | `ready` | `error`)
- `error_message` (optional)
- `created_at`, `updated_at`

### On-Demand Generation Flow

When a user opens Finished Product:

1. UI calls `POST /api/printify/mockups` with `imageUrl` and optional `prompt`.
2. API computes `design_hash`.
3. If a `ready` row exists with all four URLs, return it immediately.
4. If a `pending` row exists, return `pending` so UI can show “Generating mockups…” and poll.
5. Otherwise create `pending`, run Printify generation, store URLs, set `ready`, return result.

### Printify Generation Strategy

Use the existing Printify patterns already in the repo:

- Upload image via `POST /v1/uploads/images.json` (returns `id` and `preview_url`)
- Create a Printify product based on the configured AOP template product id:
  - `PRINTIFY_SHOP_ID`
  - `PRINTIFY_AOP_TEMPLATE_PRODUCT_ID` (preferred) or `PRINTIFY_TEMPLATE_PRODUCT_ID` as fallback
- Apply uploaded artwork to the correct placeholders/placements (existing template transform helpers).
- Publish the product if needed for mockup generation.
- Retrieve mockup images:
  - Prefer official Printify “mockups/images” endpoints if available for the created product.
  - Fallback: store the best available Printify preview URLs returned by the product object.

Mockup selection must reliably map to these view keys:

- `front`
- `back`
- `left` (left shoulder / left sleeve angle)
- `right` (right shoulder / right sleeve angle)

If Printify cannot produce left/right for a particular template/provider, keep status `ready` only when all required views exist; otherwise set `error` with a clear message.

## UI/UX

### Finished Product Preview

- If `mockup_*_url` exist: show Printify mockup hero.
- Add view selector tabs/buttons:
  - Front, Back, Left, Right
- While status is `pending`: show a “Generating Printify mockups…” state with a spinner and disable the view switcher.
- On error: show fallback buyer preview (current in-app mock) + a message “Printify mockup generation failed” and a retry button.

### Shared Component Integration

Extend `MerchPreviewPanel` to support a `printifyMockups` object:

```ts
type PrintifyMockups = {
  status: 'pending' | 'ready' | 'error';
  frontUrl?: string;
  backUrl?: string;
  leftUrl?: string;
  rightUrl?: string;
};
```

Priority order for Finished Product hero:

1. `printifyMockups` (ready) for selected view
2. Existing single `printifyPreviewUrl` (fallback)
3. In-app buyer preview mock

## API

### `POST /api/printify/mockups`

Request:

- `imageUrl` (required)
- `prompt` (optional)

Response:

- `success`
- `designHash`
- `status`
- `mockups` (front/back/left/right URLs if ready)
- `error` (if any)

### `GET /api/printify/mockups?designHash=...`

Returns current status for polling.

## Database Migration

Add migration: `supabase/migrations/003_design_mockups.sql`

- Create `design_mockups`
- Index by `updated_at`
- Optional RLS rules (readable by anonymous if desired, or locked behind server routes only)

## Testing Strategy

- Unit tests for:
  - design hash normalization and stability
  - mockup selection mapping (front/back/left/right)
- Route tests for:
  - cache hit returns without calling Printify
  - pending behavior returns `pending`
  - error behavior persists `error_message`
- Component tests for:
  - view switcher changes the hero URL
  - pending renders loading state
  - error falls back to in-app buyer preview

## Verification

- Open Finished Product on mobile:
  - mockup renders as full shirt like Printify screenshot
  - no clipping
  - Front/Back/Left/Right tabs switch images
- Refresh the page:
  - mockups load immediately from cache without regeneration
- Open from different entry points (catalog, studio, gallery, customize):
  - same design produces the same cached mockups
