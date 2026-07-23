# Studio Single Poster Destination Design

## Goal

Make `Studio` the single destination for `Send to Multi-Channel Poster` flows so users always land in the in-page Studio poster section instead of staying in a separate customize-to-poster flow.

## Approved Direction

- Keep `/customize` for merch editing and product configuration.
- Route `Send to Multi-Channel Poster` actions from both `Studio`-adjacent merch flows and `Customize` into `Studio`.
- Hydrate the Studio poster section from query parameters and scroll directly to the in-page Multi-Channel Poster.
- Preserve the existing Reddit connection state and subreddit payload behavior already wired into the Studio poster.
- Attempt live Reddit verification only if the local environment actually has a valid Reddit session and callable server context.

## Scope

- Change `Send to Multi-Channel Poster` handoff logic so `Studio` becomes the canonical poster destination.
- Preserve `Customize Your Gear` links for merch editing where they are still needed.
- Hydrate `Studio` from poster-prefill query params such as image, prompt, and text.
- Ensure the Studio poster still attaches the carried-over image and text correctly.
- Keep Reddit subreddit handling and connected-state display working in the Studio poster.
- Add or update focused automated tests for the routing and payload behavior.

## Non-Goals

- No redesign of the full merch customization flow.
- No rewrite of the entire poster UI into a shared cross-page state store.
- No change to Reddit OAuth architecture.
- No guarantee of a live Reddit post from this sandbox if session cookies or public runtime requirements are missing.

## Current State

There are multiple poster entry points today:

- `src/app/studio/page.tsx`
  - already contains the in-page `Multi-Channel Poster`
  - already supports imported share params and smooth scroll into the poster area
- `src/components/ProductCustomizer.tsx`
  - exposes a `Send to Multi-Channel Poster` button from the merch customizer
- `src/components/CatalogItem.tsx`
  - also exposes a `Send to Multi-Channel Poster` button from catalog/buyer preview surfaces

This creates a split experience where poster sending can originate outside Studio even though Studio already has the canonical poster UI.

## Proposed Change

### Canonical Poster Destination

- Treat `src/app/studio/page.tsx` as the only poster destination for send-to-poster actions.
- Any flow that currently sends to poster from `Customize` or adjacent product surfaces should navigate to `/studio` with prefilled query parameters instead.

### Query Parameter Contract

Use a simple query-param handoff into `Studio`, reusing the existing prefill behavior already present there:

- `shareImage`
- `shareText`
- `sharePrompt`

Rules:

- `shareImage`
  - carries the product or generated image URL to attach in the Studio poster
- `shareText`
  - carries any default poster message or descriptive text when available
- `sharePrompt`
  - carries the prompt or item name for reuse inside Studio

### Studio Behavior

- On Studio load, preserve the current behavior that imports shared values into poster state.
- After hydration, ensure the user is directed to the in-page `multi-channel-poster` section when arriving from a send-to-poster handoff.
- Do not remove the existing in-Studio `Send to Multi-Channel Poster` button that already scrolls locally; keep that as the zero-navigation case.

### Customize And Catalog Behavior

- In `src/components/ProductCustomizer.tsx`, replace the current poster handoff so it navigates to `/studio?...` using the shared query contract.
- In `src/components/CatalogItem.tsx`, do the same for its `Send to Multi-Channel Poster` action.
- Keep `Customize Your Gear` links pointing to `/customize` where their purpose is merch editing, not poster sending.

## Reddit Behavior

- Keep the existing Studio Reddit field and payload behavior:
  - subreddit input remains editable
  - default value remains `LivestreamFail`
  - `/api/post` continues receiving `metadata.redditSubreddit`
- Keep the existing Reddit connection-state display in the Studio poster platform list.
- For verification:
  - automated tests should confirm the payload remains correct
  - a live Reddit post attempt is best-effort only and depends on available Reddit auth/session in the current environment

## Data Flow

### Customize To Studio Poster

- User is on `/customize`.
- User clicks `Send to Multi-Channel Poster`.
- App navigates to `/studio` with `shareImage`, `shareText`, and/or `sharePrompt`.
- Studio imports the shared values into poster state.
- Studio scrolls to the `multi-channel-poster` section.

### Catalog To Studio Poster

- User is on a catalog preview surface.
- User clicks `Send to Multi-Channel Poster`.
- App navigates to `/studio` with the same shared query contract.
- Studio hydrates the poster and scrolls to it.

### Studio Native Send

- User is already in Studio.
- User clicks `Send to Multi-Channel Poster`.
- No route change is needed.
- Studio continues to prefill poster state and smooth-scroll locally.

## Error Handling

- If a shared image URL is missing, Studio should still accept text/prompt-only poster prefill.
- If shared params are present but partial, Studio should import whichever fields are valid.
- If Reddit is connected but posting fails, preserve the current per-platform error reporting from `/api/post`.
- If live Reddit verification cannot run in this environment, report that limitation explicitly instead of silently claiming success.

## Files Expected To Change

- `src/app/studio/page.tsx`
- `src/app/studio/page.test.tsx`
- `src/components/ProductCustomizer.tsx`
- `src/components/ProductCustomizer.test.tsx`
- `src/components/CatalogItem.tsx`
- any focused e2e or integration tests covering send-to-poster behavior

## Testing Strategy

- Add/update unit or component tests to verify:
  - `ProductCustomizer` routes `Send to Multi-Channel Poster` to `/studio` with the expected query params
  - `CatalogItem` routes `Send to Multi-Channel Poster` to `/studio` with the expected query params
  - `Studio` hydrates query params into the poster state
  - `Studio` still sends `metadata.redditSubreddit`
- Run focused tests for edited files.
- Attempt a live Reddit-connected submission only if the environment exposes a real Reddit session; otherwise report the block clearly.

## Acceptance Criteria

- `Send to Multi-Channel Poster` from `Customize` routes to `Studio`, not to a separate poster flow.
- `Send to Multi-Channel Poster` from catalog/buyer preview surfaces routes to `Studio`.
- `Studio` opens with the carried-over image/text/prompt attached to the in-page Multi-Channel Poster.
- Existing in-Studio send-to-poster behavior still works.
- Reddit connected-state display still appears correctly in Studio.
- Reddit poster submissions still include `metadata.redditSubreddit`.
