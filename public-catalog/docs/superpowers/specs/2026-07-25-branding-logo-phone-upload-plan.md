# Branding Logo Phone Upload Implementation Plan

## Objective

Implement the approved `Both` branding-logo flow by adding a phone-photo upload path to `Profile` while preserving the existing manual URL entry path and keeping the downstream `logoUrl` contract unchanged.

## Workstreams

### 1. Profile Branding Upload UX

Files:

- `public-catalog/src/app/profile/page.tsx`

Tasks:

- add upload state for:
  - idle
  - uploading
  - error
- add a hidden file input with `accept="image/*"`
- add a visible `Choose From Phone` button wired to that file input
- keep the existing URL input and `Save Branding Logo` button
- keep `Remove Branding Logo`
- add a small preview surface when the saved value is an image URL or data URL
- render upload errors without displacing the current saved logo

Acceptance criteria:

- the profile screen supports both upload and URL entry
- the upload action is clearly labeled and usable on mobile
- the section shows upload status, saved state, and preview cleanly

### 2. Client Upload Flow

Files:

- `public-catalog/src/app/profile/page.tsx`
- `public-catalog/src/app/api/upload/route.ts` only if a small compatibility tweak is required

Tasks:

- build `FormData` with the chosen file under `image`
- post to `/api/upload`
- parse the returned JSON contract
- on success:
  - save the returned `url` using `setStoredBrandingLogoUrl()`
  - sync `brandingLogoInput`
  - sync `brandingLogoDisplay`
- on failure:
  - show a readable error
  - keep the previous saved value unchanged
- clear any stale upload error on a new successful action

Acceptance criteria:

- successful upload saves branding in the same place as the URL flow
- failed upload does not corrupt or clear existing branding state
- no downstream consumer changes are needed

### 3. Branding State Consistency

Files:

- `public-catalog/src/app/profile/page.tsx`
- `public-catalog/src/lib/brandingLogo.ts` only if a tiny helper extraction improves clarity

Tasks:

- keep one source of truth for the saved logo URL
- ensure upload success updates both the saved display and the editable URL field
- ensure removal clears:
  - stored branding
  - display state
  - editable field state
  - preview state
  - upload error state
- avoid changing the helper contract that mockup/cart/fulfillment logic already uses

Acceptance criteria:

- upload, URL save, and remove all converge on the same stored value
- existing consumers of `logoUrl` keep working without modification

### 4. Focused Test Coverage

Files:

- `public-catalog/src/app/profile/page.test.tsx`

Tasks:

- add or update tests for:
  - branding section renders both upload and URL entry controls
  - file upload success stores the returned logo value
  - upload failure shows an error and preserves the prior saved logo
  - URL save still stores the branding logo
  - remove still clears stored branding
- mock `fetch` for upload behavior without overfitting to every incidental request in the page

Acceptance criteria:

- tests cover the new behavior paths directly
- test assertions stay focused on saved state and user-visible outcomes

## Suggested Execution Order

1. Add or update profile tests for upload success, upload failure, URL save, and remove behavior.
2. Implement the hidden file input, upload button, and upload state in `Profile`.
3. Wire upload success into the existing branding storage helper.
4. Add preview and error rendering.
5. Run targeted tests, diagnostics, and a production build.

## Verification Plan

### Automated

- run targeted tests for `src/app/profile/page.test.tsx`
- run project diagnostics for edited files
- run `npm run build` from `public-catalog`

### Manual

- open `Profile` on a mobile viewport
- confirm tapping `Choose From Phone` opens the image picker
- select an image and confirm it becomes the saved branding logo
- paste a URL and confirm the legacy path still works
- remove the logo and confirm the saved state clears

## Risks And Mitigations

- risk: the page has several existing fetch calls that complicate test setup
- mitigation: keep tests focused on the branding section and mock upload responses explicitly

- risk: uploaded data URLs may be visually large or noisy in the saved display
- mitigation: add a compact image preview and keep the raw saved value display secondary

- risk: the file input can feel inaccessible if hidden poorly
- mitigation: use a real button plus labeled hidden input and preserve keyboard access

## Done Definition

- `Profile` supports both phone-photo upload and manual URL branding entry
- successful upload saves the returned image value as the branding logo
- upload errors are visible and non-destructive
- manual URL save still works
- remove still clears the saved branding logo
- targeted tests and production build pass
