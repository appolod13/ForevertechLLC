# Reddit Subreddit Field Design

## Goal

Allow the Studio Multi-Channel Poster to submit Reddit posts successfully by collecting a subreddit value in the UI and sending it through the existing `/api/post` request.

## Approved Direction

- Add a Reddit-only `Subreddit` field to the Multi-Channel Poster in `src/app/studio/page.tsx`.
- Prefill the field with `LivestreamFail`.
- Send the value as `metadata.redditSubreddit` in the existing poster request body.
- Keep the current server-side Reddit normalization and validation logic unchanged.

## Scope

- Add client state for the Reddit subreddit field.
- Render a visible subreddit input in the Studio poster area.
- Include the subreddit value in the `/api/post` payload metadata.
- Preserve support for plain subreddit names, `r/...`, and full Reddit subreddit URLs through the existing backend normalization logic.
- Add or update focused tests for the new field and request payload.

## Non-Goals

- No change to the Reddit OAuth flow.
- No change to the Reddit posting route behavior beyond using the metadata already supported by the backend.
- No automatic parsing of a subreddit from arbitrary Reddit post links in the post body.
- No redesign of the platform selector layout outside the minimal field addition.

## Current State

The backend Reddit posting flow already requires or accepts a subreddit through `metadata.redditSubreddit` in `src/app/api/post/route.ts`.

Current behavior:

- The Studio poster request only sends `metadata.mediaUrl`.
- Reddit posting fails when no subreddit is provided and no default environment value is configured.
- The route currently returns: `Reddit requires a subreddit (example: PixelQrypt). Add a subreddit and try again.`

## Proposed Change

### Studio UI

- Add a `Subreddit` text input near the posting controls in `src/app/studio/page.tsx`.
- Default the field to `LivestreamFail`.
- Keep the field editable so future posts can target a different subreddit without code changes.
- Keep the field lightweight and text-based rather than adding a new platform-specific settings panel.

### Request Payload

- Extend the existing poster submission payload to include:
  - `metadata.mediaUrl`
  - `metadata.redditSubreddit`
- Continue using the same `/api/post` endpoint and platform array.

### Backend Compatibility

- Reuse the existing `normalizeSubreddit()` logic in `src/app/api/post/route.ts`.
- Accept these user input forms without additional client parsing:
  - `LivestreamFail`
  - `r/LivestreamFail`
  - `https://www.reddit.com/r/LivestreamFail/`

## Data Flow

- User enters or keeps the default subreddit in the Studio poster form.
- User submits a post with `reddit` selected.
- The client includes `redditSubreddit` inside `metadata`.
- `/api/post` reads `metadata.redditSubreddit`.
- The backend normalizes the value and submits the Reddit post to the selected subreddit.

## Error Handling

- If the field is empty and no default server subreddit exists, preserve the current backend error.
- If the field contains a malformed value, rely on existing backend normalization and Reddit API failure handling.
- Do not block non-Reddit platform posting because the Reddit field exists in the form.

## Files Expected To Change

- `src/app/studio/page.tsx`
- `src/app/studio/page.test.tsx`

## Testing Strategy

- Verify the Studio poster renders a subreddit input with `LivestreamFail` as the default value.
- Verify poster submission includes `metadata.redditSubreddit`.
- Verify existing non-Reddit submission behavior still works.

## Acceptance Criteria

- A user can see and edit a Reddit subreddit field in the Studio poster UI.
- The default subreddit is `LivestreamFail`.
- Reddit poster submissions include `metadata.redditSubreddit`.
- Reddit posting no longer fails with the missing-subreddit error when using the default value.
