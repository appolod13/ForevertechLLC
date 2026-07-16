# Studio MultiPoster Template Restoration Design

## Summary

Restore the `Studio` page MultiPoster area to the user-provided screenshot template and remove the currently used Studio poster template that is causing a production mismatch.

At the same time, change Premium Creator payout messaging and payout logic from `75%` to `45%`.

## Goal

- Use the attached screenshot as the canonical visual template for the MultiPoster section inside `src/app/studio/page.tsx`.
- Keep the existing connected posting behavior working.
- Remove the current Studio poster presentation that routes users away from the intended in-page template.
- Change creator payout rate and payout messaging from `75%` to `45%`.

## Non-Goals

- No redesign of the rest of the Studio generation flow outside the MultiPoster section.
- No change to the underlying post publishing endpoints unless needed to preserve existing behavior in the restored Studio template.
- No change to the general MultiPoster platform set unless the screenshot requires hiding unsupported platforms in the Studio presentation layer.
- No change to unrelated merch preview, generation pipeline, or checkout layout.

## Current State

The current Studio page explicitly avoids rendering the MultiPoster block in place.

Current test coverage shows the existing intended behavior is:

- Studio does not render `Multichannel Poster`
- Studio links users out to `/poster`
- Studio does not render the older `Live Chat` block

Relevant files:

- `src/app/studio/page.tsx`
- `src/app/studio/page.test.tsx`
- `src/components/MultiPosterPanel.tsx`
- `src/lib/multiposter.ts`

The current payout rate has already been identified in:

- `src/lib/creatorAccess.ts`
- `src/app/api/pixelqrypt/checkout/route.ts`
- payout copy in `src/app/studio/page.tsx`
- related tests covering creator access and Studio/Profile/Checkout messaging

## Canonical Template Requirement

The user-provided screenshot is the required visual reference for the Studio MultiPoster section.

For this feature, the screenshot is the source of truth for:

- section composition
- visual hierarchy
- button layout
- in-panel controls
- overall panel look and feel

If current Studio poster markup differs from the screenshot template, the screenshot wins.

## Proposed Change

### 1. Restore MultiPoster In Studio

Bring the MultiPoster experience back into the `Studio` page instead of routing users to a dedicated `/poster` page for the primary in-Studio poster workflow.

This means the Studio page should render the canonical poster template directly in the page where the user expects it.

### 2. Keep Existing Connections And Posting Logic

Preserve current connected behavior as much as possible:

- keep current connection-state loading
- keep current publish action behavior
- keep current use of connected session/platform state
- keep current post submission behavior
- keep current share payload compatibility where still needed

The work should prefer rewiring existing logic into the restored template rather than inventing a new posting flow.

### 3. Remove The Wrong Studio Template

Remove the current Studio poster template and routing pattern that is causing the production mismatch.

This includes:

- the current Studio behavior that only links out to `/poster`
- the tests that enforce that poster absence in Studio
- any Studio-specific poster markup that conflicts with the screenshot template

This does **not** mean removing the underlying reusable logic if it can be retained safely.

### 4. Change Payout From 75% To 45%

Update payout behavior and messaging in the same implementation so all current surfaces align with the new creator earnings rate.

This includes:

- `src/lib/creatorAccess.ts`
- `src/app/api/pixelqrypt/checkout/route.ts`
- Studio/Profile/Checkout payout copy
- focused tests that assert `75%` or `0.75`

## Expected UI Boundaries

### Studio Page

The Studio page should:

- keep the generation flow intact
- keep the latest build preview intact unless the screenshot clearly requires a local layout adjustment
- render the canonical MultiPoster section in place
- avoid sending the user away just to use the main Studio poster workflow

### MultiPoster Behavior

The restored Studio MultiPoster section should continue to support the connected account and publishing behavior already present in the codebase.

Where the screenshot shows controls not currently visible in Studio, wire them to existing state/behavior when possible instead of adding unrelated systems.

### Dedicated Poster Route

The `/poster` page can remain if it still serves other entry points, but it should no longer be the required path for the primary Studio MultiPoster experience.

## Data Flow

- Generated image and prompt continue to originate from Studio state.
- Poster-prefill data should remain derived from the latest generated content.
- Publishing should continue to use the existing post endpoint and connection state logic.
- Any existing share params should remain compatible with the poster system, even if the main Studio path now renders the poster inline.

## Testing

Update focused tests so they validate the restored intended behavior:

- Studio renders the in-page MultiPoster section
- Studio no longer relies only on an `Open in MultiPoster` handoff for the main workflow
- existing connection/publish behavior remains intact where covered
- payout tests assert `45%` instead of `75%`

Add or adjust only the tests needed to prove:

- the canonical Studio MultiPoster template is present
- the old absent-in-Studio template assumption is removed
- payout behavior and messaging remain aligned

## Risks

### Breaking Existing Poster Wiring

If the `/poster` handoff logic is removed too aggressively, shared poster entry points could break.

Mitigation:

- preserve reusable poster logic and share payload handling
- only change the Studio page’s primary presentation path

### Template Drift

If the Studio markup is only partially updated, production could still diverge from the screenshot template.

Mitigation:

- treat the screenshot as the final visual reference
- remove conflicting Studio poster markup instead of layering templates together

### Logic/UI Drift On Payouts

If payout copy changes without payout logic changes, earnings messaging becomes inaccurate.

Mitigation:

- update both access logic and direct payout math
- keep focused payout tests aligned

## Acceptance Criteria

- The Studio page renders the canonical MultiPoster section based on the attached screenshot.
- The wrong Studio poster template is removed.
- Existing connected posting behavior remains functional.
- Studio no longer depends on an out-of-page poster route for the main Studio MultiPoster workflow.
- Premium Creator payout logic and messaging use `45%`.
- Focused tests are updated and pass.
