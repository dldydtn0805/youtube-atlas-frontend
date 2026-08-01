# Change Log

## 2026-08-02

- Rebuilt the `The Rank Game` home title from the supplied pixel-art sidearm reference, lengthening the metal barrel and using the sidearm itself as the visual `T` before `HE / RANK / GAME`; preserved responsive sizing and accessible naming, and verified with 459 tests, a production build, ESLint with no errors, and desktop/mobile browser checks across light and dark themes.
- Replaced the country and category controls above the video player with a single `Now Playing` heading on desktop and mobile; verified with 455 tests, a production build, ESLint with no errors, and desktop/mobile browser checks.
- Included complete YouTube account authorization in the initial Google login so liked-video loading and YouTube like actions no longer require a separate connection step; verified with 456 tests, a production build, and ESLint with no errors.
- Fixed Google and YouTube OAuth callbacks to return to the current canonical page instead of the root, preventing the router from clearing Supabase's callback session before login restoration; verified with 457 tests, a production build, and ESLint with no errors.
- Removed the empty `#` left in the browser URL after Supabase finishes restoring a Google OAuth session while preserving unprocessed callback hashes; verified with 459 tests, a production build, and ESLint with no errors.

## 2026-08-01

- Added URL-addressable nation and chart routes such as `/kr/top`, `/us/music`, and `/jp/surging`; country and category controls now update browser history, back navigation restores both selections, root and invalid paths resolve to the stored country's TOP route, and pending YouTube liked-view OAuth returns resolve to the liked route. Verified with 453 tests, a production build, ESLint with no errors, and browser checks for country/category navigation and back-state restoration.
- Replaced manual pathname state with React Router routes for `/` and `/admin/*`, converted internal home links to client-side navigation, and added an unknown-route redirect to the home page; verified with 445 tests, a production build, ESLint with no errors, and browser checks for direct admin loading, internal navigation, back navigation, and unknown routes.
- Removed the YouTube playlist creation action from the music video list; verified with 442 tests, a production build, and ESLint with no errors.
- Added one-tap `한국`, `미국`, and `일본` country buttons directly to the video-list filter, replacing the extra modal step for normal chart switching; verified with 442 tests, a production build, ESLint with no errors, desktop/mobile browser checks, and live asynchronous TOP 200 data for all three countries.
- Made videos already present in the loaded YouTube liked list render with an active like action immediately, so the first click cancels the YouTube like without waiting for a duplicate rating lookup.
- Fixed liked videos outside the synced TOP 200 so they display `차트 아웃` instead of inheriting their row position as a false rank, including removal of top-three styling from chart-out rows.
- Renamed the personal chart UI from `좋아요 영상` to `좋아요`, and made successful YouTube like/unlike status messages clear automatically after one second.
- Verified the chart-out, label, and status-timer changes with 439 tests, a production build, ESLint with no errors, and Deno checks for the Edge API.
- Replaced channel favorites with the signed-in YouTube account's real liked-video list, including pagination, contextual OAuth recovery, and live list invalidation after a like or unlike.
- Removed the channel star action, favorite-streamer API and frontend feature, favorite admin metrics, and the `favorite_streamers` table through migration `20260801020000`.
- Verified the liked-video change with 438 tests, a production build, ESLint with no errors, and Deno checks for the Supabase Edge API.
- Simplified the two-line home header brand from `YouTube Atlas / the rank game` to the single name `The Rank Game`, including its accessible home-link label and responsive styles.
- Replaced the ambiguous numbered game-season label with spring, summer, autumn, and winter seasons using fixed three-month calendar windows.
- Renamed and extended the active season to its current calendar-season boundary, and made newly created seasons use the same boundaries.
- Tripled each tier's required asset gain above the 100,000P starting baseline for the longer season: Silver 160,000P, Gold 250,000P, Platinum 400,000P, Diamond 700,000P, Master 1,300,000P, and Legend 2,800,000P.
- Added a selected-video 좋아요 action that reads and toggles the signed-in user's real YouTube account rating instead of storing an app-only favorite.
- Reused contextual YouTube OAuth, kept the short-lived Google token out of persisted app state, and automatically resumes a pending like after the permission redirect.
- Added Edge API error mapping and focused tests for rating reads, writes, OAuth recovery, button states, and the responsive action layout.
- Deployed API v20 and Vercel production deployment `dpl_Hp6DbiedjDpERMpHrKbzFkpxSc2K`; verified the protected live rating route, async TOP 200 rendering, anonymous button state, mobile layout, clean browser console, and Google account-chooser redirect without changing a real account rating.
- Moved each video card's rank-change badge directly beside its rank so the two related signals can be scanned together.
- Moved the ranking table's existing trend column from the far right to a separate column immediately after rank.
- Centered the trend header and values between the rank and video columns for consistent table alignment.
- Added a one-click music-chart export that requests YouTube permission only when needed, creates a new private playlist from the current TOP 20, reports partial failures, and links to the finished playlist.
- Kept the Google provider token out of the app's custom persisted session and limited the export API to the current synced music chart.
- Aligned the Supabase OAuth site URL and redirect allowlist with the live `trg.life` domain so playlist authorization returns to the same browser origin.

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
- Verified 377 frontend tests, ESLint, the production build, Deno type checks, remote database lint, and the deployed Edge API health endpoint.
- Added a top-level runtime error boundary so a production render failure shows a recoverable diagnostic instead of a blank screen.
- Verified the Vercel production UI renders the Supabase-backed TOP 200 chart, video player, and realtime chat shell.
- Verified the production Google OAuth flow reaches Google's account chooser without a redirect URI mismatch.
- Fixed the Edge API's YouTube comment-highlight contract and added a frontend fallback so async highlight data cannot crash the production UI.
- Verified the deployed comment-highlight endpoint returns the complete frontend contract for a live YouTube video.
- Added database-backed rank price anchors with admin-only read/write endpoints and strict monotonic price validation.
- Added an admin price-anchor editor whose changes feed market display, buys, valuations, immediate sells, chart-out pricing, and scheduled-sell settlement from one shared configuration.
- Verified the price-anchor change with 382 frontend tests, ESLint, a production build, and Deno checks for the API and settlement Edge Functions.
- Deployed both price-anchor migrations, API Edge Function version 7, settlement Edge Function version 5, and Vercel production deployment `dpl_CKrBrn13jyChPaPK9b47FCeNJNBL`.
- Corrected the new table grant so only the Edge Function service role can read and update anchors while browser roles remain blocked, then verified the production market API returns the configured 1st-rank price.
- Rebalanced the production price curve to `balanced-v1`, raising the 200th-rank floor from 3,000P to 50,000P and smoothing the path through 100th rank at 200,000P and 50th rank at 480,000P.
- Deployed migration `20260731022000`, API Edge Function version 8, and settlement Edge Function version 6, then verified the KR production market returns the new base prices at sampled anchor ranks.
- Refined the live curve to `pretty-million-v1`: 1st rank now starts at 1,000,000P, the top five descend in clean steps to 750,000P, and the curve reaches 40,000P at 200th rank.
- Deployed migration `20260731023000`, API Edge Function version 9, and settlement Edge Function version 7, then verified sampled production ranks use the new curve.
- Added sync-scoped demand pricing: each successful buy atomically increases the video's buy count and quantity, adds 1% market premium per unit up to 30%, and resets demand on the next trend sync.
- Changed the active-season starting balance and future season default to 100,000P without rewriting balances for wallets that already exist.
- Deployed migration `20260731024000`, API v10, trend sync v12, settlement v8, and Vercel deployment `dpl_CfriU8BoUYDgaokzC1YmoCFDvxE1`; verified 385 tests, production build, Deno checks, and the live demand-price response.
- Limited each user to one active position per video while preserving multi-video portfolios; database-level locking blocks concurrent duplicate buys, and owned videos now show a disabled `보유 중` action until fully sold.
- Deployed migration `20260731025000`, API v11, and Vercel deployment `dpl_G87d2gTi6o6s9J2NNb3HenRJfTRK`; verified 387 tests, production build, Deno checks, and the live market and frontend endpoints.
- Fixed video buys to exactly one unit: removed buy-quantity controls from the order sheet and added matching API and database validation so modified clients cannot submit larger buys.
- Deployed migration `20260731026000`, API v12, and Vercel deployment `dpl_8JWb3bezBGmJe8mC44bvNkmdZZkT`; verified 387 tests, production build, Deno checks, and live API/frontend availability.
- Changed season tiers from highlight-score progression to total asset points: available balance, reserved points, and the live evaluation value of open video positions now determine the current tier.
- Added an admin tier-threshold editor backed by per-season database rows; Bronze remains fixed at 0P and every higher threshold must strictly increase.
- Set the initial asset-tier curve to Bronze 0P, Silver 120,000P, Gold 150,000P, Platinum 200,000P, Diamond 300,000P, Master 500,000P, and Legend 1,000,000P.
- Deployed migration `20260731027000`, API v13, and Vercel deployment `dpl_HCLNCYHhtL9uf4nAEg7ucHArHajW`; verified 392 tests, ESLint with no errors, production build, Deno checks, live tier rows, protected tier routes, and frontend availability.
- Added sync-scoped sell pressure: each completed sell counts its order and quantity, applies a 1% market discount per net sold unit up to 30%, and resets on the next trend sync alongside buy demand.
- Locked positions bought in the current trend sync from immediate, scheduled, and automatic selling until a newer main-chart sync is available; the database RPC remains the final enforcement layer.
- Added live market-signal invalidation so buy premiums, sell discounts, and next-sync sell unlocks refresh active game queries through Supabase Realtime.
- Deployed migration `20260731028000`, API v14, settlement v9, and Vercel deployment `dpl_F7ZD2XjGd6MunoAUeUgLkQFhkXs8`; replaced the conflicted `sync-trending` deployment under the same slug as active v1 without deleting database data or changing its Cron URL.
- Verified 399 tests, ESLint with no errors, production build, all Edge Function Deno checks, live buy/sell counter columns, the public market response, scheduler authentication protection, and frontend availability.
- Fixed sells to the full one-unit video position: the sell sheet no longer exposes quantity controls, API and database layers reject partial sells, and legacy multi-unit positions return excess stake points to the wallet when normalized.
- Removed inventory buy actions and all projected tier-score displays from inventory and sell-order summaries.
- Fixed dedicated buyable and favorite chart views so category selection and unrelated TOP 200 loading/error state cannot hide their lists; the buyable API now returns only affordable, unowned videos under a stable section id, and favorite lookup scans the complete TOP 200 window.
- Deployed migration `20260731029000`, API v15, and Vercel production deployment `dpl_FJoiqjXcnBaxMETSisvYQ3sSrD1S`; verified 398 tests, ESLint with no errors, production build, remote database lint, API health and market responses, protected personal routes, and the public production UI.
- Changed music and detail-category charts to filter the latest synced TOP 200 by `video_category_id`; every category now keeps the original trend-sync `current_rank` instead of using a separate YouTube category chart or locally renumbering results.
- Deployed API v16 and verified 401 tests, ESLint with no errors, the production build, and live KR music, gaming, and entertainment responses against the complete synced chart.
- Removed rank-change premiums and discounts from game prices; the only sync-scoped adjustment is now 1% per net buy or sell count, capped at ±30%, with equal counts returning the rank-anchor base price.
- Simplified the sell order sheet by removing its fixed/available quantity section, quantity summary rows, and the obsolete highlight-score explanation.
- Deployed API v17, settlement v10, and Vercel production deployment `dpl_Bm5zrWtXUvgARohsFCgVrDM14mwk`; verified 401 tests, ESLint with no errors, the production build, all live KR market prices against the net-count formula, and rank movers with equal counts remaining at base price.
- Rebuilt the first-visit ranking-game popup and the manual guide from one shared four-step rule source covering the 100,000P start, one position per video, rank-anchor and net-order pricing, next-sync full-position selling, and total-asset tiers.
- Versioned the first-visit dismissal key so returning users see the updated rules once, and replaced remaining user-facing tier-score, quantity-selection, and partial-sell wording with total-asset, highlight-record, and full-position terminology.
- Changed favorite videos to come directly from the same synced TOP 200 rows as the main chart, preserving each original rank and inline trend data; fixed targeted signal lookup so lower-ranked favorite videos are filtered in the database before the result limit is applied.
- Deployed API v18 and Vercel production deployment `dpl_9iYRPF6h67o3gQGv9tayQ1pgbdxC`; verified 402 tests, ESLint with no errors, the production build, the complete four-step live popup with no layout overflow or console errors, and a live targeted lookup that retained a synced 142nd-rank video as rank 142.
