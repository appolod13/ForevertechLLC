# Studio Quantum Generation + Checkout Move Design

## Goal
Move the real quantum purchase decision from checkout into the studio, simplify checkout into a merch-only flow, and introduce two generation modes:

- `Standard Generation`
- `Real Quantum Generation - $9.99`

At the same time:

- remove `Quantum Verified Premium` from checkout
- update all merch prices in the merch flow to `$59.99`
- create a lightweight post-generation proof/record experience for real quantum generations

This is the first sub-project in a larger roadmap that may later include creator subscriptions, creator revenue share, ownership archives, and full certificate systems.

## Product Intent
The real quantum option should feel like a premium, meaningful creative choice made at the moment of creation, not a late-stage checkout add-on.

This design supports that by:

- moving payment and decision-making into the studio
- making the real quantum path explicit before generation
- giving the paid path stronger proof/origin messaging
- keeping checkout focused on selling physical products

## Scope
### Included
- Two studio generation modes
- Paid real quantum generation charged before generation
- Remove checkout-side quantum upsell
- Set all merch products to `$59.99`
- Add lightweight record/download actions after successful real quantum generation
- Persist enough metadata for future ownership/archive features

### Excluded
- `$24.99` premium creator plan
- `75%` creator payout / rev-share logic
- Creator earnings dashboard
- Full genesis archive / leaderboard / tier system
- Full legal ownership framework
- Wallet or blockchain integration

Those belong in later sub-projects.

## Current State
### Studio
- Studio currently has a prompt field and generation controls.
- Quantum language exists today, but the purchase/verification value is not centered clearly in the studio flow.

### Checkout
- Checkout currently contains a `Quantum Verified Premium` upsell.
- This is too late in the funnel and weakens the “creative origin” framing.

### Merch
- Merch flow currently uses lower pricing than the new desired universal price.

## Proposed UX
## 1. Studio Generation Modes
Add a clear mode selector near the top of the generator flow with two options:

### Option A: Standard Generation
- Label: `Standard Generation`
- Helper text: `Create normally without a real quantum-backed seed.`
- No extra charge
- No real quantum seed/proof record
- Continues current basic generation behavior

### Option B: Real Quantum Generation
- Label: `Real Quantum Generation - $9.99`
- Helper text: `Generate with a real quantum computer and receive a verified origin record from the first wave of quantum-backed creations on PixelQrypt.`
- Paid before generation
- Produces/stores a real quantum-backed seed and metadata
- Unlocks proof/record actions after generation

### Interaction Model
- User enters prompt
- User chooses one mode
- If `Standard`, generation runs normally
- If `Real Quantum`, user must complete payment first
- After successful payment, generation proceeds automatically or resumes via success callback

## 2. Payment Timing
The `$9.99` real quantum generation fee is charged **before generation**.

### Why
- Aligns payment with the premium creative action itself
- Prevents “generate first, maybe pay later” ambiguity
- Supports stronger proof messaging because the premium path is intentionally chosen up front

### Flow
- User clicks `Generate with Real Quantum Computer - $9.99`
- App opens a lightweight payment step (modal/redirect/checkout session)
- On success:
  - record payment intent/session
  - resume studio flow
  - perform the generation
  - persist real quantum metadata

If payment fails or is canceled:
- no real quantum generation is performed
- user returns to studio with a clear canceled/failed state

## 3. Post-Generation Experience
After successful real quantum generation, the result section should show:

- generated image
- `Verified Origin Record created`
- `Download Record`
- `View Record`
- `Customize Your Gear`

### Record Content (lightweight V1)
- prompt
- generated image preview
- timestamp
- proof/seed identifier
- verification type
- quantum metadata summary
- “first wave” participation language

### Positioning Copy
Use language like:

- `Your seed is now part of the first generation of quantum-verified art records.`
- `Own a verified origin record from one of the first quantum-backed creations on PixelQrypt.`

This is not yet the full founder archive product, but it intentionally lays the groundwork.

## 4. Checkout Simplification
Remove the `Quantum Verified Premium` option from checkout entirely.

### New Checkout Role
Checkout should only handle:
- selected merch item(s)
- shipping choice
- order total
- Stripe payment for physical purchase

### Remove from Checkout
- quantum premium checkbox
- quantum premium line item
- quantum proof messaging tied to checkout pricing

This makes checkout simpler and prevents origin-proof value from being framed as an impulse add-on.

## 5. Merch Pricing
Update **all merch products in the merch flow** to `$59.99`.

### Requirement
- Any merch product currently exposed in the customization/merch UI should display `$59.99`
- Cart subtotal/order summary should reflect the new price
- Checkout should calculate totals from `$59.99` base product price plus shipping

### Expected Result
- Merch becomes a consistent premium-priced catalog
- Real quantum generation becomes a separate, studio-stage premium action

## 6. Messaging Strategy
### Studio Messaging
The real quantum option should use stronger language than “verification.”

Recommended CTA and support text:

- `Real Quantum Generation - $9.99`
- `Generate with a real quantum computer and receive a verified origin record from the first wave of quantum-backed creations on PixelQrypt.`

### Post-Generation Messaging
- `Verified Origin Record created`
- `Your seed is now part of the first generation of quantum-verified art records.`

### Checkout Messaging
Checkout should not mention quantum premium upgrades anymore.
If proof language appears at all, it should reflect already-completed generation status, not a purchasable upsell.

## 7. Data Model Changes
For real quantum generations, persist a generation record containing:

- `prompt`
- `mode` (`standard` or `real_quantum`)
- generated asset URL/reference
- timestamp
- proof/seed ID
- payment reference for the `$9.99` charge
- verification type
- quantum metadata payload
- downloadable record URL/reference

### Quantum Metadata (V1)
Store what is available from the generation provider, for example:
- provider/source
- job ID
- qubit count or qubit details if available
- backend metadata blob

The record model should be designed to expand later into:
- ownership
- public archive pages
- founder/serial systems
- creator payouts

## 8. UI Components
### Studio
Add:
- generation mode selector
- paid quantum CTA
- payment state messaging
- post-generation record actions

Update:
- existing generation action labels
- copy around quantum mode/proof

### Customize / Merch
Update:
- all displayed merch prices to `$59.99`

### Checkout
Remove:
- quantum premium checkbox and pricing line items

Keep:
- shipping options
- totals
- Stripe handoff

## 9. Error Handling
### Payment Errors
- show clear failure/cancel message in studio
- do not start real quantum generation if payment is incomplete

### Generation Errors
- if payment succeeded but generation fails:
  - preserve payment/session reference
  - show retry/support path
  - do not silently lose paid entitlement

### Metadata Gaps
- if full quantum metadata is unavailable, still create a record using:
  - payment reference
  - timestamp
  - proof/seed ID if available
  - fallback status text

## 10. Testing Strategy
### Studio tests
- renders both generation modes
- selecting `Standard Generation` uses non-paid path
- selecting `Real Quantum Generation - $9.99` triggers paid flow
- successful payment transitions into generation flow
- canceled payment returns safe UI state

### Checkout tests
- no `Quantum Verified Premium` option appears
- totals reflect merch + shipping only

### Merch tests
- all merch prices render as `$59.99`
- cart and checkout totals use `$59.99` base price

### Record tests
- successful real quantum generation creates a view/download record
- generation metadata is stored and returned to UI

## 11. Implementation Notes
This should be implemented as a **studio-first monetization move**, not as a full creator economy rollout.

The most important product outcomes are:
- users choose between standard and real quantum creation before generation
- quantum proof is no longer sold in checkout
- merch pricing becomes uniformly premium
- the paid quantum path feels more meaningful and collectible

## 12. Future Follow-Up Projects
After this spec is implemented, likely next specs are:

1. creator premium plan + access model
2. creator payout / 75% ownership economics
3. full certificate/archive/founding seed system
4. downloadable sales page / mobile proof page for creators

