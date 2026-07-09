# Targeted Social And Calendar Restore Design

## Goal

Restore the user-facing social connection and calendar behavior that previously felt connected and complete, without rolling back unrelated newer work such as the dedicated `MultiPoster` page or the AOP mockup improvements.

## Approved Direction

- Use the current codebase as the base.
- Restore missing or incomplete behavior in both:
  - `Studio`
  - account/social settings surfaces
- Treat existing backend routes as the source of truth for connection state and posting support.
- Avoid destructive rollback to an unreachable historical snapshot.

## Why Targeted Restore

The requested historical reference commit `22f5d26` is not reachable from the current local clone or fetched remote refs, so an exact file-for-file restore cannot be performed safely from that commit alone.

A targeted restore is the safest option because the current repository still contains:

- session-backed social connection state in `src/app/api/auth/session/route.ts`
- active posting branches in `src/app/api/post/route.ts`
- the dedicated `MultiPoster` page and handoff flow
- existing tests around `Studio` behavior and poster connection rendering

This means the missing experience is likely a UI integration regression or incomplete surface area, not a total loss of backend capability.

## Current Findings

### Social Connections

The backend session route currently exposes these platforms:

- `twitter`
- `telegram`
- `instagram`
- `tiktok`
- `youtube`
- `reddit`
- `discord`
- `rss`

The current dedicated `MultiPoster` page already renders all of them after the recent update.

However, the account-facing management surface currently appears incomplete:

- `src/app/profile/page.tsx` visibly manages only `Discord Webhook`
- no equivalent profile UI was found for the other connected social platforms
- this creates a mismatch where the backend knows about multiple connections, but the account UI does not present them as a coherent connected system

### Calendar Behavior

The only concrete calendar trace currently confirmed in this clone is the `Studio` date-range/calendar test area in `src/app/studio/page.test.tsx`.

The user explicitly wants calendar behavior restored in both:

- `Studio`
- profile/social-related flow

Because no separate account scheduler UI is currently obvious in the fetched code, the restore must first identify where calendar-related behavior was removed or collapsed, then rebuild that user-facing path in a way that matches current patterns.

## Product Design

### 1. Reconnect Social Surface Areas

The product should feel like all previously connected channels are still connected and discoverable.

That means:

- the account-facing surface should show the existing session-backed platforms, not only Discord
- the UI should clearly indicate which destinations are connected
- the UI should preserve honest state instead of implying support where configuration is still missing
- the dedicated `MultiPoster` page should remain the posting workspace, while account/profile pages act as the connection visibility and management surface

### 2. Restore Calendar Presence In Studio

The `Studio` page should restore any missing calendar/date-range behavior that previously shaped the workflow.

The restore should:

- preserve the current `Studio` generation flow
- preserve the dedicated `Open in MultiPoster` handoff
- reintroduce the missing calendar/date-range UI and state behavior in a focused way
- avoid reintroducing the older embedded multiposter panel that was intentionally moved out of `Studio`

### 3. Restore Calendar Presence In Account/Social Flow

The account/social area should again feel connected to publishing cadence instead of being only a webhook form.

The restore should add or rebuild a lightweight scheduler/calendar surface that:

- reflects the user’s connected social destinations
- supports the social workflow conceptually without pretending unsupported backend scheduling already exists
- can degrade gracefully if only date-range or draft scheduling state exists on the client side for now

## Architecture

### Shared Social Connection Model

The existing connection model should remain centralized around:

- `src/app/api/auth/session/route.ts` for current connection state
- `src/lib/multiposter.ts` for shared client platform definitions and UI mapping

The targeted restore should expand reuse of that model into account/profile surfaces, rather than creating a second hardcoded platform list.

### Studio Calendar Layer

Any restored `Studio` calendar behavior should be isolated from the generation engine.

This layer should:

- own date-range or calendar display state
- remain independent from the image generation pipeline
- not trigger unwanted poster/session bootstrapping in `Studio`

### Account/Social Management Layer

The profile/account page should gain a dedicated section for social connection visibility and calendar/scheduling state.

This layer should:

- render the same platform set already exposed by the backend
- keep connection management logic focused and separate from creator payout and order history sections
- leave backend posting and auth flows untouched unless a test reveals a true mismatch

## Data Flow

### Social Connections

1. Profile/account loads the user context.
2. The page fetches session-backed connection state from `/api/auth/session`.
3. The page renders all currently exposed destinations with honest status labels.
4. Existing destination-specific management, such as Discord webhook handling, remains functional inside the broader connection surface.

### Calendar

1. `Studio` restores its date-range/calendar state from the current client-side flow or existing tests.
2. Account/social scheduling restores a lightweight calendar/scheduler surface.
3. Restored calendar UI should not silently claim server-side scheduling if no such backend exists.

## Error Handling

- If `/api/auth/session` fails, the account/social surface should show a clear unavailable state for every platform.
- If a destination-specific management route fails, that failure should stay local to the affected platform.
- If restored calendar state cannot load, the user should still be able to use `Studio`, profile, and `MultiPoster`.
- No restore work should break the dedicated poster publishing path.

## Testing Strategy

Add focused tests first for:

- profile/account rendering of all backend-exposed social connections
- preservation of existing Discord webhook management
- restored `Studio` calendar/date-range behavior
- restored account/social calendar or scheduling surface
- regression coverage ensuring `Studio` still links out to `/poster` instead of embedding the old poster UI again

## Files Likely To Change

- `src/app/profile/page.tsx`
- `src/app/profile/page.test.tsx`
- `src/app/studio/page.tsx`
- `src/app/studio/page.test.tsx`
- `src/lib/multiposter.ts`
- possible new small shared helpers if a reusable social or calendar section is extracted

## Non-Goals

- No destructive reset to a missing historical commit
- No rollback of dedicated `MultiPoster`
- No rollback of AOP Printify placement work
- No fake backend scheduling implementation if the server does not support it
- No broad redesign of unrelated creator, checkout, or order history flows

## Risks And Mitigations

- Risk: restoring social visibility duplicates platform definitions
- Mitigation: reuse the shared platform model and session route already in the repo

- Risk: “calendar restore” is partially ambiguous because the old snapshot is unavailable
- Mitigation: anchor the implementation to concrete current test coverage and restore only the user-facing behavior needed in `Studio` and account/social surfaces

- Risk: a restore could accidentally reintroduce the old embedded poster workflow in `Studio`
- Mitigation: keep `/poster` as the only full posting workspace and test for that explicitly

## Success Criteria

- All previously exposed social connections are visible again in a coherent user-facing surface.
- `Studio` regains the missing calendar/date behavior without losing current generation flow.
- Account/social pages regain a calendar or scheduling presence consistent with the current app architecture.
- Existing poster publishing and Discord webhook behavior continue to work.
- The restore is verified by focused tests rather than a broad rollback.
