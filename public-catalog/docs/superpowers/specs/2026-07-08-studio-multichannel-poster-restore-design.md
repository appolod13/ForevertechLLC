# Studio Multichannel Poster Restore Design

## Goal

Reapply the multichannel poster to the Studio page without undoing the recent generator cleanup, and make each platform connection state reflect real backend readiness instead of decorative UI state.

## Approved Direction

- Restore the full multichannel poster as a secondary Studio section below the main generation and preview flow.
- Keep the primary creation flow centered on `prompt -> generate -> preview -> customize`.
- Make connection state live and backend-driven.
- Restore working poster behavior for the multichannel destinations already designed in the project:
  - Reddit
  - Discord
  - RSS
- Preserve the recent image-generator improvements and avoid reintroducing the older cluttered dashboard feeling.

## Scope

- Reapply the multichannel poster UI inside `src/app/studio/page.tsx`.
- Reconnect the Studio poster section to the existing session/auth state route so platform status is loaded from the backend.
- Reconnect poster submission to the existing `/api/post` flow and surface per-platform results in the Studio UI.
- Ensure the latest generated image and generated caption feed into the poster panel automatically.
- Reapply platform connection and readiness messaging for Reddit, Discord, and RSS.
- Add or update focused tests for the restored Studio poster behavior and connection checks.

## Non-Goals

- No redesign of the main generator layout beyond restoring the poster as a clearly secondary section.
- No new social platform expansion beyond the currently designed set for this slice.
- No replacement of the existing `/api/post` fan-out architecture.
- No new scheduling system beyond whatever poster behavior is already supported by the current app.
- No rollback of recent generator cleanup, reset handling, or wormhole/detail-guard work.

## Current State

The recent Studio cleanup intentionally removed the multichannel poster from the main page in order to reduce clutter and refocus the page on generation and merch preview.

That cleanup achieved a clearer main creation flow, but it also removed a workflow the user still depends on:

- generate image
- generate caption/content
- publish the result across channels from the same Studio surface

There is already project context for a richer multichannel poster design:

- a prior multi-poster spec covering Reddit, Discord, and RSS
- an existing `/api/post` route
- an existing auth/session reporting pattern
- an RSS route already present in the app

The missing piece is reapplying the Studio poster UI and making the connection states truly reflect backend readiness.

## Product Design

### Studio Layout

The Studio page should keep the current top-level structure:

1. prompt and generation controls
2. generation progress and logs
3. preview and merch-ready result
4. `Customize Your Gear`
5. multichannel poster section

This keeps the page readable while restoring the posting workflow.

### Poster Section

The restored poster section should sit below the preview/customization area in its own bordered panel with clear separation from the generator.

It should include:

- a section title such as `Multichannel Poster`
- a short description that explains it uses the latest generated image and caption
- destination tiles or chips showing each platform and status
- content fields for post text and selected media
- a publish action
- refresh/check connection action
- per-platform result output after submission

### Autofill Behavior

The poster section should automatically consume the latest Studio outputs:

- latest generated image becomes the poster media target
- generated text content becomes the initial post copy
- prompt remains available as fallback text when no richer generated caption exists

Users can still edit the post copy before publishing.

## Connection Model

### Source Of Truth

Connection state must come from backend responses, not hardcoded assumptions in the page.

The Studio poster panel should load connection status from the existing session/auth route pattern and normalize each platform into a single client model:

- `connected`
- `needs_connection`
- `available`
- `warning`

### Platform Rules

#### Reddit

- `connected` when the authenticated Reddit session/token is present
- `needs_connection` when the user has no valid Reddit session
- the poster UI should disable Reddit posting when not connected

#### Discord

- `connected` when the current user has a saved webhook destination and it passes the route's readiness checks
- `needs_connection` when no webhook is stored
- `warning` when a webhook record exists but validation/readiness fails
- the poster UI should explain whether the user needs to add, replace, or fix the webhook

#### RSS

- `available` when the RSS publishing flow is enabled in the current environment
- `warning` when the app cannot confirm feed readiness
- the UI should show an `Open RSS Feed` action when a feed URL is known

### Refresh Behavior

The poster section should include a manual `Refresh Connections` action so the user can re-check statuses without reloading the entire Studio page.

## Submission Behavior

### Publish Flow

The Studio page should continue to submit posting work through one request to `/api/post`.

Submission behavior:

- gather selected ready destinations
- include current post text
- include the current selected/generated image URL when available
- submit once through `/api/post`
- receive per-platform results
- render those results in the poster panel

### Result Model

The UI should present per-platform outcomes rather than a single opaque banner.

Each selected platform should show one of:

- success
- skipped
- failed

The combined message can summarize the run, but detailed platform rows must remain visible so users can see partial success.

## Error Handling

- If the session status call fails, the poster panel should show a recoverable warning and allow retry.
- If a platform is not ready, the publish button should not silently include it.
- If `/api/post` returns partial success, successful platforms should remain marked successful and failures should be listed individually.
- If generated image or caption data is missing, the poster panel should still render and explain what content is required before publishing.
- A stale "connected" label must never be shown when the latest backend check says otherwise.

## Architecture

### Studio Responsibilities

`src/app/studio/page.tsx` should own:

- poster panel visibility in the Studio layout
- loading and refreshing connection state
- mapping generated assets into poster defaults
- allowing users to choose destinations and edit post text
- displaying per-platform publish results

### API Responsibilities

`src/app/api/auth/session/route.ts` should remain the source for connection state.

`src/app/api/post/route.ts` should remain the backend fan-out point and must return enough structured data for the Studio panel to explain:

- which destinations were attempted
- which succeeded
- which failed
- why a failure happened when a user-facing reason is available

## Testing

Add or restore focused tests for:

- multichannel poster section rendering on the Studio page
- connection status loading from the backend
- refresh connection action
- autofill from latest generated image and generated text
- publish request payload construction
- per-platform result rendering
- disconnected and warning states

Verification should include:

- Studio tests
- route tests for any changed connection/post payload behavior
- production build for `public-catalog`

## Files Expected To Change

- `src/app/studio/page.tsx`
- `src/app/studio/page.test.tsx`
- `src/app/api/auth/session/route.ts`
- `src/app/api/auth/session/route.test.ts`
- `src/app/api/post/route.ts`
- `src/app/api/post/route.discord-rss.test.ts`
- any small supporting UI/helpers used by the Studio poster section

## Success Criteria

- The Studio page again includes a full multichannel poster section.
- The restored poster does not crowd out the generator and preview flow.
- Platform status reflects real backend connection state.
- Generated image/text flow naturally into the poster panel.
- Posting shows per-platform results clearly.
- The app continues to build and the recent generator work remains intact.
