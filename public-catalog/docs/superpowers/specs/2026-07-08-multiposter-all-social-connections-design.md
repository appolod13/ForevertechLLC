# MultiPoster All Social Connections Design

## Goal

Expand the dedicated `MultiPoster` page so it shows every social connection the backend already exposes, while keeping publish controls honest about which destinations are actually supported by the current posting backend.

## Approved Direction

- Show all existing session-backed platforms on the dedicated `MultiPoster` page.
- Keep the dedicated `/poster` page as the single place for the full social connection dashboard.
- Distinguish between:
  - connected and publishable
  - connected but not yet publishable
  - available/passive
  - needs connection
- Do not present unsupported platforms as if they can already publish through `/api/post`.

## Scope

- Expand the shared multiposter platform model used by:
  - `src/lib/multiposter.ts`
  - `src/components/MultiPosterPanel.tsx`
- Align the dedicated `MultiPoster` page with the session route in:
  - `src/app/api/auth/session/route.ts`
- Display all currently exposed backend platforms:
  - `twitter`
  - `telegram`
  - `instagram`
  - `tiktok`
  - `youtube`
  - `reddit`
  - `discord`
  - `rss`
- Keep posting enabled only for platforms the current `/api/post` flow truly supports.
- Add or update focused tests for the expanded connection list and publish gating behavior.

## Non-Goals

- No rewrite of `/api/post` to add full publish support for every social network in this slice.
- No rollback of the dedicated `/poster` page work.
- No change to the AOP Printify route work.
- No fake “success” path for platforms that are only connected but not postable yet.

## Current Problem

The new `MultiPoster` page currently under-reports the app's available social connections.

Today:

- the backend session route already reports:
  - `twitter`
  - `telegram`
  - `instagram`
  - `tiktok`
  - `youtube`
  - `reddit`
  - `discord`
  - `rss`
- the shared multiposter UI model only includes:
  - `reddit`
  - `discord`
  - `rss`

This makes the new dedicated poster page look incomplete even though the backend already knows about more connections.

## Product Design

### MultiPoster Connection Grid

The dedicated `/poster` page should render all existing session-backed social connections in a single platform grid or list.

It should include:

- platform name
- connection state
- publish readiness state
- whether selection is available
- useful label text such as:
  - `Connected`
  - `Needs connection`
  - `Connected, posting not enabled yet`
  - `RSS available`

### Platform Set

The page should show these platforms:

- Twitter
- Telegram
- Instagram
- TikTok
- YouTube
- Reddit
- Discord
- RSS

### Publishability Rules

The UI should separate “connected” from “can publish right now”.

Current recommended behavior:

- `reddit`: publishable when connected
- `discord`: publishable when connected
- `rss`: publishable/available in the current app flow
- `twitter`: visible, but disabled for publish until `/api/post` confirms support
- `telegram`: visible, but disabled for publish until `/api/post` confirms support
- `instagram`: visible, but disabled for publish until `/api/post` confirms support
- `tiktok`: visible, but disabled for publish until `/api/post` confirms support
- `youtube`: visible, but disabled for publish until `/api/post` confirms support

This keeps the dashboard complete without overstating capability.

## Data Model

### Shared Platform Model

The shared multiposter model should be expanded to include:

- a broader platform key union
- display label
- authenticated state
- UI status
- publishable boolean

Recommended client model:

- `connected`
- `needs_connection`
- `available`
- `warning`

and separately:

- `publishable: true | false`

### Backend Source Of Truth

`/api/auth/session` remains the source of truth for connection state.

The client should map the backend response into the broader UI model without inventing new backend statuses.

## UI Behavior

### Selection Rules

- Publish checkboxes remain enabled only for truly publishable platforms.
- Connected-but-not-publishable platforms should appear disabled with clear explanatory text.
- RSS can remain selectable if the current backend supports it through `/api/post`.

### Result Display

- Results remain shown only for platforms actually submitted to `/api/post`.
- Unsupported platforms should never appear in publish results unless the backend was asked to post to them.

### Refresh Behavior

- `Refresh Connections` should continue to reload all visible platforms from `/api/auth/session`.

## Error Handling

- If session loading fails, all platforms should degrade to warning/unavailable messaging.
- Unsupported platforms should not create publish errors because they should never be included in the outgoing payload.
- If backend support later expands, the UI should be able to enable publish simply by updating the shared publishability rules.

## Architecture

### Shared Helpers

`src/lib/multiposter.ts` should become the shared source for:

- platform key definitions
- display names
- session-to-UI mapping
- publishability rules

### MultiPoster Panel

`src/components/MultiPosterPanel.tsx` should:

- render the full platform set
- visually distinguish non-publishable connected platforms
- only allow selection for publishable platforms

## Testing

Add or update focused tests for:

- all session-backed platforms rendering on `/poster`
- connected but non-publishable platforms appearing disabled
- publish payloads including only publishable selected platforms
- existing Reddit/Discord/RSS publish behavior remaining intact

## Files Expected To Change

- `src/lib/multiposter.ts`
- `src/components/MultiPosterPanel.tsx`
- `src/app/poster/page.test.tsx`
- optional additional tests if any platform label behavior is extracted

## Success Criteria

- The dedicated `MultiPoster` page shows all backend-exposed social connections.
- The UI clearly distinguishes connection state from publish capability.
- Only truly supported platforms can be selected for posting.
- Existing Reddit, Discord, and RSS posting flow continues to work.
