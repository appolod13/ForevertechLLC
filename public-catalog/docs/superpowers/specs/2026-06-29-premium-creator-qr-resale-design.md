# Premium Creator + QR Resale Design

## Goal
Introduce a hybrid entitlement model that supports:

- a free tier with limited stored generations
- a one-time `Real Quantum Generation - $9.99` purchase that grants per-artwork premium proof and storage
- a `Premium Creator - $24.99/month` subscription that grants creator resale rights, larger storage, and payout eligibility
- a public QR-based one-time buyer flow for non-subscribers

This spec extends the studio-first quantum generation work and defines how creation access, proof access, resale rights, and source verification fit together across Studio, PixelQrypt, and checkout.

## Product Intent
PixelQrypt should treat quantum-backed artwork as both a creative artifact and a sellable record.

The system should separate three ideas clearly:

- creation mode: standard or real quantum
- proof entitlement: whether a specific artwork has premium source/provenance access
- creator commerce rights: whether the account can list works for resale and receive payouts

This separation keeps the product understandable:

- free users can try the product
- one-time paid users can own and store premium records for specific pieces
- premium creators can build collections, publish QR-linked sales pages, and earn revenue

## Scope
### Included
- `Free` storage limit of `5` generations
- one-time `Real Quantum Generation - $9.99` per-artwork entitlement rules
- `Premium Creator - $24.99/month` subscription model
- `75%` creator payout on all creator-linked sales
- public QR-linked one-time buyer flow for general users
- storage rules for images, seeds, quantum metadata, math, and code artifacts
- PixelQrypt source record pages for paid quantum works
- unified PixelQrypt + IBM/provider verification experience
- checkout upsell for creator subscription, not checkout quantum proof

### Excluded
- tax, compliance, and jurisdiction-specific payout law details
- full legal contract language for IP transfer or licensing
- blockchain or wallet integration
- auction mechanics
- secondary resale between collectors
- advanced creator analytics dashboard beyond basic payout/status visibility

## Current State
### Studio
- Studio already exposes `Standard Generation` and `Real Quantum Generation - $9.99`.
- The current paid quantum path is mostly UI scaffolding and lightweight local record creation.
- Real backend quantum provenance exists, but it is not yet fully connected to the new Studio entitlement flow.

### Checkout
- Checkout has already been simplified away from the old `Quantum Verified Premium` upsell.
- It does not yet support a creator subscription upgrade.

### PixelQrypt
- PixelQrypt already has a paid entitlement pattern for code- or content-based access.
- That entitlement structure can be reused for QR-based art/code purchases.

## User Types
### 1. Free User
- Can create and keep up to `5` stored generations.
- Can browse their own history.
- Cannot publish creator resale pages.
- Cannot receive payouts.

### 2. Quantum Buyer
- Pays `Real Quantum Generation - $9.99` for a single artwork.
- Permanently stores that paid artwork.
- Unlocks premium source/proof data for that artwork only.
- Does not receive creator resale rights.

### 3. Premium Creator
- Pays `Premium Creator - $24.99/month`.
- Can publish creator-linked assets.
- Receives `75%` payout on all creator-linked sales.
- Gets expanded storage for collection assets and source records.
- Can manage QR-linked public sales pages.

### 4. General Buyer
- Does not need a subscription.
- Can scan a QR code and make a one-time purchase.
- Buys access to the creator-linked asset, code, proof page, or digital collectible experience defined by that listing.

## Core Business Rules
### 1. Storage
- Free accounts may store up to `5` generations total.
- A one-time `Real Quantum Generation - $9.99` purchase permanently stores that artwork even if the user is not a subscriber.
- Premium creators receive expanded storage for:
  - generated images
  - prompts
  - seeds
  - math artifacts
  - code artifacts
  - backend/qubit metadata
  - measurement data
  - source records

### 2. Resale Rights
- Resale rights belong only to `Premium Creator` accounts.
- Paying `$9.99` for a real quantum generation does not by itself create resale rights.
- A paid quantum artwork can later become creator-listed if the owner upgrades to premium and the piece is eligible for publishing.

### 3. Revenue Share
- Creator receives `75%` of all creator-linked sales.
- Platform receives `25%`.
- This applies to all creator-linked sales in scope for the published collection experience, including digital/code access or other supported linked sales.

### 4. Proof Access
- Proof entitlement is attached per artwork.
- A quantum-paid artwork exposes advanced provenance details to its owner even without subscription.
- Premium creators may also use those records as part of a public sale listing when product rules allow.

## Studio UX
## 1. Generation Modes
Studio keeps two generation modes:

- `Standard Generation`
- `Real Quantum Generation - $9.99`

### Standard
- Runs standard generation flow.
- Counts toward the free storage limit if the user chooses to keep the result.
- Does not create a premium source record.

### Real Quantum
- Requires payment before generation unless the account already has an unused paid entitlement for that specific action.
- On payment success:
  - generation proceeds
  - artwork is marked as permanently stored
  - source/proof data is attached to that artwork

## 2. Premium Creator Upsell In Studio
Studio should also show a separate creator upgrade entry point:

- `Upgrade to Premium Creator - $24.99/month`

This upsell should explain:

- creator resale rights
- `75%` payout on creator-linked sales
- expanded storage
- QR-based public sales pages
- premium collection management

This must remain distinct from the `$9.99` quantum-generation choice so users understand that one unlocks a paid artwork record while the other unlocks creator commerce rights.

## PixelQrypt Source Record Experience
## 1. Source Record Page
Each paid quantum artwork gets a PixelQrypt-hosted source record page.

The page should include:

- artwork image
- prompt
- generation timestamp
- seed value or seed identifier
- backend/provider name
- qubit details when available
- measurement or shot data when available
- math summary or artifact reference
- code summary or artifact reference
- proof status
- owner or creator attribution when appropriate

## 2. Unified IBM / Provider Verification
The experience should feel like one connected proof system, not two unrelated destinations.

Recommended structure:

- PixelQrypt hosts the main source record page
- the page contains an embedded verification section that references the quantum provider
- the page includes an external link to the relevant IBM/provider source page, job reference, backend reference, or official provider information

This keeps the artwork and its proof centered in PixelQrypt while still grounding the claim in the external source.

## 3. Proof Ownership Rules
- Owners of paid quantum works can always view the full source record for their purchased piece.
- Public visitors see only the version allowed by listing/privacy rules.
- Premium creators can choose to publish a public-facing proof summary on creator listings.

## QR Commerce Flow
## 1. Publishable Asset
A premium creator can mark an eligible generated work as publishable.

Publishing creates:

- a creator listing record
- a public PixelQrypt sales page
- a QR code tied to that listing

## 2. Public QR Page
When a general user scans the QR code, they land on a public PixelQrypt page that shows:

- artwork preview
- creator attribution
- short proof summary
- purchase CTA
- optional source/proof preview

## 3. One-Time Buyer Flow
General users can buy through a one-time checkout flow without subscribing.

On success:

- purchase is recorded
- entitlement is granted to the buyer
- creator payout ledger entry is created
- listing sales stats are updated

## Subscription And Payment Model
## 1. Stripe Products
Create separate billing products:

- `real_quantum_generation_one_time`
- `premium_creator_monthly`
- listing-specific or content-specific public buyer purchase products as needed

## 2. Payment Placement
- The `$9.99` quantum payment stays tied to Studio generation.
- The `$24.99/month` premium creator payment appears:
  - in Studio as a creator upgrade path
  - in checkout as a creator upsell
  - in profile/account settings as a subscription management entry point

## 3. Checkout Upsell Position
Checkout should not restore the old quantum upsell.

Instead, checkout may offer:

- `Upgrade to Premium Creator - $24.99/month`

Support copy should focus on:

- resale rights
- creator payouts
- QR-linked selling
- expanded storage

It should not imply that proof for the current artwork is being sold in checkout.

## Data Model
The system will likely need these records or equivalent fields:

- `users`
- `subscriptions`
- `generation_records`
- `generation_storage_entitlements`
- `quantum_artwork_entitlements`
- `source_records`
- `creator_listings`
- `qr_codes`
- `purchases`
- `payout_ledger`
- `storage_usage`

### Key Fields
For `generation_records`:
- `user_id`
- `prompt`
- `mode`
- `image_url`
- `created_at`
- `is_stored`
- `source_record_id`

For `quantum_artwork_entitlements`:
- `generation_id`
- `user_id`
- `payment_session_id`
- `proof_access`
- `storage_granted`

For `source_records`:
- `generation_id`
- `seed`
- `provider`
- `backend`
- `qubit_metadata`
- `measurement_metadata`
- `math_artifact_url`
- `code_artifact_url`
- `external_source_url`

For `creator_listings`:
- `creator_user_id`
- `generation_id`
- `status`
- `public_slug`
- `qr_code_url`
- `price`
- `revenue_share_creator`
- `revenue_share_platform`

For `payout_ledger`:
- `creator_user_id`
- `purchase_id`
- `gross_amount`
- `creator_amount`
- `platform_amount`
- `status`

## Access Control Rules
- Free user can store only up to `5` generations unless an artwork-specific paid entitlement exists.
- Quantum-paid artwork bypasses the free storage cap for that artwork.
- Premium creator status is required to publish listings and receive payouts.
- Artwork proof access is independent from creator subscription status.
- Public QR buyers receive only the access granted by their purchase type.

## Error Handling
### 1. Payment Failures
- If `$9.99` payment fails, no paid quantum generation starts.
- If `$24.99` subscription setup fails, creator rights remain locked.
- Failed public buyer purchases grant no entitlement.

### 2. Generation Failures
- If payment succeeds but real quantum generation fails, preserve the paid entitlement so the user can retry or receive support.
- Do not lose a paid proof/storage right because of downstream generation failure.

### 3. Metadata Gaps
- If some provider fields are unavailable, still create a source record with:
  - image
  - timestamp
  - payment reference
  - seed or provider reference if available
  - fallback verification status

### 4. Storage Limit Conflicts
- If a free user hits the `5` generation storage cap, prompt them to:
  - delete older stored generations
  - pay for a real quantum generation
  - upgrade to premium creator

## Testing Strategy
### Studio
- verifies free users are limited to `5` stored generations
- verifies `$9.99` purchase stores the resulting artwork permanently
- verifies quantum-paid artwork unlocks proof data without creator rights
- verifies premium creator upsell is distinct from quantum generation purchase

### Source Records
- verifies source record page renders available seed, backend, qubit, and measurement details
- verifies provider link is attached when available
- verifies owners can access full proof for paid artworks

### QR Commerce
- verifies only premium creators can publish a listing
- verifies scanning a QR page leads to a public sales page
- verifies general buyers can complete one-time purchase without subscription
- verifies `75% / 25%` ledger split is recorded

### Subscription
- verifies premium creator subscription upgrades account access
- verifies checkout can show creator upsell without reintroducing checkout quantum proof

## Rollout Notes
This should be built in phases:

1. entitlement and storage model
2. premium creator billing and account flags
3. source record persistence and PixelQrypt proof page
4. QR listing + buyer flow
5. payout ledger and creator account visibility

This reduces risk because proof storage and creator commerce do not need to ship in a single large change.

## Success Criteria
- Free users are limited to `5` stored generations.
- `$9.99` quantum buyers keep permanent storage and full proof access for purchased artworks.
- `$24.99/month` premium creators can publish and sell creator-linked assets.
- Creator-linked sales record a `75%` creator share.
- Public buyers can purchase from QR pages without subscribing.
- PixelQrypt source pages present proof details and a connected IBM/provider reference experience.
