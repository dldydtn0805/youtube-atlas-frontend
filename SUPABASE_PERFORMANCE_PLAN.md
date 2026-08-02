# Supabase Performance Plan

## Goal

첫 화면과 순위 갱신이 느려 유료 전환을 방해하는 구간을 먼저 줄인다. 기능 범위는 홈 초기 로딩, 게임 초기 로딩, 순위 동기화 Realtime, Edge Function과 데이터베이스 간 왕복으로 제한한다.

## Measured baseline

- Supabase 프로젝트와 데이터베이스 리전은 Tokyo(`ap-northeast-1`)인데 자동 Edge 실행은 Seoul로 라우팅되는 표본이 있었다.
- 공개 홈은 카테고리, TOP, 음악, 급상승, 상승, 신규, 게임 마켓을 별도 요청으로 시작했다.
- 로그인 홈은 인증·프로필·활성 시즌·설정과 게임 데이터를 여러 Edge 요청에서 반복 조회했다.
- 한 번의 순위 동기화가 `video_trend_signals`의 행별 Realtime 변경을 발생시켜 활성 게임 쿼리를 반복 무효화했다.
- `video_trend_snapshots`가 데이터베이스에서 가장 큰 테이블이며 autovacuum 임계값을 더 촘촘하게 관리할 필요가 있었다.

## Priority and status

| Priority | Item | Status | Success signal |
| --- | --- | --- | --- |
| P0 | 공개 홈 부트스트랩 | Done | 초기 공개 데이터가 `/api/home/bootstrap` 한 요청으로 전달되고 기존 React Query 캐시를 채움 |
| P0 | 로그인 게임 부트스트랩 | Done | 인증과 공통 게임 컨텍스트를 한 요청 안에서 공유하고 초기 게임 캐시를 한 번에 채움 |
| P0 | Realtime fan-out 제거 | Done | 신호 행별 이벤트 대신 동기화 실행의 `completed_at` UPDATE 한 건만 발행 |
| P0 | Tokyo 리전 고정 | Done | 브라우저 API와 KR/US/JP 동기화·정산 Cron이 `ap-northeast-1` 호출을 사용 |
| P0 | 요청 단위 중복 조회 제거 | Done | 인증, 시즌, 게임 설정, 가격 앵커, 티어 조회 Promise를 요청 안에서 재사용 |
| P0 | 안전한 DB 유지보수 | Done | 큰 추세 테이블의 vacuum/analyze scale factor를 낮추고 파괴적인 재작성은 하지 않음 |
| P1 | 로그인 사용자의 운영 부트스트랩 계측 | Planned | 실제 로그인 세션에서 초기 game bootstrap 시간과 후속 중복 요청이 0인지 확인 |
| P1 | Edge cold start 추적 | Planned | `Server-Timing`과 함수 로그로 국가별 p50/p95를 수집하고 5초 이상 cold sample 원인을 구분 |
| P1 | 스냅샷 보관량 재측정 | Planned | 7일 보관 작업 이후 테이블 크기와 dead tuple을 재측정하고 필요한 경우 온라인 정비 결정 |
| P2 | 유료 플랜 SLO 대시보드 | Planned | 유료 전환 전 홈 p95, 오류율, 동기화 지연을 한 화면에서 확인 |

## Release verification

- Migration `20260802040000` applied with remote migration parity and zero database lint errors.
- Supabase API v31 and `sync-trending` v2 are active.
- A production KR Cron run created run `11032` and updated `completed_at` after its signal writes completed.
- KR/US/JP public bootstrap responses returned HTTP 200 from Tokyo; warm samples were approximately 0.25–0.41 seconds.
- Production rendered 50 real TOP rows at 1280px with no horizontal overflow, visible error, console warning, or console error.
- The available production browser was anonymous, so authenticated runtime measurement remains P1; authenticated hydration and cache keys are covered by regression tests.

## Guardrails

- Do not drop indexes or run `VACUUM FULL` from an application migration without a separate maintenance window and fresh evidence.
- Do not expose service-role or Cron secrets to the browser or Vercel client variables.
- Keep the existing API response contracts and fall back to the individual queries when a bootstrap request fails.
- Preserve all three supported market subscriptions—KR, US, and JP—while coalescing each completed sync to one refresh event.
