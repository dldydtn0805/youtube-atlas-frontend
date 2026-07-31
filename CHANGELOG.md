# Change Log

## 2026-07-31

- Started the full migration from the deleted Spring Boot and RDS deployment to Supabase.
- Chose an API-compatible Edge Function so the existing Vercel UI can migrate without a broad component rewrite.
- Set the free-plan trending retention target to 7 days.
- Added Supabase Auth profiles, favorites, playback, comments, trends, game, title, notification, and admin tables with RLS.
- Added atomic buy/sell RPCs and removed client-controlled buy pricing.
- Replaced Google GIS and STOMP with Supabase Auth and Realtime while preserving the frontend API interfaces.
- Deployed the database migrations and the `api`, `sync-trending`, and `settle-game` Edge Functions.
- Scheduled hourly trend syncs for KR, US, JP, BR, and ID, five-minute game settlement, and daily retention cleanup.
- Enabled Google OAuth, registered the Supabase callback, and configured the Vercel production redirect.
- Removed the retired Spring API URL and browser-side YouTube API key from Vercel.
- Preserved pre-migration comments and trend signals in local JSON backups under `/tmp`.
- Verified 374 frontend tests, ESLint, the production build, Deno type checks, remote database lint, and the deployed Edge API health endpoint.
- Added a top-level runtime error boundary so a production render failure shows a recoverable diagnostic instead of a blank screen.
