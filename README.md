# YouTube Atlas

국가별 YouTube 인기 영상을 탐색하고, 영상을 바로 재생하면서 채팅, 즐겨찾기, 재생 기록, 랭킹 게임까지 한 화면에서 이어서 사용할 수 있는 프론트엔드 애플리케이션입니다.

배포 링크: [https://youtube-atlas.vercel.app/](https://youtube-atlas.vercel.app/)

## 프로젝트 개요

YouTube Atlas는 단순히 인기 영상을 나열하는 앱이 아니라, "탐색 -> 시청 -> 상호작용 -> 개인화" 흐름을 한 곳에 묶는 데 초점을 둡니다.

- 국가와 카테고리를 바꿔가며 인기 영상을 탐색
- 선택한 영상을 즉시 재생하고 재생 큐 기준으로 이동
- 영상별 실시간 공개 채팅 참여
- 로그인 후 즐겨찾기, 재생 위치 저장, 랭킹 게임 이용
- 운영용 관리자 대시보드 접근

프론트엔드는 `VITE_API_BASE_URL`로 연결한 백엔드 API를 기준으로 동작하며, WebSocket 주소도 같은 기준 URL에서 `/ws`로 파생합니다.

## 주요 기능

### 1. 인기 영상 탐색

- 국가별 인기 영상 카탈로그 조회
- 메인/세부 카테고리 전환
- 전체 카테고리 기준 급상승 배지와 실시간 급상승 섹션 노출
- 즐겨찾기 채널 영상 섹션 병합 표시

### 2. 시청 경험

- 선택 영상 즉시 재생
- 이전/다음 이동 및 자동 다음 재생
- 재생 큐 기반 탐색
- 라이트/다크 모드, 시네마틱 모드, 반응형 레이아웃

### 3. 커뮤니티 기능

- 영상 ID 기준 실시간 공개 채팅
- 익명 채팅과 로그인 사용자 채팅 모두 지원
- WebSocket 구독 기반 새 메시지 반영
- 5초 쿨다운, 중복 메시지 방지 등 기본 스팸 제어

### 4. 개인화 기능

- Google OAuth 로그인
- 세션 복원
- 채널 즐겨찾기 토글
- 마지막 재생 위치 저장 및 복원

### 5. 랭킹 게임

- 시즌 기반 영상 랭킹 게임 참여
- 매수/매도 및 보유 포지션 확인
- 리더보드, 배당 개요, 포지션 이력 확인
- 매도 예상 정산에 수수료 0.3% 반영

### 6. 관리자 화면

- `/admin` 경로에서 관리자 대시보드 제공
- 사용자 목록/상세 조회
- 지갑 포인트 조정
- 최근 댓글, 즐겨찾기, 트렌드 스냅샷 확인

## 화면과 라우트

| 경로 | 설명 |
| --- | --- |
| `/` | 메인 홈 화면. 영상 탐색, 재생, 채팅, 즐겨찾기, 게임 기능을 포함합니다. |
| `/admin` | 관리자 대시보드입니다. 백엔드 권한 정책에 따라 접근이 제한됩니다. |

현재 프론트엔드는 별도 라우터 라이브러리 없이 현재 `pathname`을 기준으로 홈과 관리자 화면을 분기합니다.

## 사용자 흐름

1. 앱이 로컬에 저장된 국가, 테마, 시네마틱 모드, 인증 세션을 복원합니다.
2. 선택 국가에 맞는 카테고리를 백엔드에서 불러옵니다.
3. 선택 카테고리의 인기 영상을 페이지 단위로 조회합니다.
4. 사용자가 영상을 선택하면 플레이어와 재생 큐가 갱신됩니다.
5. 로그인 상태라면 즐겨찾기, 재생 위치 저장, 게임, 관리자 기능 같은 인증 기반 기능이 활성화됩니다.
6. 채팅은 영상별로 분리되며, `/ws` 구독을 통해 새 메시지를 반영합니다.

## 기술 스택

- React 19
- TypeScript
- Vite 6
- TanStack Query
- STOMP WebSocket
- Google Identity Services
- ESLint
- Vitest
- Testing Library
- Vercel

## 로컬 실행

Node.js LTS와 `npm`이 설치되어 있다고 가정합니다.

```bash
npm install
cp .env.example .env.local
npm run dev
```

기본 개발 서버는 Vite를 통해 실행됩니다.

## 환경 변수

### 필수

| 이름 | 설명 |
| --- | --- |
| `VITE_API_BASE_URL` | 백엔드 API 기본 주소입니다. 카탈로그, 인증, 채팅, 즐겨찾기, 재생 기록, 게임, 관리자 API와 WebSocket 연결의 기준이 됩니다. |

`.env.example`

```bash
VITE_API_BASE_URL=http://localhost:8080
```

### 선택

| 이름 | 설명 |
| --- | --- |
| `VITE_SUPABASE_URL` | 보조 자산으로 남아 있는 Supabase 클라이언트 설정입니다. 현재 메인 앱 흐름의 핵심 의존성은 아닙니다. |
| `VITE_SUPABASE_ANON_KEY` | 위 Supabase 설정과 함께 사용하는 anon key입니다. |

## 백엔드 의존성

이 프로젝트는 프론트 단독으로 완결되지 않고, 아래 계열의 백엔드 기능을 전제로 합니다.

- 카탈로그/카테고리/비디오 조회 API
- 급상승 트렌드 API
- Google 로그인 및 세션 API
- 댓글 조회/작성 API
- 즐겨찾기 API
- 재생 위치 저장/복원 API
- 랭킹 게임 API
- 관리자 API
- STOMP WebSocket `/ws`

즉, `VITE_API_BASE_URL`이 설정되지 않거나 해당 서버가 준비되지 않으면 앱은 열리더라도 API 의존 기능은 정상 동작하지 않습니다.

## 스크립트

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm test
```

## 테스트 범위

현재 테스트는 주로 단위 테스트와 UI 동작 검증에 초점을 둡니다.

- 카테고리 정렬 및 메인 카테고리 분리 규칙
- YouTube 카탈로그 API 요청 생성
- 즐겨찾기 API 요청 생성
- 재생 위치 저장 API 요청 생성
- 급상승 Query와 표시 규칙
- 채팅 스팸 방지와 에러 매핑
- Google 로그인 버튼 동작
- 플레이어, 영상 목록, 채팅 UI 동작
- 재생 큐 관련 훅 동작
- 게임 거래 모달 동작

## 프로젝트 구조

```text
src
├── app
│   ├── App.tsx
│   └── providers.tsx
├── pages
│   ├── admin
│   │   └── AdminPage.tsx
│   └── home
│       ├── HomePage.tsx
│       ├── hooks
│       ├── sections
│       ├── gameHelpers.ts
│       └── utils.ts
├── components
│   ├── CommentSection
│   ├── GoogleLoginButton
│   ├── SearchBar
│   ├── VideoList
│   └── VideoPlayer
├── features
│   ├── admin
│   ├── auth
│   ├── comments
│   ├── favorites
│   ├── game
│   ├── playback
│   ├── trending
│   └── youtube
├── constants
├── lib
├── styles
└── test
```

### 구조 메모

- `pages/home`: 실제 사용자 경험 대부분이 모여 있는 메인 화면
- `features/*`: 도메인별 API, Query, 타입 정의
- `components/*`: 재사용 UI 조각
- `lib/api.ts`: HTTP 요청과 WebSocket 기준 URL 계산
- `app/providers.tsx`: Query Client, 인증 컨텍스트 주입

## 참고 사항

- 프론트엔드는 YouTube Data API를 직접 호출하지 않고, 백엔드 API를 통해 데이터를 받습니다.
- Google OAuth 클라이언트 설정도 프론트 환경 변수가 아니라 백엔드의 `/api/auth/google/config` 응답을 통해 받습니다.
- `src/lib/supabase.ts`와 루트 `supabase/` 디렉터리는 현재 핵심 런타임 흐름과 분리된 보조 자산입니다.
- 전체 카테고리에서만 급상승 신호와 즐겨찾기 채널 영상 섹션이 함께 활성화됩니다.

## 앞으로 다듬을 수 있는 부분

- 채팅 moderation, 신고, 차단 기능
- 실제 백엔드와 함께 도는 E2E 테스트
- 시즌/거래 이력 중심의 게임 화면 확장
- 운영 모니터링 및 에러 추적 강화
