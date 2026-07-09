# MultiPoster All Social Connections Implementation Plan

## Objective

Expand the dedicated `MultiPoster` page so it renders every social connection already exposed by `/api/auth/session`, and align selection/publish behavior with the real support already present in `/api/post`.

## Workstreams

### 1. Expand Shared Platform Model

Files:

- `public-catalog/src/lib/multiposter.ts`

Tasks:

- expand the platform key union to include:
  - `twitter`
  - `telegram`
  - `instagram`
  - `tiktok`
  - `youtube`
  - `reddit`
  - `discord`
  - `rss`
- add display names for all platforms
- add a shared `publishable` rule per platform
- keep the existing connection-state mapping driven by `/api/auth/session`
- include clear UI labels for:
  - connected and publishable
  - connected but limited
  - available/passive
  - needs connection

Acceptance criteria:

- the shared model supports all backend-exposed platforms
- the model can distinguish connection state from publishability

### 2. Update MultiPoster UI

Files:

- `public-catalog/src/components/MultiPosterPanel.tsx`

Tasks:

- render the full platform set instead of only `reddit`, `discord`, and `rss`
- visually distinguish platforms that are connected but not meant to be selectable
- enable selection only for platforms considered publishable by the shared rules
- keep the current publish payload restricted to selected publishable platforms only
- preserve existing result rendering for actually submitted platforms

Acceptance criteria:

- the page visibly shows all supported social connections
- disabled platforms are explained instead of silently omitted
- selected platforms only include those intended to be posted

### 3. Tighten Tests First

Files:

- `public-catalog/src/app/poster/page.test.tsx`

Tasks:

- first add failing tests for:
  - all session-backed platforms render on `/poster`
  - non-selectable platforms appear disabled when appropriate
  - publish payload contains only allowed selected platforms
- update the mocked session response in poster tests to include the broader platform set
- keep existing Reddit/Discord/RSS publishing assertions working

Acceptance criteria:

- tests fail before code changes
- tests cover the expanded platform list and selection gating

### 4. Verify Against Existing Backend Support

Files:

- `public-catalog/src/app/api/post/route.ts` read-only unless a regression appears

Tasks:

- keep the UI aligned with real `/api/post` branches already present for:
  - `twitter`
  - `instagram`
  - `telegram`
  - `tiktok`
  - `reddit`
  - `youtube`
  - `discord`
  - `rss`
- avoid unnecessary backend changes unless a mismatch discovered in tests requires one

Acceptance criteria:

- the page no longer under-reports backend capabilities
- no accidental regression to the existing posting route

## Suggested Execution Order

1. Add failing poster-page tests for all visible platforms and selection gating.
2. Expand the shared multiposter model.
3. Update the `MultiPoster` UI to render and gate the full platform list.
4. Re-run poster tests.
5. Run the production build.

## Verification Plan

### Automated

- run `vitest` for `src/app/poster/page.test.tsx`
- run `npm -C public-catalog run build`

### Manual

- open `/poster`
- confirm all connection tiles appear
- confirm only intended platforms are selectable
- confirm publishing still works for the supported selected set

## Risks And Mitigations

- risk: UI claims support broader than actual backend behavior
- mitigation: base publishability on explicit `/api/post` handling, not guesswork

- risk: too many visible platforms make the page harder to scan
- mitigation: keep the same compact tile layout and use concise status labels

- risk: changing platform keys breaks existing poster tests
- mitigation: update tests first and keep the selected payload assertions focused

## Done Definition

- `/poster` shows all backend-exposed social connections
- connection state and publish capability are both visible
- selected publish payloads remain intentional
- poster tests and build pass
