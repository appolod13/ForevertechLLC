# Reddit OAuth Persistence Design

## Goal

Replace the current mock-style Reddit login behavior with a real Reddit OAuth flow that:

- redirects Studio users to Reddit authorization,
- exchanges the callback code for real access and refresh tokens,
- stores Reddit session cookies used by `/api/auth/session` and `/api/post`,
- persists connected Reddit account metadata for later inspection and recovery,
- supports a live post verification after auth succeeds.

## Approved Direction

- Add dedicated Reddit login and callback routes under `src/app/api/auth/reddit/`.
- Update the generic platform login route so `reddit` redirects into the dedicated Reddit login route instead of the mock cookie path.
- Persist Reddit account metadata in a dedicated Supabase table instead of overloading `user_social_destinations`, which is Discord-webhook specific.
- Keep cookie-based session state as the immediate auth source for Studio badges and posting.

## Data Flow

1. Studio clicks `Sign in to Reddit`.
2. `/api/auth/[platform]/login` routes `reddit` to `/api/auth/reddit/login`.
3. Reddit login route creates state, stores a short-lived state cookie, and redirects to Reddit OAuth.
4. Reddit callback validates state, exchanges the code for access and refresh tokens, fetches the Reddit username, writes Reddit cookies, and persists account metadata.
5. `/api/auth/session` continues to derive connected state from Reddit cookies.
6. `/api/post` uses the real Reddit cookies to submit posts and refreshes access tokens when required.

## Persistence

Create a new table for connected social accounts with fields shaped for OAuth identities, not webhooks:

- `user_id`
- `platform`
- `account_id`
- `account_name`
- `access_token`
- `refresh_token`
- `scopes`
- `metadata`
- timestamps

This keeps Reddit token persistence isolated from Discord destination storage.

## Testing

- Add route tests for Reddit login redirect/state cookie behavior.
- Add route tests for Reddit callback token exchange, cookie writes, and persistence calls.
- Keep auth session tests validating that Reddit is connected when Reddit cookies exist.
- Run a live post verification after implementation to separate auth issues from subreddit-level rejection.
