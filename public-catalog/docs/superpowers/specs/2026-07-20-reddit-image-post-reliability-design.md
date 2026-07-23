# Reddit Image Post Reliability Design

## Goal

Make it possible for `Studio` Multi-Channel Poster flows to reliably send an attached image to Reddit by fixing the end-to-end chain from shared-image hydration through Reddit session detection and Reddit image submission.

## Approved Direction

- Preserve the current `Studio` Multi-Channel Poster experience and keep Reddit image posting enabled.
- Fix the image validation path for shared images passed into `Studio`, especially same-origin `pixelqrypt.com` image URLs that currently fail during client-side validation.
- Tighten Reddit connection/session handling so `Studio` more accurately reflects when Reddit posting can succeed.
- Improve Reddit posting errors so failures distinguish between image fetch issues, auth/session issues, subreddit/permission issues, and Reddit API rejection.

## Scope

- Improve image validation for Multi-Poster attachments in `src/app/studio/page.tsx`.
- Improve production compatibility for same-origin image URLs such as `/api/fusion-image?...`.
- Improve Reddit session-state reporting in `src/app/api/auth/session/route.ts` and corresponding `Studio` handling.
- Improve Reddit image posting reliability and failure reporting in `src/app/api/post/route.ts`.
- Add or update focused tests for the image-validation path, Reddit connection state, and Reddit image-post flow.

## Non-Goals

- No redesign of Printify, merch preview, or mockup-related components.
- No removal of the current Reddit image-post feature.
- No full Reddit OAuth architecture rewrite.
- No guarantee of a live Reddit post from this sandbox if the active browser session still lacks valid Reddit cookies or production credentials.

## Current State

### Studio Share Import

`Studio` correctly imports:

- `sharePrompt`
- `shareText`
- `shareImage`

The imported attachment appears in the Multi-Channel Poster and scrolls into view correctly.

### Client-Side Image Validation

Before posting, `Studio` validates the attached image in `src/app/studio/page.tsx`.

Current behavior:

- data URLs load directly
- relative URLs may load directly
- same-origin absolute URLs attempt direct load first
- non-data URLs may still fall back to `/api/proxy-image`

Observed production failure:

- `shareImage` points to `https://www.pixelqrypt.com/api/fusion-image?...`
- `/api/fusion-image` returns `502`
- `/api/proxy-image` then returns `500`
- `Studio` surfaces `Posting failed: Image validation failed`

This blocks posting before the Reddit API is meaningfully exercised.

### Reddit Session State

`src/app/api/auth/session/route.ts` marks Reddit as authenticated when the `reddit_user_token` cookie exists. This is a shallow signal and may not reflect a fully usable Reddit posting session.

### Reddit Posting Path

`src/app/api/post/route.ts` already includes:

- Reddit refresh token handling
- link post submission
- text post submission
- image upload flow

However, the current errors can still collapse into low-context failures such as:

- `reddit_http_403`
- generic image validation failure

## Proposed Change

### 1. Harden Studio Image Validation

Update `src/app/studio/page.tsx` so Multi-Poster validation is more reliable for shared same-origin URLs.

Design rules:

- Treat same-origin `https://www.pixelqrypt.com/...` image URLs as first-class candidates, not as cross-origin edge cases.
- Prefer direct validation for same-origin absolute URLs and same-origin relative URLs.
- Only use `/api/proxy-image` as a fallback when direct loading is actually required.
- When validation fails, preserve a more specific error message if the URL resolves to:
  - fusion-image upstream failure
  - proxy failure
  - undersized image

### 2. Improve Fusion/Proxy Compatibility

Support the live share-image pattern used by `Studio` imports:

- `https://www.pixelqrypt.com/api/fusion-image?path=...`

The design should make the poster flow resilient when the image is already browser-loadable but proxy-based validation is flaky.

If direct browser loading succeeds, posting should not be blocked by an unnecessary proxy dependency.

### 3. Tighten Reddit Session Reporting

Improve `src/app/api/auth/session/route.ts` so Reddit connection state is more trustworthy.

Design goals:

- Continue showing Reddit as connected when a usable Reddit posting session exists.
- Avoid falsely optimistic UI states when the token/session is missing critical Reddit posting prerequisites.
- Keep the response format compatible with the current Studio UI.

This does not require a full OAuth redesign; it should be a focused reliability improvement.

### 4. Improve Reddit Image Post Behavior

Keep image posting enabled in `src/app/api/post/route.ts`, but make the behavior clearer and more resilient.

Design goals:

- Distinguish image-source failures from Reddit API failures.
- Distinguish Reddit auth/permission failures from subreddit/content failures.
- Preserve subreddit normalization and existing image-upload flow.
- Keep fallback behavior explicit rather than silently masking failures.

Targeted error categories:

- image source unavailable
- image validation failed
- reddit auth expired
- reddit permission denied / 403
- subreddit rejected
- reddit image upload failed

### 5. Preserve Existing Poster UX

Do not change:

- the Multi-Poster section layout
- the subreddit field behavior
- Printify/mockup/merch preview components
- non-Reddit platform posting flows

## Data Flow After Fix

### Shared Image Import

- User lands on `/studio?...shareImage=...`
- `Studio` imports the image, text, and prompt
- Multi-Poster shows the attachment

### Validation

- `Studio` validates the attached image
- same-origin image URLs validate directly when possible
- proxy fallback happens only when necessary
- validation errors become more specific

### Reddit Submit

- Reddit platform is selected only when Reddit is actually connected
- `/api/post` fetches or uploads the validated image
- Reddit image upload and submit steps surface clearer failures

## Error Handling

- If the shared image URL is broken upstream, return a specific image-source error rather than generic validation failure.
- If Reddit auth is stale, return a Reddit-specific auth message rather than a generic HTTP code.
- If Reddit returns `403`, preserve that detail but map it to a clearer user-facing explanation.
- If Reddit image upload fails after a valid image is available, report that as a Reddit upload failure, not an image validation failure.

## Files Expected To Change

- `src/app/studio/page.tsx`
- `src/app/studio/page.test.tsx`
- `src/app/api/auth/session/route.ts`
- `src/app/api/auth/session/route.test.ts`
- `src/app/api/post/route.ts`
- any focused tests that already cover Reddit post behavior

## Testing Strategy

- Add or update tests for:
  - same-origin shared image validation in `Studio`
  - preserving imported image/text/prompt behavior from share URLs
  - Reddit session-state reporting
  - Reddit image-post error handling for `403` and image-source failures
- Run focused tests for edited files.
- If browser auth is available, perform a best-effort live Reddit image-post verification after implementation.

## Acceptance Criteria

- A shared image imported into `Studio` can pass validation when it is a valid same-origin image URL.
- `Studio` no longer fails immediately with generic `Image validation failed` for the current share-image pattern when the image is browser-loadable.
- Reddit connection state in `Studio` better reflects a usable posting session.
- Reddit image-post failures return clearer error messages than raw `reddit_http_403` where possible.
- Existing subreddit input and Multi-Poster hydration behavior remain intact.
