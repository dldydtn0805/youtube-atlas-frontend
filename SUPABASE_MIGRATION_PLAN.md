# Supabase Full Migration Plan

## Goal

Retire the standalone Spring Boot and RDS runtime and run YouTube Atlas with:

- Vercel for the React frontend
- Supabase Auth for Google login and sessions
- Supabase Postgres for application and game data
- Supabase Realtime for chat and game updates
- Supabase Edge Functions for the existing `/api/**` contract and YouTube API access
- Supabase Cron for trending sync, game settlement, and retention cleanup

The existing database was deleted, so this migration starts with a fresh application database.

## Priorities

| Priority | Scope | Completion condition |
| --- | --- | --- |
| P0 | Auth, catalog, trending, comments, favorites, playback | Done: the frontend uses the Supabase API when no override URL is set |
| P0 | Game wallet, market, buy/sell, positions, leaderboard | Done: the main game loop is implemented with atomic database RPCs |
| P0 | Realtime comments and game invalidation | Done: Supabase Postgres changes and Presence replace STOMP |
| P0 | Scheduled trending sync and retention | Done: seven Cron jobs are active within the free-plan limits |
| P1 | Scheduled sell orders, notifications, tiers, titles | Done: Edge API and five-minute settlement job are deployed |
| P1 | Admin read/write operations | Done: `/admin` routes use service-role operations behind an admin allowlist |
| P2 | Historical season highlights and advanced settlement parity | Long-term game history matches the legacy Spring behavior |

## Compatibility strategy

The frontend keeps its current `/api/**` request and response shapes. A Supabase Edge Function named
`api` becomes the compatibility layer, so the migration does not require a page-by-page UI rewrite.

Authentication and realtime are the two deliberate exceptions:

- Google OAuth sessions are owned by Supabase Auth.
- STOMP subscriptions are replaced by Supabase Realtime channels and database changes.

## Free-plan safeguards

- Retain trending snapshots for 7 days instead of 30 days.
- Keep one active project and monitor the 500 MB database quota.
- Store only application state in Postgres; do not persist YouTube payloads that can be fetched again.
- Run one hourly trending job and one five-minute game-settlement job.
- Never expose the service-role key to Vite or Vercel client variables.

## Verification

1. Applied and linted both migrations on project `zmgstrqoxpmbzgjifjje`.
2. Enabled Google Auth, configured the production redirect, and registered the Supabase callback in Google Cloud.
3. Deployed `api`, `sync-trending`, and `settle-game`.
4. Configured function secrets, Vault, and seven active Cron jobs.
5. Verified the health-adjacent public API, YouTube catalog, trend sync, settlement, and snapshot-backed top chart.
6. Removed Vercel's retired API override and client-side YouTube key; retained the Supabase URL and anon key.
7. Passed all 377 frontend unit tests, ESLint with no errors, the production build, Deno type checks, remote database lint, and the deployed Edge API health check.
8. Verified the Vercel production UI and the Google OAuth redirect through to Google's account chooser.
