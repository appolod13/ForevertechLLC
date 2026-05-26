---
name: "stripe-docs"
description: "Pulls and summarizes authoritative guidance from Stripe docs. Invoke when user asks how to set up Stripe, webhooks, Checkout, keys, or events."
---

# Stripe Docs

Use this skill when the user asks questions that should be answered using Stripe’s official documentation (Checkout, webhooks, API keys, events, testing, live mode).

## What to Do

1. Identify the Stripe feature area:
   - Webhooks (endpoint setup, signing secrets, event selection, retries)
   - Checkout (sessions, line items, success/cancel URLs)
   - Keys (publishable vs secret, test vs live)
   - Events (checkout.session.completed, payment_intent.*)
   - Testing (CLI forwarding, test cards)

2. Retrieve authoritative documentation:
   - Prefer fetching the most relevant docs page(s) from `https://docs.stripe.com`.
   - If needed, use search to find the exact Stripe docs URL for the feature area, then fetch that page.

3. Answer in step-by-step form:
   - Provide a clear sequence of UI clicks in the Stripe Dashboard when relevant.
   - Specify the exact URL and required events for webhooks.
   - Call out test vs live mode differences.
   - Include any required environment variables and where they belong.

4. Keep it safe:
   - Never ask the user to paste secret keys into chat.
   - Tell the user to set secrets in their hosting provider environment settings.

## Quick Reference

- Webhooks overview: Stripe Dashboard → Developers → Webhooks → Add endpoint
- Webhook signing secret: endpoint details → “Signing secret” → Reveal → `whsec_...`
- Test vs Live: Stripe Dashboard mode toggle; secrets are different per mode

