# Discord Connected Status Design

## Goal

Make the app show Discord as connected whenever the logged-in user already has a saved Discord webhook, so Studio status matches the real posting behavior.

## Approved Direction

- Keep Discord connection state backed by the existing `user_social_destinations` row for the current user.
- Update Studio status loading so it requests session data with the current `userId` instead of relying on a user-less session fetch.
- Keep Profile status behavior aligned with the same per-user Discord webhook lookup.
- Add focused tests around the session/status path so Discord does not regress back to a false disconnected state.

## Problem Summary

Discord webhook saving and Discord posting already work with per-user webhook storage, but the Studio page fetches `/api/auth/session` without a `userId`.

That creates a mismatch:

- Profile can display the saved webhook because it calls `/api/social/discord?userId=...`.
- Posting can send to Discord because `/api/post` loads the webhook for the submitted `userId`.
- Studio can still show Discord as disconnected because `/api/auth/session` only marks Discord connected when a `userId` is provided.

## Data Flow

1. Studio hydrates and reads the logged-in user from local storage.
2. Studio requests `/api/auth/session?userId=<current-user-id>`.
3. `/api/auth/session` checks `user_social_destinations` for the user's Discord webhook.
4. The session payload returns `discord.authenticated = true` when the webhook exists.
5. Studio renders the connected badge and poster state consistently with the actual saved webhook.

## Scope

Update:

- `src/app/studio/page.tsx`
- `src/app/api/auth/session/route.ts`
- related tests that cover Discord connection state in Studio and auth session responses

Do not change:

- Discord webhook save or delete behavior in `/api/social/discord`
- Discord posting behavior in `/api/post`
- the underlying Supabase table shape

## Testing

- Add or update a session route test proving Discord is connected when `userId` is supplied and a webhook row exists.
- Add or update a Studio test proving the page requests session status with `userId` and can render Discord as connected.
- Keep the Discord posting tests unchanged unless the refactor requires small expectation updates.
