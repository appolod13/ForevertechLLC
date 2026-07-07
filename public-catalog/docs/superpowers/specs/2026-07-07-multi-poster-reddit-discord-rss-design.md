# Multi-Poster Reddit Discord RSS Design

## Goal

Extend the existing Multi-Channel Poster so users can post to Reddit, Discord, and an RSS feed from the same Studio workflow, while deferring Blogger for a later phase.

## Approved Direction

- Use the practical first slice:
  - wire the existing Reddit posting backend into the UI
  - add Discord posting through a per-user webhook
  - add a public RSS feed generated from successful poster submissions
  - defer Blogger
- Allow users to manage the Discord webhook in both:
  - the Studio poster panel
  - Account Settings
- Keep the current Studio poster flow as the main entry point.

## Scope

- Add `reddit`, `discord`, and `rss` to the connected-platform model used by the Multi-Channel Poster.
- Expose Reddit in the Studio UI and submit it through the existing `/api/post` flow.
- Add per-user Discord webhook save, validate, load, and remove behavior.
- Add RSS post persistence and a public RSS endpoint.
- Add Account Settings UI for Discord webhook management.
- Keep Blogger out of this implementation slice.

## Non-Goals

- No Blogger API or Blogger UI in this slice.
- No Discord OAuth flow.
- No redesign of the Studio generation or poster layouts beyond the new connection controls.
- No migration of Reddit tokens away from the current cookie-based approach in this slice.
- No per-platform scheduling differences; scheduling continues to use the existing poster behavior.

## Architecture

### Existing Poster Flow

- Keep Studio as the main poster entry point in `src/app/studio/page.tsx`.
- Keep `/api/post` as the single backend route that fans out to the selected destinations.
- Reuse the current social session endpoint pattern in `src/app/api/auth/session/route.ts`.

### Platform Model

- `reddit`
  - becomes a first-class Studio platform option
  - uses the existing backend posting logic already present in `/api/post`
  - uses the same session/auth reporting model as the current OAuth platforms
- `discord`
  - is considered connected when the current user has a valid saved webhook URL
  - posts through a server-side Discord webhook sender
  - does not require OAuth
- `rss`
  - is treated as an available publishing destination rather than a user-authenticated social account
  - becomes active when RSS persistence and feed generation are enabled
  - writes successful poster submissions to a feed table

## UX Design

### Studio Poster Panel

- Add platform chips or connect controls for:
  - Reddit
  - Discord
  - RSS
- Reddit should appear beside the existing poster platforms and follow the same "connected / not connected" status behavior.
- Discord should support:
  - connect from Studio
  - edit existing webhook
  - disconnect/remove webhook
  - a lightweight validation message when the webhook format or test request fails
- RSS should show:
  - enabled/available state
  - a visible feed URL or `Open RSS feed` link when available

### Account Settings

- Add a Discord management section in Account Settings.
- The settings section should support:
  - save webhook
  - replace webhook
  - remove webhook
  - optional test action that sends a lightweight validation request or checks webhook acceptance without posting full campaign content
- Studio and Account Settings should read and write the same stored Discord destination record.

### Poster Submission UX

- Poster submission should continue to gather all selected destinations and submit once.
- The result should remain one combined submission status, but the backend response must include per-platform results so the UI can explain partial success.
- RSS insertion failure should surface as a partial failure rather than hiding successful external posts.

## Data Model

### User Social Destinations

Add a user-owned table for non-OAuth destinations, for example `user_social_destinations`, with fields equivalent to:

- `id`
- `user_id`
- `platform`
- `webhook_url`
- `created_at`
- `updated_at`

Constraints:

- one active record per `user_id + platform`
- this slice only stores `platform = 'discord'`

Behavior:

- the webhook should be stored server-side only
- the UI should never expose the full saved webhook after initial save
- reads should return connection state and redacted display metadata only

### Poster Posts Feed

Add a `poster_posts` table for RSS generation, with fields equivalent to:

- `id`
- `user_id`
- `content`
- `media_url`
- `platforms`
- `created_at`
- optional `title`
- optional `canonical_url`

Behavior:

- insert a row after a successful poster submission when RSS is selected
- store enough information to generate a meaningful RSS `<item>`
- feed rows should be ordered by newest first

## API Design

### Session Endpoint

Extend `src/app/api/auth/session/route.ts` to include:

- `reddit`
- `discord`
- `rss`

Rules:

- `reddit.authenticated` is true when the current Reddit token/session is present
- `discord.authenticated` is true when the current user has a saved Discord webhook destination
- `rss.authenticated` is true when RSS publishing is available in the current environment

### Discord Destination Routes

Add server routes for Discord destination management, for example under:

- `GET /api/social/discord`
- `POST /api/social/discord`
- `DELETE /api/social/discord`

Responsibilities:

- `GET`
  - returns whether the user has a Discord webhook connected
  - returns redacted metadata for display
- `POST`
  - validates the webhook URL shape
  - optionally performs a lightweight verification request
  - upserts the user destination record
- `DELETE`
  - removes the saved Discord destination

### Post Route

Extend `src/app/api/post/route.ts` to support:

- `discord`
  - send content and optional media URL to the saved webhook for the current user
- `rss`
  - insert into `poster_posts` after successful processing
- `reddit`
  - no new posting logic required, but the route should continue returning Reddit result data in the combined response

The `/api/post` response should explicitly include per-platform results so the Studio UI can show partial success instead of a single opaque error.

### RSS Feed Route

Add a public RSS endpoint, preferably:

- `/rss.xml`

The route should:

- return valid RSS 2.0 XML
- include the most recent `poster_posts`
- emit reasonable item fields:
  - title
  - description
  - pubDate
  - guid
  - enclosure when an image URL exists

## Data Flow

### Reddit

- User connects Reddit through the existing OAuth flow.
- Session endpoint reports Reddit as connected.
- Studio includes `reddit` when selected.
- `/api/post` executes the existing Reddit publisher and returns the Reddit result.

### Discord

- User saves a Discord webhook in Studio or Account Settings.
- The webhook is stored in `user_social_destinations`.
- Session endpoint reports Discord as connected.
- Studio includes `discord` when selected.
- `/api/post` loads the current user's webhook and sends the message payload to Discord.

### RSS

- User selects RSS in the poster panel.
- `/api/post` writes a `poster_posts` row after successful processing.
- `/rss.xml` renders the latest rows into a feed.
- Studio and Account Settings can show the feed link.

## Error Handling

- Discord webhook save
  - reject invalid URL formats
  - reject webhook save when the verification request fails
  - return a user-friendly reason
- Poster submission
  - continue returning per-platform success and failure data
  - do not mask external posting success because RSS persistence failed
- RSS endpoint
  - return valid XML even when the feed is empty
  - avoid leaking internal database errors in the public response

## Security And Guardrails

- Treat Discord webhooks as sensitive secrets.
- Never return the full webhook URL to the client after save.
- Restrict Discord destination reads and writes to the owning user.
- Use RLS policies for `user_social_destinations`.
- Only expose public-safe fields from `poster_posts` through the RSS feed.
- Keep Blogger entirely out of this slice so scope stays focused.

## Files Expected To Change

- `src/app/studio/page.tsx`
- `src/app/studio/page.test.tsx`
- `src/app/api/post/route.ts`
- `src/app/api/auth/session/route.ts`
- new Discord destination route(s) under `src/app/api/`
- new RSS route such as `src/app/rss.xml/route.ts` or equivalent
- Account Settings page/component files
- Supabase migration(s) for:
  - `user_social_destinations`
  - `poster_posts`

## Testing Strategy

- Studio tests
  - verify Reddit, Discord, and RSS appear in the poster platform list
  - verify Discord connected state is shown when present
- Discord route tests
  - save webhook
  - reject malformed webhook
  - remove webhook
- Post route tests
  - return per-platform results for Reddit, Discord, and RSS
  - preserve partial success behavior
- RSS route tests
  - generate valid XML
  - include expected item fields
  - return an empty but valid feed when no rows exist

## Risks

- Reddit is already implemented server-side but not surfaced in the UI, so the main risk is mismatched session/UI assumptions.
- Per-user Discord storage introduces a new secret-management path and requires careful redaction.
- RSS requires durable storage; environments without database configuration should fail clearly instead of silently pretending RSS is available.
- Account Settings additions can sprawl if they turn into a broader social-connections rewrite; this slice should stay Discord-only in settings.

## Verification

- Confirm Reddit appears as a selectable platform in Studio and submits through `/api/post`.
- Confirm a user can save a Discord webhook in Studio and see the same connection state in Account Settings.
- Confirm a user can update or remove that Discord webhook from either surface.
- Confirm Discord posts succeed through the saved per-user webhook.
- Confirm RSS feed rows are created from poster submissions and the public RSS endpoint renders them.
- Confirm Blogger does not appear as an implemented platform in this slice.
