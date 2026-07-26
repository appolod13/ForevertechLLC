# Branding Logo Phone Upload Design

## Goal

Make the saved branding logo usable on mobile by letting the user pick an image from phone photos while still keeping manual URL entry as a fallback.

This slice must:

- add a mobile-friendly photo picker to the existing `Branding Logo` section in `Profile`
- keep the current URL input path for users who already host a logo image elsewhere
- save both upload and URL entry into the same stored `logoUrl` value
- preserve the existing downstream AOP, mockup, cart, Stripe, and crypto flows that already read `logoUrl`
- surface clear loading and error states during upload

## Approved Direction

- Keep the current `Branding Logo` section in `public-catalog/src/app/profile/page.tsx`.
- Add a file input flow labeled for phone use instead of replacing the existing URL field.
- Reuse the existing `public-catalog/src/app/api/upload/route.ts` endpoint rather than adding a new storage backend in this slice.
- Auto-save the selected image after a successful upload so the phone flow feels direct and simple.
- Keep `Remove Branding Logo` and the current URL save button behavior.

## Scope

- Update the profile branding-logo UI to support both:
  - image upload from device photos
  - manual URL entry
- Add upload status, preview, and error messaging in the profile page.
- Save uploaded image results through the same branding-logo storage helper in `public-catalog/src/lib/brandingLogo.ts`.
- Add focused tests for successful upload, upload failure, URL save, and removal behavior.

## Non-Goals

- No new server-side persistent file storage provider in this slice.
- No account-synced branding logo database record.
- No new Studio-side upload entry point in this slice.
- No image editing, cropping, or compression UI beyond the browser and current upload route behavior.
- No change to the downstream contract that consumers use; they should still only read `logoUrl`.

## Current Problems

### Mobile Flow Requires A URL

The current profile screen only allows a pasted logo URL:

- the user cannot browse photos directly from a phone
- the flow assumes the logo is already hosted somewhere
- the screen feels incomplete for mobile-first use

### Branding Storage Is Already Good Enough

The current storage helper already centralizes the value used downstream:

- `public-catalog/src/lib/brandingLogo.ts` stores one branding logo URL in local storage
- mockup and fulfillment code already uses that `logoUrl`

That means the main gap is the input method, not the downstream pipeline.

### Existing Upload Route Can Be Reused

The app already has an image upload route at `public-catalog/src/app/api/upload/route.ts` that:

- accepts image files
- validates size and basic image type
- returns a `url` / `localUrl`

That is enough for a first mobile-friendly branding-logo flow.

## Product Intent

The user should be able to open `Profile` on a phone, tap one button, choose a logo from Photos, and have that logo become the saved branding asset for inside-tag and supported neck/collar placements.

The flow should feel:

- mobile-friendly
- obvious
- reversible
- consistent with the existing branding behavior

## Proposed UX

### Branding Section Layout

Keep the current `Branding Logo` card and add a second input mode above the URL field.

Recommended reading order:

1. see whether a branding logo is already saved
2. choose a photo from the device
3. or paste a direct image URL
4. remove the saved branding logo if needed

### Upload Controls

Add:

- a hidden `input type="file"`
- `accept="image/*"`
- a visible `Choose From Phone` button

Expected behavior:

- tapping the button opens the device image picker on mobile
- choosing a file uploads immediately
- successful upload saves the returned URL through the branding helper
- the saved logo display updates without requiring a second save step

### URL Controls

Keep:

- the existing URL text field
- the existing `Save Branding Logo` button

This preserves desktop flexibility and lets users paste an externally hosted logo.

### Saved State And Preview

When a logo exists, show:

- the saved image value
- a small visual preview when the saved value is displayable as an image

When no logo exists, keep a clear empty state message.

### Loading And Error States

During upload:

- disable duplicate upload actions
- show an uploading label or spinner state

On failure:

- show the API error message if available
- keep the previously saved logo untouched

## Data Flow

### Photo Upload Path

1. User taps `Choose From Phone`.
2. Browser opens the device photo picker.
3. User selects an image.
4. Client builds `FormData` with `image`.
5. Client posts to `/api/upload`.
6. API returns `success` plus `url`.
7. Client saves that value with `setStoredBrandingLogoUrl()`.
8. Profile screen updates `brandingLogoInput` and `brandingLogoDisplay`.

### URL Save Path

1. User pastes a URL into the existing field.
2. User taps `Save Branding Logo`.
3. Client saves the normalized value with `setStoredBrandingLogoUrl()`.
4. Profile screen updates the saved display.

### Remove Path

1. User taps `Remove Branding Logo`.
2. Client clears local storage with `clearStoredBrandingLogoUrl()`.
3. Profile screen clears display, preview, and field state.

## Technical Shape

### Profile Page

`public-catalog/src/app/profile/page.tsx` should own:

- file input ref or direct hidden input handling
- upload status state
- upload error state
- the existing text input state
- display and preview rendering

### Upload Contract

Use the existing upload route contract:

- request: `FormData` with `image`
- response: JSON with `success`, `url`, and optional `error`

No new API surface is required for this slice unless tests reveal missing edge-case handling.

### Branding Storage Contract

Continue using:

- `getStoredBrandingLogoUrl()`
- `setStoredBrandingLogoUrl()`
- `clearStoredBrandingLogoUrl()`

This keeps all downstream consumers unchanged.

## Testing Strategy

Add or update focused profile tests to verify:

- the branding section renders both the upload control and URL field
- successful file upload stores the returned logo URL
- upload failure shows an error and preserves prior saved state
- manual URL save still works
- remove still clears stored branding state

Avoid low-value tests that only restate layout classes or implementation details.

## Risks And Mitigations

- risk: mobile upload feels slow or ambiguous
- mitigation: show explicit upload status and update the saved state immediately after success

- risk: upload failure wipes an existing saved logo
- mitigation: only overwrite stored branding after a successful API response

- risk: data URL uploads create large stored values
- mitigation: reuse the current upload route for this slice and rely on its file-size checks; future storage changes can happen without changing the UI contract

## Acceptance Criteria

- the profile branding section supports both phone-photo upload and manual URL entry
- a successful uploaded image becomes the saved branding logo without requiring a pasted link
- the existing URL save path still works
- remove still clears the saved branding logo
- downstream code continues to read one stored `logoUrl`
- focused tests cover the new behavior
