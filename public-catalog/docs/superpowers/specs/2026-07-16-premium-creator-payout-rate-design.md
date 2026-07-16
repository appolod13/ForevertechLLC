# Premium Creator Payout Rate Change Design

## Summary

Change the Premium Creator user earning rate from `75%` to `45%` across the product so the underlying payout logic, visible marketing copy, and automated tests all remain aligned.

## Goal

- Update the real payout value used by Premium Creator access logic.
- Update all current user-facing Premium Creator payout messaging from `75%` to `45%`.
- Preserve all other Premium Creator benefits and flows.
- Keep focused tests passing after the rate change.

## Non-Goals

- No change to Premium Creator pricing.
- No change to Stripe onboarding behavior.
- No change to resale eligibility, storage limits, or QR-selling access.
- No new payout calculator, dashboard math, or revenue-reporting feature.

## Current State

The current Premium Creator payout rate is defined in `src/lib/creatorAccess.ts` as `0.75`.

The current `75%` rate is also surfaced directly in Premium Creator UI copy, including:

- `src/app/profile/page.tsx`
- `src/app/studio/page.tsx`
- `src/app/checkout/page.tsx`

Focused tests currently assert the `75%` rate in:

- `src/lib/creatorAccess.test.ts`
- `src/app/profile/page.test.tsx`
- `src/app/studio/page.test.tsx`
- `src/app/checkout/page.test.tsx`

## Proposed Change

### Logic

Update Premium Creator access so `payoutRate` changes from `0.75` to `0.45` in `src/lib/creatorAccess.ts`.

This remains the source of truth for the actual earning rate exposed by the current access model.

### User-Facing Copy

Replace current Premium Creator payout text from `75%` to `45%` in the existing product surfaces that advertise or confirm creator earnings:

- Profile page status and upgrade messaging
- Studio Premium Creator upsell copy
- Checkout Premium Creator upsell copy

### Tests

Update existing focused assertions so tests validate the new payout rate and wording without expanding scope beyond this change.

## Implementation Notes

- Prefer targeted edits over refactoring.
- Keep the current structure and access model intact.
- Only touch files that define or directly display the Premium Creator earning rate.
- Avoid changing unrelated numeric literals that happen to contain `75` or `0.75`.

## Risks

### Messaging Drift

If copy is updated in some places but not others, users could see inconsistent earning promises.

Mitigation:

- Use targeted search for `75%`, `0.75`, `creator payouts`, and `payout active`.
- Review affected Premium Creator surfaces after edits.

### Behavior Drift

If only text changes and the underlying rate remains `0.75`, the app would misrepresent creator earnings.

Mitigation:

- Update the source-of-truth rate in `src/lib/creatorAccess.ts`.
- Keep the corresponding unit test assertion aligned with the new value.

## Validation

- Run the focused tests covering creator access and Premium Creator UI copy.
- Confirm all visible Premium Creator payout references in the changed surfaces now show `45%`.
- Confirm no unrelated Premium Creator behavior changed.

## Acceptance Criteria

- Premium Creator access returns `payoutRate: 0.45`.
- Current Premium Creator UI messages that advertise creator earnings show `45%`.
- Existing relevant tests pass with updated `45%` expectations.
- No unrelated Premium Creator features or pricing are changed.
