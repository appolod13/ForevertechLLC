# Customer-Facing UX Sweep Design

## Goal

Make the public product feel like a clear customer experience instead of a bundle of internal team tools by restructuring the main journey around:

- discover
- generate
- preview
- customize
- buy
- optionally share

This work keeps the existing visual system and core architecture, but changes page composition, navigation emphasis, action hierarchy, and the visibility of secondary tooling so customer intent stays obvious at every step.

## Approved Direction

- Use the customer-journey restructuring approach instead of a full redesign.
- Keep the current dark visual language and existing reusable components where they already support the customer flow.
- Make the public site explain value and next steps faster.
- Simplify Studio so the primary creation path is unmistakable.
- Reduce or isolate internal-feeling tools from the main customer journey.
- Unify repeated actions and naming across homepage, gallery, customize, and Studio.

## Scope

- Rework public entry points so the homepage and navigation prioritize customer understanding over internal tooling exposure.
- Simplify `public-catalog/src/app/studio/page.tsx` around a customer-first creation flow.
- Simplify browsing and action hierarchy in catalog and gallery card surfaces.
- Keep the shared merch preview as the main confidence-building component across generation and shopping flows.
- Standardize poster and sharing entry points so they feel optional and secondary instead of primary.
- Add or update focused tests for key customer journeys and route/action consistency.

## Non-Goals

- No full visual rebrand or design-token rewrite.
- No checkout architecture rewrite.
- No replacement of the image generation pipeline.
- No removal of creator or operations features from the product entirely.
- No attempt to solve every legacy admin, auth, or environment issue in this slice unless it directly blocks the public journey.

## Current Problems

### Product Understanding

The public experience starts with a strong brand promise, but it does not keep that promise consistently across the full journey. A new visitor can quickly move from customer-facing language into internal-feeling tools, platform controls, and workflow-heavy sections.

This creates three main problems:

- people need too much product knowledge to understand what to do next
- important customer actions compete with low-priority tooling
- the site feels more like a workspace than a guided product

### Navigation

The header currently exposes too many destinations of mixed audience and purpose, including duplicated or tool-oriented entries. That makes the product feel broad before it feels clear.

Current issues include:

- `Studio` and `MultiPoster` both route to `/studio`
- public destinations and tool/admin-style destinations sit together
- the menu emphasizes navigation breadth over decision clarity

### Studio

`Studio` is the biggest UX problem because it mixes the primary customer creation flow with advanced or secondary systems on the same screen.

The current page includes:

- prompt creation
- prompt optimization reports
- premium upsell
- public-link upload toggle
- generation logs
- image preview
- merch preview
- origin-record actions
- multi-channel poster
- social connection controls
- live chat
- scheduling calendar

This makes the page feel like a creator operations console instead of a focused generation experience.

### Browse And Gallery Surfaces

Catalog and gallery cards ask the customer to process too many parallel actions. Cards mix preview, customize, purchase, feedback, favorites, poster sending, and status badges at the same visual level.

This creates two issues:

- the main action is unclear
- optional actions feel mandatory because they are always present and equally weighted

## Design Principles

### 1. Keep The Product Promise Visible

Every public page should make the product legible to a first-time customer. Users should quickly understand:

- what this product is
- what they can make or buy
- what action to take next

### 2. One Primary Action Per Surface

Each major surface should have one clearly dominant action. Secondary actions can remain, but they should not compete visually with the main path.

Examples:

- homepage: start creating or browse creations
- Studio: generate and move to preview/customize
- gallery: preview or customize
- customize: finalize product choices and purchase

### 3. Secondary Tools Must Feel Secondary

Internal-feeling utilities such as advanced poster controls, multi-platform auth, scheduling, and chat should not live at the same visual priority as customer creation and shopping actions.

### 4. Repeat A Small Action Vocabulary

Use the same small set of customer actions across routes:

- `Create`
- `Preview`
- `Customize`
- `Add to Cart`
- `Share`

Avoid route-specific or tool-centric labels where customer-friendly terms can do the job.

### 5. Preserve Existing Strengths

The shared merch preview and the existing dark visual system already help product confidence. The sweep should preserve those strengths instead of replacing them.

## Proposed Product Structure

### Homepage

The homepage becomes the clearest explanation of the product and the cleanest entry into the customer journey.

Changes:

- tighten hero copy around customer benefit and product outcome
- reduce technical or internal-feeling wording in the hero
- keep the main CTA pair focused on creating and browsing
- demote low-priority or team-oriented signals below the main conversion path
- treat the social feed as supporting proof, not as a competing main section

Desired customer reading order:

1. understand the product
2. see the newest result
3. choose between creating and browsing
4. continue into catalog or Studio

### Header And Navigation

The header should expose a smaller customer-facing menu and demote tool-heavy destinations.

Proposed navigation groups:

- primary public: `Home`, `Studio`, `Gallery`, `About`, `Support`
- commerce/supportive: `Cart`, `FAQs`, `Shipping`, `Refunds`
- secondary or hidden from the main customer menu: governance, tools, scanner, admin-oriented entries, duplicate poster entry points

Rules:

- remove duplicate `MultiPoster` exposure from primary navigation
- do not present internal or advanced destinations before core customer destinations
- keep admin visibility behavior, but avoid mixing admin affordances into the core customer menu structure

### Studio

Studio becomes the canonical creation surface and should visibly center the flow:

1. write a prompt
2. choose generation mode
3. generate
4. review the result
5. preview merch
6. customize or purchase
7. optionally share

#### Main Studio Section

Keep these sections high on the page:

- prompt input
- generation mode selection
- generate button
- generation progress and essential status
- latest generated image
- merch preview
- `Customize Your Gear`

Keep the generation experience transparent, but reduce operational noise. Logs may remain during active generation, but they should not dominate the resting page.

#### Secondary Studio Section

Move the following into a clearly secondary area below the main creation flow, preferably collapsed or visually separated:

- cross-agent optimization report details
- multi-channel poster
- social sign-in and connection tiles
- Reddit-specific posting inputs
- schedule calendar
- live chat
- screenshot manager promo

Rules:

- the page should still support sharing workflows
- sharing workflows should feel optional and post-creation
- a user should be able to complete the creation-to-customize journey without scanning operations tooling

#### Studio Messaging

The top-level `Creator Studio` framing should shift toward customer-friendly language. The page can still be called Studio, but the surrounding copy should emphasize product creation rather than internal content operations.

### Catalog

Catalog cards should guide customers toward preview, customize, and purchase without overloading them.

Changes:

- keep product confidence cues such as pricing and image preview
- reduce the visual prominence of feedback and poster actions
- make purchase and product-preview decisions easier to scan
- treat sharing as a follow-up action instead of a peer to buying

Recommended action order:

- primary: `Buy Now`
- secondary: `Preview Product`
- secondary: `Customize`
- tertiary: feedback and share actions

### Gallery

Gallery should feel like a customer collection and product library, not a mixed tool dashboard.

Changes:

- keep preview and customize as the dominant actions
- preserve purchase flow and favorites
- demote poster sending from a main action row into a secondary action area or overflow pattern
- keep PixelQrypt unlock actions visible only where they reinforce value instead of stealing focus

### Customize And Shared Preview

The existing merch preview and customization flow are already close to the desired customer direction.

Changes in this slice are mainly consistency-oriented:

- keep `MerchPreviewPanel` as the buyer-confidence anchor
- preserve current customize entry points
- align labels and button priority with homepage, Studio, and gallery
- ensure the creation flow lands users into preview/customize without detouring through operational tooling

## Information Architecture Rules

- customer journey first
- sharing and platform distribution second
- advanced operations last

For any public route, if a feature does not help the user understand, create, preview, customize, or buy, it should be visually demoted or moved lower in the page.

## Route And Component Change Surfaces

### Expected Files

- `public-catalog/src/app/page.tsx`
- `public-catalog/src/components/Header.tsx`
- `public-catalog/src/components/CatalogGrid.tsx`
- `public-catalog/src/components/CatalogItem.tsx`
- `public-catalog/src/app/studio/page.tsx`
- `public-catalog/src/app/gallery/page.tsx`
- `public-catalog/src/components/MerchPreviewPanel.tsx`

### Expected Supporting Tests

- `public-catalog/src/app/studio/page.test.tsx`
- `public-catalog/tests/e2e/customer.journey.spec.ts`
- `public-catalog/tests/e2e/studio.spec.ts`
- any focused component tests for revised action hierarchy

## Implementation Phases

### Phase 1: Public Entry And Navigation

- simplify homepage hero copy and CTA hierarchy
- reduce duplicate or tool-heavy primary navigation entries
- make the top-level product value proposition easier to parse

### Phase 2: Studio Restructure

- separate primary creation flow from secondary sharing and operations tools
- keep core generation and merch preview highly visible
- visually demote optional platform and scheduling features

### Phase 3: Catalog And Gallery Action Cleanup

- simplify card action hierarchy
- reduce share/poster prominence
- align labels and button order across browse surfaces

### Phase 4: Consistency Pass

- align wording, CTA order, and section emphasis across homepage, Studio, gallery, and customize-adjacent surfaces
- confirm poster flow still works as an optional downstream action

### Phase 5: Verification

- run focused component tests and end-to-end flows
- verify that a first-time user can move from homepage to Studio or gallery without encountering internal-feeling blockers

## Error Handling And Guardrails

- If environment-specific failures such as `/api/admin/me` or unrelated auth errors remain, avoid surfacing those states prominently in the main customer path.
- If a secondary feature cannot be safely removed yet, visually isolate it instead of leaving it mixed into the primary content.
- If sharing requires auth or connected accounts, present that requirement only when the user enters the sharing flow, not before.

## Testing Strategy

- Update Studio tests to assert the primary creation flow remains visible and secondary tooling appears below or behind lower-priority sections.
- Add or update route-level and e2e checks for homepage CTA behavior and navigation clarity.
- Add or update browse-surface tests to confirm button hierarchy and main customer actions remain available.
- Run focused browser verification for the public journey:
  - homepage to Studio
  - homepage to gallery
  - Studio generate to preview to customize
  - gallery preview to customize to cart

## Acceptance Criteria

- The homepage reads as a customer product entry point, not an internal tool hub.
- The primary header no longer exposes duplicate or unnecessary tool-oriented entries alongside core customer navigation.
- Studio clearly prioritizes prompt, generate, preview, merch preview, and customize above sharing and operations controls.
- Catalog and gallery surfaces emphasize preview, customize, and purchase ahead of poster/distribution actions.
- Sharing and poster tooling remain available, but no longer dominate the public customer flow.
- The core customer journey is consistent across homepage, Studio, gallery, and customize-adjacent surfaces.
