# YouTube Atlas

국가별 YouTube 인기 영상을 카테고리별로 탐색하고, 선택한 영상에 대해 실시간 익명 채팅을 할 수 있는 웹 애플리케이션입니다.
탐색, 재생, 실시간 참여를 한 화면에서 끊김 없이 이어지도록 설계했습니다.

배포 링크: [https://youtube-atlas.vercel.app/](https://youtube-atlas.vercel.app/)

## 프로젝트 소개

Spring Boot 백엔드가 YouTube Data API와 PostgreSQL 기반 채팅 데이터를 관리하고, 프론트는 Railway에 배포된 API와 WebSocket에 연결합니다.
단순 조회형 페이지가 아니라, 국가 선택부터 카테고리 탐색, 영상 재생, 실시간 대화까지 하나의 사용자 흐름으로 연결하는 데 집중했습니다.

## 핵심 요약

- 국가별 인기 영상을 카테고리 단위로 빠르게 탐색
- 선택한 영상을 즉시 재생하고 다음 영상으로 자연스럽게 전환
- 영상별 공개 채팅방에서 실시간 익명 대화 지원
- 반응형 레이아웃과 마지막 선택값 저장으로 사용성 강화

## 주요 기능

- 국가별 YouTube 카테고리별 인기 영상 조회
- 선택한 영상 즉시 재생
- 영상별 공개 실시간 익명 채팅
- Shorts 성격의 영상 필터링
- 채팅 5초 쿨다운 및 중복 메시지 방지
- 마지막 선택 국가 `localStorage` 저장
- 반응형 UI

## 기술 스택

- React 19
- TypeScript
- Vite
- TanStack Query
- Spring Boot API
- WebSocket
- PostgreSQL
- YouTube Data API v3
- Vitest
- Testing Library
- ESLint
- Vercel
- Railway

## 구현 포인트

- React Query의 `useQuery`, `useInfiniteQuery`로 로딩, 에러 처리, 캐싱, 추가 페이지 로딩을 관리했습니다.
- Railway 백엔드 API를 통해 국가별 카테고리, 인기 영상, 급상승 신호를 일관된 응답 형식으로 받아오도록 구성했습니다.
- 국가별 카테고리를 단순 나열하지 않고 상위 그룹으로 재구성해 탐색 난이도를 낮췄습니다.
- 백엔드 WebSocket 구독으로 영상별 공개 채팅방을 구성하고, 새 메시지를 즉시 반영했습니다.
- 로컬 스팸 방지와 백엔드 정책 검증을 함께 적용해 빠른 연속 전송과 중복 메시지를 제한했습니다.
- 모바일 탭 전환, 시네마틱 모드, 자동 스크롤 등 시청 흐름 중심의 UI를 구성했습니다.

## 프로젝트 구조

```text
src
├── app
│   ├── App.tsx              # 전체 화면 레이아웃 및 상태 관리
│   └── providers.tsx        # 앱 전역 provider 설정
├── components
│   ├── CommentSection       # 영상별 실시간 채팅 UI
│   ├── SearchBar            # 국가 선택 UI
│   ├── VideoList            # 인기 영상 목록 UI
│   └── VideoPlayer          # 선택한 영상 재생 iframe
├── constants
│   └── countryCodes.ts      # 지원 국가 코드 목록
├── features
│   ├── comments
│   │   ├── api.ts           # 채팅 메시지 HTTP 요청
│   │   ├── queries.ts       # 메시지 조회 및 WebSocket 구독
│   │   └── types.ts         # 메시지 타입 정의
│   ├── trending
│   │   ├── api.ts           # 급상승 신호 조회
│   │   ├── queries.ts       # 급상승 Query 훅
│   │   └── presentation.ts  # 배지 표시 규칙
│   └── youtube
│       ├── api.ts           # 백엔드 카탈로그 API 호출
│       ├── queries.ts       # React Query 훅
│       └── types.ts         # API 응답 타입 정의
├── lib
│   ├── api.ts               # Railway API / WebSocket URL 유틸
│   └── supabase.ts          # 과거 Supabase 연결 코드
├── styles
│   ├── app.css              # 앱 레이아웃 스타일
│   └── global.css           # 전역 스타일
├── main.tsx                 # 앱 엔트리 포인트
└── vite-env.d.ts
```

## 동작 방식

1. 사용자가 국가를 선택합니다.
2. `useVideoCategories(regionCode)`가 Railway 백엔드에서 국가별 카테고리를 불러오고 화면에 맞는 선택지를 구성합니다.
3. `usePopularVideosByCategory(regionCode, category)`가 해당 국가와 카테고리의 인기 영상을 요청합니다.
4. 카테고리별 목록에서 영상을 선택하면 재생 영역이 갱신됩니다.
5. 선택한 영상마다 독립된 공개 채팅방이 열립니다.
6. 새 메시지는 백엔드 WebSocket `/ws`를 통해 실시간으로 반영됩니다.
7. `useVideoTrendSignals(...)`가 현재 목록의 급상승 신호를 조회해 `NEW`, `+순위상승`, `조회수 증가` 배지를 계산합니다.
8. 마지막으로 선택한 국가는 브라우저 저장소에 유지됩니다.

## 환경 변수

프로젝트 실행 전 `.env.local` 또는 Vercel 환경 변수에 아래 값을 설정해야 합니다.

```bash
VITE_API_BASE_URL=https://your-backend.up.railway.app
```

프론트는 직접 YouTube API 키나 DB 연결 정보를 가지지 않고, Railway에 배포된 백엔드만 바라봅니다.

## 급상승 스냅샷

- 프론트는 Railway 백엔드의 `/api/trending/signals`를 읽어 `NEW`, `+순위상승`, `조회수 증가` 배지를 표시합니다.
- 데이터 수집은 백엔드의 `/api/trending/sync`와 스케줄러가 담당합니다.
- 첫 수집에서는 `NEW` 배지만 표시되고, 두 번째 수집부터 순위 변화와 조회수 증가가 계산됩니다.

예시 요청 본문:

```json
{
  "regionCode": "KR",
  "categoryId": "gaming",
  "categoryLabel": "게임",
  "sourceCategoryIds": ["20"]
}
```

병합 카테고리는 `sourceCategoryIds`에 여러 개를 넣으면 됩니다. 예를 들어 엔터테인먼트는 `["24", "23", "26"]`처럼 넘겨 현재 앱의 병합 기준과 맞출 수 있습니다.

자동 수집은 Railway 환경 변수로 설정합니다.

```bash
TRENDING_SCHEDULER_ENABLED=true
TRENDING_SYNC_CRON=0 0/30 * * * *
ATLAS_TRENDING_JOBS_0_REGION_CODE=KR
ATLAS_TRENDING_JOBS_0_CATEGORY_ID=0
ATLAS_TRENDING_JOBS_0_CATEGORY_LABEL=전체
```

## 실행 방법

```bash
npm install
npm run dev
```

## 스크립트

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm test
```

## 테스트

- 카테고리 병합 로직과 Shorts 필터링 테스트
- 채팅 스팸 방지 로직 테스트
- 댓글 전송 API 에러 매핑 테스트
- 채팅 UI 쿨다운 및 상태 전환 테스트

## 아쉬운 점

- 채팅 moderation 기능이 없습니다.
- 인증, 신고, 차단 기능이 없습니다.
- 브라우저/단위 테스트 중심이라 실제 API 연동 E2E 검증은 부족합니다.
- 운영 환경 기준의 상세 모니터링과 에러 추적 설정은 아직 없습니다.

## 개선 예정

- Presence 기반 접속자 수 표시
- 채팅 삭제 및 신고 기능
- E2E 테스트 및 배포 후 모니터링 보강
- 메시지 도메인 네이밍 정리
