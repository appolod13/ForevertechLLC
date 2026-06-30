# Stripe Connect Signup Link Design

## Goal

Make it easier for creators to start accepting payments for merch by replacing vague Stripe Express onboarding prompts with a clearer explanation and a direct, live signup link to Stripe Connect.

## Scope

- Update the existing Stripe Connect prompts in the profile and gallery experiences.
- Explain that creators must sign up for Stripe Express/Connect before they can accept merch payments.
- Make the signup destination directly clickable and route users to `https://dashboard.stripe.com/connect`.
- Keep the rest of the payment and premium creator flows unchanged.

## User-Facing Copy

Use messaging with this meaning:

- "To accept payments for your merch, you need to sign up for Stripe Express first."
- "Create your Stripe account here to finish setup and start accepting payments."

CTA meaning:

- Primary action text should clearly indicate signup, such as "Sign up for Stripe Express".
- The CTA should be a live link that opens Stripe's signup page directly.

## Interaction Design

- Wherever the current unconnected Stripe prompt appears, show the clearer explanatory copy.
- Replace the in-app onboarding button in this flow with a direct external link to Stripe Connect.
- Open the Stripe page in a new tab so creators do not lose their place in the app.

## Non-Goals

- No changes to the backend onboarding API.
- No changes to account-link generation.
- No changes to premium checkout or merch checkout logic.

## Files Expected To Change

- `src/app/profile/page.tsx`
- `src/app/gallery/page.tsx`

## Verification

- Confirm the updated copy renders in the unconnected Stripe states.
- Confirm the CTA points to `https://dashboard.stripe.com/connect`.
- Confirm the link is keyboard accessible and visually styled like the existing call-to-action.
