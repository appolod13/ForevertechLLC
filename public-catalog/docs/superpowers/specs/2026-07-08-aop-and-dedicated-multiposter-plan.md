# AOP Sleeve Printify And Dedicated MultiPoster Implementation Plan

## Objective

Complete the approved split by keeping the AOP Printify sleeve and neck-tag support in place while moving the multiposter into its own top-level page and removing the embedded poster panel from the Studio page.

## Workstreams

### 1. Add Dedicated MultiPoster Page

Files:

- `public-catalog/src/app/poster/page.tsx`
- `public-catalog/src/app/poster/page.test.tsx`
- optional small shared helpers if poster state extraction is needed

Tasks:

- create a dedicated `/poster` page
- move the poster-specific UI into that page:
  - platform connection state
  - editable poster copy
  - selected media
  - platform toggles
  - publish action
  - per-platform results
- support incoming share params:
  - `shareImage`
  - `shareText`
  - `sharePrompt`
- keep the backend flow unchanged by continuing to use:
  - `/api/auth/session`
  - `/api/post`

Acceptance criteria:

- `/poster` renders independently of Studio
- incoming share params prefill the page
- live connection state and posting work from the new page

### 2. Restore Studio To Creation Focus

Files:

- `public-catalog/src/app/studio/page.tsx`
- `public-catalog/src/app/studio/page.test.tsx`

Tasks:

- remove the embedded full multiposter panel from Studio
- keep Studio focused on:
  - prompt
  - generation
  - logs/status
  - preview
  - buyer preview
  - customize
- optionally add a lightweight link/button to open `/poster` with the current image/text prefilled
- stop Studio from bootstrapping poster connection state on initial load

Acceptance criteria:

- Studio no longer renders the full poster workflow
- Studio stays creation-focused
- a simple handoff into `/poster` remains available

### 3. Update Navigation And Entry Points

Files:

- `public-catalog/src/components/Header.tsx`
- `public-catalog/src/components/ProductCustomizer.tsx`
- `public-catalog/src/components/CatalogItem.tsx`
- `public-catalog/src/app/gallery/page.tsx`

Tasks:

- add `MultiPoster` to the main header navigation
- add the same destination to the mobile navigation
- update existing send-to-poster actions so they route to `/poster` instead of `/studio`
- preserve existing share payload behavior so poster content arrives prefilled

Acceptance criteria:

- users can reach `/poster` from the top nav
- Customize, Catalog, and Gallery send poster data to `/poster`

### 4. Keep AOP Route Stable

Files:

- `public-catalog/src/app/api/printify/mockups/route.ts`
- `public-catalog/src/app/api/printify/mockups/route.test.ts`

Tasks:

- verify the recently added AOP sleeve and neck-tag behavior remains intact
- avoid unrelated route changes while moving the poster UI
- only touch the route again if a regression appears during verification

Acceptance criteria:

- AOP support for `front`, `back`, `left_sleeve`, `right_sleeve`, and neck-tag branding remains covered and passing

### 5. Test-First Coverage

Files:

- `public-catalog/src/app/poster/page.test.tsx`
- `public-catalog/src/app/studio/page.test.tsx`
- optional header/component tests if present

Tasks:

- first add failing tests for the new `/poster` page:
  - page renders
  - share params prefill the content
  - connection state loads
  - publishing sends the expected payload
- replace the current Studio poster tests with creation-focused expectations:
  - no embedded poster panel
  - no poster connection bootstrap
  - optional link/handoff to `/poster`
- update any send-to-poster link tests or add focused tests where the routing changes

Acceptance criteria:

- new poster behavior is covered by focused tests
- Studio tests lock in the new separation of concerns

## Suggested Execution Order

1. Add failing tests for the new `/poster` page.
2. Add failing Studio test updates for removal of the embedded poster panel.
3. Implement the `/poster` page with live status and publish flow.
4. Remove the embedded poster UI from Studio and replace it with a lightweight handoff.
5. Update header and send-to-poster entry points to route to `/poster`.
6. Re-run AOP Printify tests, poster tests, Studio tests, and production build.

## Verification Plan

### Automated

- run `vitest` for `src/app/poster/page.test.tsx`
- run `vitest` for `src/app/studio/page.test.tsx`
- run `vitest` for `src/app/api/printify/mockups/route.test.ts`
- run `npm -C public-catalog run build`

### Manual

- open `/poster` and verify it loads as its own page
- confirm share params prefill image/text
- confirm Studio no longer shows the full poster panel
- confirm send-to-poster actions from Customize, Catalog, and Gallery land on `/poster`

## Risks And Mitigations

- risk: moving poster logic out of Studio breaks current poster functionality
- mitigation: move behavior with tests first rather than rewriting it

- risk: duplicated poster logic across Studio and `/poster`
- mitigation: remove the embedded Studio poster panel in the same slice

- risk: navigation and share links drift out of sync
- mitigation: update all known send-to-poster entry points together and test them

- risk: AOP Printify changes regress while unrelated UI work happens
- mitigation: keep the route stable and rerun its targeted tests during verification

## Done Definition

- `/poster` exists as a dedicated top-level page
- header navigation includes `MultiPoster`
- Studio no longer embeds the full poster panel
- share/send actions route to `/poster`
- AOP Printify tests still pass
- poster, Studio, and build verification all pass
