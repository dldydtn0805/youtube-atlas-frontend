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

| Priority | Scope                                                       | Completion condition                                                                                                                                                                                                       |
| -------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Auth, catalog, trending, comments, playback                 | Done: the frontend uses the Supabase API when no override URL is set                                                                                                                                                       |
| P0       | Game wallet, market, buy/sell, positions, leaderboard       | Done: the main game loop is implemented with atomic database RPCs                                                                                                                                                          |
| P0       | Realtime comments and game invalidation                     | Done: Supabase Postgres changes and Presence replace STOMP                                                                                                                                                                 |
| P0       | Scheduled trending sync and retention                       | Done: seven Cron jobs are active within the free-plan limits                                                                                                                                                               |
| P1       | Scheduled sell orders, notifications, tiers, titles         | Done: Edge API and five-minute settlement job are deployed                                                                                                                                                                 |
| P1       | Admin read/write operations                                 | Done: `/admin` routes use service-role operations behind an admin allowlist                                                                                                                                                |
| P1       | Admin-editable game price anchors                           | Done: database-backed anchors feed market, trade, valuation, and settlement prices, with admin-only editing deployed to production                                                                                         |
| P1       | Trend-sync demand pricing                                   | Done: buys atomically count demand, current prices gain a capped sync-scoped premium, and new wallets start with 100,000P                                                                                                  |
| P1       | One active position per user and video                      | Done: users may own multiple videos, but an owned video cannot be bought again until its position is fully sold                                                                                                            |
| P1       | Fixed one-unit buy orders                                   | Done: the buy sheet has no quantity selector, and both API and database RPCs accept exactly one unit per new video position                                                                                                |
| P1       | Asset-point tiers and admin thresholds                      | Done: tiers use live total assets instead of highlights, and active-season thresholds are editable from the admin page                                                                                                     |
| P1       | Trend-sync sell discounts and sell lock                     | Done: sells add capped sync-scoped discounts, and current-sync purchases cannot be sold until the next main-chart sync                                                                                                     |
| P1       | Fixed full-position sells and reliable buyable chart        | Done: each owned video is one unit sold only in full, while the buyable chart loads independently and returns the correct filtered videos                                                                                  |
| P1       | Sync-ranked category charts                                 | Done: music and detail categories are filtered from the synced TOP 200 and preserve each video's synced overall rank                                                                                                       |
| P1       | Net-order count pricing and lean sell sheet                 | Done: rank movement no longer changes price, net buy/sell counts drive premium or sale, and sell orders omit quantity and highlight-score explanations                                                                     |
| P1       | Current rule guides                                         | Done: the initial popup and manual guide share the current game rules                                                                                                                                                      |
| P1       | Video-list rank movement placement                          | Done: every video card places its rank-change badge immediately after the rank on desktop and mobile layouts                                                                                                               |
| P1       | YouTube music playlist export                               | Removed from the music video list by product direction                                                                                                                                                                     |
| P1       | YouTube account like action                                 | Done: the selected-video action reads and toggles the signed-in account's real YouTube rating, and videos already loaded in `좋아요` activate immediately so the first click cancels the rating without a duplicate lookup |
| P1       | YouTube liked-video chart                                   | Done: channel favorites are removed, the `좋아요` chart reads the signed-in account's real liked videos, and resolved videos outside the synced TOP 200 display as chart out                                               |
| P1       | Four calendar seasons and three-month tier curve            | Done: game seasons use spring, summer, autumn, and winter three-month UTC windows, while tier profit requirements are tripled from the 100,000P starting asset baseline                                                    |
| P1       | Single-name home branding                                   | Done: the two-line YouTube Atlas and the rank game header is replaced by the single The Rank Game brand with matching accessible navigation text                                                                           |
| P1       | One-tap home country filter                                 | Done: the video-list filter switches immediately among Korea, the United States, and Japan without opening the country modal                                                                                               |
| P1       | Client-side page routing                                    | Done: React Router owns `/` and `/admin/*`, internal home navigation avoids document reloads, and unknown paths return to the home route                                                                                     |
| P2       | Historical season highlights and advanced settlement parity | Long-term game history matches the legacy Spring behavior                                                                                                                                                                  |

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
9. Deployed admin-editable game price anchors, verified the production market API reads the seeded anchors, and published the admin editor to Vercel.
10. Applied the `balanced-v1` anchor curve to production and verified sampled ranks from 1st through 170th against the live market API.
11. Replaced it with the cleaner `pretty-million-v1` curve led by a 1,000,000P first-rank anchor and verified the live API after redeployment.
12. Deployed sync-scoped demand pricing and a 100,000P starting balance, then verified the live market exposes demand count, quantity, delta, and adjusted price fields.
13. Enforced one active position per user and video at the database and API layers, deployed API v11, and published the owned-video disabled state to Vercel.
14. Removed buy quantity selection, enforced exactly one-unit buys in API v12 and migration `20260731026000`, and published the fixed-order UI to Vercel.
15. Replaced highlight-based tiers with live total-asset tiers, deployed API v13 and migration `20260731027000`, added an active-season threshold editor, and verified the production tier rows and protected routes.
16. Deployed current-sync sell counts and discounts, database-enforced next-sync sell locks, and realtime market refreshes through migration `20260731028000`, API v14, settlement v9, and the recreated active `sync-trending` function.
17. Deployed migration `20260731029000`, API v15, and Vercel deployment `dpl_FJoiqjXcnBaxMETSisvYQ3sSrD1S` for one-unit full-position sells, inventory/sell-sheet cleanup, and reliable buyable/favorite chart loading and filtering.
18. Deployed API v16 so music and every detail category filter the synced TOP 200 by YouTube category while preserving the original trend-sync rank; verified the live KR category results against all synced chart rows.
19. Deployed API v17, settlement v10, and Vercel deployment `dpl_Bm5zrWtXUvgARohsFCgVrDM14mwk` for net buy/sell count pricing and the quantity-free, highlight-explanation-free sell order sheet; verified every live KR market row against the formula.
20. Deployed API v18 and Vercel deployment `dpl_9iYRPF6h67o3gQGv9tayQ1pgbdxC` for the shared four-step current-rule guide and sync-ranked favorite videos; verified 402 tests, the production build, the live popup layout and console, and a targeted 142nd-rank signal lookup.
21. Deployed the YouTube account-like slice with `videos.getRating`/`videos.rate`, contextual OAuth recovery, API v20, and Vercel deployment `dpl_Hp6DbiedjDpERMpHrKbzFkpxSc2K`; verified 428 tests, the production build, Deno checks, the protected live route, real async TOP 200 rendering, anonymous button state, desktop/mobile layout, a clean browser console, and the Google account-chooser redirect. A real signed-in rating mutation was intentionally not executed during deployment verification.
22. Replaced channel favorites with the YouTube account's `videos.list?myRating=like` chart, removed the channel-favorite UI/API/admin contract, and added migration `20260801020000` to drop `favorite_streamers`; verified 438 tests, the production build, ESLint with no errors, and Deno checks before deployment.
23. Corrected liked-video rank fallback so resolved TOP 200 misses display as chart out, renamed the personal chart to `좋아요`, and limited successful YouTube rating status messages to one second; verified 439 tests, the production build, ESLint with no errors, and Deno checks before deployment.
24. Reused the loaded `좋아요` list as the selected video's immediate rating state, skipped its duplicate rating lookup, and made the first action cancel the existing YouTube like; verified 440 tests before deployment.
25. Added direct Korea, United States, and Japan buttons to the video-list filter so chart region changes no longer require entering the country modal; verified 442 tests, the production build, ESLint with no errors, desktop/mobile one-click region state updates, and live asynchronous TOP 200 rows for all three countries before deployment.
26. Replaced manual pathname state with React Router routes for the home and admin pages, kept admin subpaths reloadable, converted internal home links to client-side navigation, and redirected unknown paths to home; verified 445 tests, the production build, ESLint with no errors, and direct-route, link, back-button, fallback-route, and console behavior in the browser.
