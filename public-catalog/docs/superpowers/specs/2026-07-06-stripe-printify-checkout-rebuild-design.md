# Stripe Printify Checkout Rebuild Design

## Goal

Rebuild the checkout and fulfillment path so Stripe Checkout becomes the authoritative buyer and shipping source, Printify fulfillment is durable and idempotent, and buyer-preview metadata can be reused across all product preview surfaces.

## Approved Direction

- Follow the checkout rebuild path.
- Keep the existing storefront browsing, cart, and product selection flow.
- Move authoritative buyer and shipping collection into Stripe Checkout.
- Fulfill paid orders into Printify from durable stored order data plus the completed Stripe session.
- Extend shared product metadata so buyer previews and Printify sample links can appear consistently across product preview surfaces.

## Scope

- Update checkout order creation to persist a durable order before redirecting to Stripe.
- Update Stripe Checkout session creation to collect shipping and customer details directly in Stripe.
- Update the Stripe webhook to:
  - reload the stored order
  - read buyer and shipping details from the completed Stripe session
  - create exactly one Printify order per paid checkout
  - persist fulfillment status and Printify identifiers
- Add durable order fields for Stripe and Printify status tracking.
- Extend product metadata so all preview entry points can use the same buyer-preview and Printify sample data.
- Finish buyer-preview coverage for remaining product preview surfaces, especially catalog and default customize product data.

## Non-Goals

- No rewrite of the image generator.
- No redesign of the gallery or studio generation flows beyond preview metadata wiring.
- No requirement to replace Stripe Checkout with a custom payment form.
- No requirement to fetch the entire live Printify catalog in this phase.

## Architecture

### Checkout Source Of Truth

- The app creates an internal order record before redirecting to Stripe Checkout.
- That order record becomes the durable anchor for all later fulfillment work.
- Stripe Checkout becomes the authoritative source for:
  - customer email
  - shipping address
  - payment completion state
- The app continues to supply product, art, and cart metadata from the storefront side.

### Fulfillment Source Of Truth

- On `checkout.session.completed`, the Stripe webhook loads the internal order by stable order ID.
- The webhook reads the completed Stripe session and extracts buyer and shipping details.
- The webhook creates the Printify order only if fulfillment has not already been completed or claimed by a prior webhook attempt.
- The webhook persists the Printify order ID, fulfillment timestamps, and fulfillment state on the durable order record.

### Preview Metadata Source

- `/api/products` remains the source of normalized product records for the frontend.
- Product records are extended to include preview-oriented metadata such as:
  - `printifyPreviewUrl`
  - `surfaces`, including `finished`
  - any other stable preview flags needed by shared buyer-preview components
- Catalog, customize, studio, and gallery can then all render the same buyer-preview experience from one metadata source.

## Data Model

### Orders

Orders should persist enough information to survive deploys, webhook retries, and success-page revisits.

Required durable fields include:

- internal order ID
- Stripe session ID
- Stripe payment status
- Stripe customer email
- normalized shipping name/address fields
- Printify order ID
- Printify status
- fulfillment attempted timestamp
- fulfillment completed timestamp
- failure or last-error field if fulfillment fails

### Order Items

Each order item should persist the fulfillment-critical product metadata needed to reconstruct the Printify order later, including:

- product ID
- variant/size
- color
- price and quantity
- `printifySku`
- `templateProductId`
- `printType`
- `placementMode`
- front art source URL
- back art or personalization metadata when present

### Product Metadata

Products should expose consistent preview metadata to the frontend, including:

- `printifyPreviewUrl`
- `surfaces` that include `finished` where supported
- current preview mode and print mode

## Flow

### Checkout Creation

1. User builds a cart from the storefront.
2. Checkout API validates the cart payload.
3. Checkout API creates a durable internal order and order-item snapshot.
4. Checkout API creates a Stripe Checkout Session linked to that internal order ID.
5. Stripe Checkout collects shipping and customer details directly.

### Payment Completion

1. Stripe emits `checkout.session.completed`.
2. Webhook verifies the event and loads the stored order using order metadata.
3. Webhook checks whether fulfillment has already happened for this order.
4. If not fulfilled, webhook builds the Printify payload from stored order items plus Stripe shipping details.
5. Webhook creates the Printify order.
6. Webhook persists Printify identifiers and fulfillment status.

### Success And Follow-Up

- Success page should read durable order data instead of relying on in-memory assumptions.
- Profile/order views should eventually read the same durable fulfillment fields.
- Webhook retries should be safe and should not create duplicate Printify orders.

## File-Level Plan

### Checkout

- `src/app/api/checkout/route.ts`
  - create durable order rows first
  - create Stripe Checkout Session with internal order ID metadata
  - configure Stripe shipping and customer data collection
- `src/app/checkout/page.tsx`
  - align UI assumptions with Stripe-managed shipping collection

### Fulfillment

- `src/app/api/stripe/webhook/route.ts`
  - load durable order
  - read Stripe session shipping details
  - enforce fulfillment idempotency
  - persist Printify identifiers and status

### Orders And Persistence

- `src/lib/cartStore.ts`
  - reduce reliance on in-memory order history for authoritative fulfillment state
- `src/app/checkout/success/page.tsx`
  - read persisted order data and fulfillment status
- Supabase migration
  - add fulfillment and shipping persistence fields

### Product Preview Metadata

- `src/app/api/products/route.ts`
  - include preview/sample metadata and expose `finished` preview coverage where appropriate
- `src/components/CatalogItem.tsx`
  - add buyer-preview coverage using shared preview metadata
- `src/components/ProductCustomizer.tsx`
  - ensure default data and API-driven products expose the buyer preview consistently
- `src/components/MerchPreviewPanel.tsx`
  - continue serving as the shared buyer-preview surface

## Risks And Guardrails

- Stripe shipping collection must be configured carefully so fulfillment receives valid address data.
- Webhook idempotency must be enforced before Printify submission, not after.
- Existing success and order-history flows must not continue to depend on volatile in-memory order state.
- Printify fulfillment still depends on valid env configuration, shop access, template product IDs, and SKU mappings.

## Testing Strategy

- Add focused tests for checkout session creation with internal order metadata and Stripe collection settings.
- Add focused webhook tests for:
  - reading durable order data
  - loading shipping details from Stripe session data
  - preventing duplicate Printify submissions on retries
  - persisting Printify order IDs and status
- Add tests for product preview metadata appearing in remaining preview surfaces.
- Run targeted checkout/webhook/product preview tests and then a production build.

## Verification

- Confirm checkout creates a durable order before redirecting to Stripe.
- Confirm Stripe Checkout supplies buyer and shipping data used for fulfillment.
- Confirm webhook creates one Printify order per paid checkout.
- Confirm Printify order IDs and statuses are persisted durably.
- Confirm catalog and customize product previews receive the shared buyer-preview metadata.
- Confirm production build passes after the rebuild changes.
