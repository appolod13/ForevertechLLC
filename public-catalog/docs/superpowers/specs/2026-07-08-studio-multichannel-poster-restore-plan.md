# Studio Multichannel Poster Restore Implementation Plan

## Objective

Implement the approved restore by bringing the multichannel poster back to the Studio page as a secondary section, reconnecting it to live backend connection state, and making publish results clear per platform without undoing the recent generator cleanup.

## Workstreams

### 1. Restore Poster Section In Studio

Files:

- `public-catalog/src/app/studio/page.tsx`
- `public-catalog/src/app/studio/page.test.tsx`
- optional small helper/component files under `public-catalog/src/components/` or `public-catalog/src/lib/`

Tasks:

- reintroduce a `Multichannel Poster` section below the preview and customization flow
- keep the main generator area unchanged in priority and layout
- add poster state for:
  - selected destinations
  - editable post content
  - selected media URL
  - connection loading state
  - connection refresh state
  - publish state
  - per-platform publish results
- initialize poster defaults from current Studio state:
  - `generatedTextContent`
  - `prompt`
  - `previewImageUrl`
- preserve existing share-import behavior so incoming `shareImage`, `shareText`, and `sharePrompt` feed the restored poster flow naturally

Acceptance criteria:

- Studio shows a clearly separated poster panel
- poster defaults are populated from the latest generation
- the restored panel does not remove or crowd out the current generator and preview flow

### 2. Reconnect Live Platform Status

Files:

- `public-catalog/src/app/studio/page.tsx`
- `public-catalog/src/app/api/auth/session/route.ts`
- `public-catalog/src/app/api/auth/session/route.test.ts`

Tasks:

- load live platform status from `/api/auth/session`
- derive a single client-side platform model for the poster UI
- surface at least:
  - Reddit
  - Discord
  - RSS
- keep any existing still-supported platform entries from the auth session route intact rather than removing them
- add a `Refresh Connections` control in Studio
- show real readiness states instead of decorative labels:
  - connected
  - needs connection
  - available
  - warning when a platform check fails or returns inconsistent data
- ensure the session route returns enough information for the UI to display meaningful labels and actionable status

Acceptance criteria:

- Studio makes a real backend call for connection state
- platform cards/chips reflect backend readiness
- refresh updates status without a page reload

### 3. Tighten Publish Payload And Result Handling

Files:

- `public-catalog/src/app/studio/page.tsx`
- `public-catalog/src/app/api/post/route.ts`
- `public-catalog/src/app/api/post/route.discord-rss.test.ts`

Tasks:

- restore a single publish action in Studio that submits through `/api/post`
- include:
  - current post text
  - selected ready destinations
  - latest image URL when available
  - user id when available for Discord/RSS lookups
- keep disconnected platforms out of the actual publish request
- render per-platform outcomes clearly in Studio:
  - success
  - failed
  - skipped or unavailable
- ensure `/api/post` continues returning structured per-platform `results`
- improve partial-failure behavior so the Studio panel can explain what succeeded and what failed without hiding success

Acceptance criteria:

- publishing still uses the existing backend fan-out route
- partial success remains visible platform by platform
- the UI never claims success for disconnected platforms that were not actually submitted

### 4. Reapply Connection Management Hooks

Files:

- `public-catalog/src/app/studio/page.tsx`
- `public-catalog/src/app/api/social/discord/route.ts`
- any reused logic from `public-catalog/src/app/profile/page.tsx`

Tasks:

- expose practical next actions from Studio for platforms that are not ready
- for Discord, show the saved/redacted connection state and route users toward webhook management
- for RSS, show feed availability and a feed link when possible
- for Reddit, show whether auth is present and disable posting when missing
- keep Studio-side connection management lightweight and avoid rebuilding the full profile settings interface inside Studio

Acceptance criteria:

- the poster panel helps the user understand how to fix disconnected platforms
- Discord and RSS surface useful, non-placeholder status details

### 5. Automated Coverage First

Files:

- `public-catalog/src/app/studio/page.test.tsx`
- `public-catalog/src/app/api/auth/session/route.test.ts`
- `public-catalog/src/app/api/post/route.discord-rss.test.ts`

Tasks:

- first, replace the existing Studio cleanup assertions that require the poster to be absent
- add failing tests for:
  - poster section rendering
  - session status fetch on load
  - refresh connection action
  - poster autofill from generated image/text
  - publish request payload
  - per-platform result rendering
- add route tests for any new session-shape or publish-result behavior
- keep tests focused on user-visible behavior rather than internal implementation details

Acceptance criteria:

- each restored behavior is covered by at least one focused test
- tests fail before implementation and pass after the minimal code change

## Suggested Execution Order

1. Add failing Studio tests for restored poster presence, session fetch, and poster autofill.
2. Add failing route tests for any session/post response changes needed by the UI.
3. Restore minimal Studio poster UI and connection fetch logic.
4. Restore publish flow and per-platform result rendering.
5. Refine connection labels/actions for Reddit, Discord, and RSS.
6. Run targeted tests and production build.

## Verification Plan

### Automated

- run targeted Studio tests in `public-catalog`
- run targeted auth-session and post-route tests in `public-catalog`
- run `npm -C public-catalog run build`

### Manual

- open Studio and confirm the poster panel appears below the main preview flow
- confirm connection states load and refresh
- confirm generated image/text appear in the poster panel
- confirm publish attempts show per-platform results clearly
- confirm the generator flow and merch preview still behave as before

## Risks And Mitigations

- risk: restoring the panel recreates the older cluttered dashboard feel
- mitigation: keep the section visually separate and below the main generation flow

- risk: connection states become stale or inconsistent
- mitigation: treat `/api/auth/session` as the source of truth and add manual refresh

- risk: `/api/post` partial failures are hard to explain in the UI
- mitigation: normalize results per platform and render them explicitly

- risk: Studio tests become brittle due to too many mocked integrations
- mitigation: focus tests on poster presence, status fetch, request payload, and result rendering only

## Done Definition

- Studio includes the multichannel poster again
- connection states are loaded from the backend and can be refreshed
- poster content autofills from the latest Studio generation
- publish results are visible per platform
- recent generator cleanup remains intact
- targeted tests and app build pass
