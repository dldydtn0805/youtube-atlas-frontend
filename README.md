# YouTube Atlas

YouTube 인기 차트를 기반으로 영상을 사고파는 시즌제 랭킹 게임 프론트엔드입니다.  
단순한 영상 탐색 앱이 아니라 `차트 탐색 -> 진입 판단 -> 포지션 운영 -> 티어/칭호/알림 확인` 흐름을 한 화면 안에서 이어지도록 만든 토이 프로젝트입니다.

배포 링크: [https://youtube-atlas.vercel.app/](https://youtube-atlas.vercel.app/)

관련 레포지토리

- Backend: [youtube-atlas-backend](https://github.com/dldydtn0805/youtube-atlas-backend)

## 현재 상태

이 프로젝트는 아이디어 데모 수준을 넘어서, 핵심 게임 루프가 한 사이클 완성된 상태를 목표로 만들었습니다.

- 국가별 YouTube 인기 차트 탐색
- 영상 단위 가상 매수/매도
- 실시간 순위 변화 반영
- 티어, 하이라이트, 칭호 수집
- 시즌 코인과 리더보드 경쟁
- WebSocket 기반 알림/채팅
- 관리자 화면을 통한 운영 데이터 확인

즉, "유튜브 데이터를 보는 앱"보다는 "유튜브 차트 데이터를 가지고 플레이하는 게임형 서비스 프로토타입"에 가깝습니다.

## 핵심 컨셉

YouTube Atlas는 YouTube 랭킹 데이터를 게임화해 다음 흐름을 만드는 데 초점을 둡니다.

1. 지금 뜨는 영상을 차트에서 찾는다.
2. 오를 것 같은 영상이나 채널에 포지션을 잡는다.
3. 순위 변화와 조회 흐름을 보며 운영한다.
4. 결과를 포인트, 시즌 코인, 티어, 칭호, 리더보드로 확인한다.

이 과정에서 영상 탐색, 재생, 커뮤니티, 게임 정보가 서로 끊기지 않도록 홈 화면에 통합했습니다.

## 주요 기능

### 1. 시즌제 랭킹 게임

- 시즌별 지갑, 총자산, 손익률, 보유 종목 수 요약
- 영상 단위 매수/매도와 포지션 관리
- 최소 보유 시간 이후 매도 가능 수량 계산
- 예약 매도 주문 생성 및 취소
- 내 포지션, 거래 이력, 리더보드 탭 제공
- 다른 플레이어의 포지션과 순위 변화 열람 가능

### 2. 티어, 하이라이트, 칭호

- 포인트와 플레이 성과를 기준으로 티어 진행도 표시
- 주요 성과를 하이라이트 카드로 노출
- 조건 달성 시 칭호 획득 및 대표 칭호 선택 가능
- 티어 가이드, 등급 기준, 코인 채굴률 안내 모달 제공

### 3. 시즌 코인과 순위 경쟁

- 순위 변화가 포지션 성과와 시즌 포인트에 직접 반영
- Top 200 구간 기준 시즌 코인 채굴 구조 제공
- 순위별 코인 채굴 비율 미리보기 지원
- 리더보드 기준 경쟁 구도를 한 화면에서 확인 가능

### 4. 차트 탐색

- 국가별 인기 영상 카탈로그 조회
- 메인/세부 카테고리 전환
- `전체`, `TOP 200`, `실시간 급상승`, `신규 진입`, `즐겨찾기` 차트 보기 지원
- 급상승 배지, 신규 진입, 즐겨찾기 채널 영상을 한 흐름으로 병합 표시
- 정렬 옵션 기반 추가 종목 프리패치 및 탐색 보조

### 5. 시청 경험

- 선택 영상 즉시 재생
- 이전/다음 이동 및 자동 다음 재생
- 재생 큐 기반 탐색
- 마지막 재생 위치 저장 및 복원
- 라이트/다크 모드, 시네마틱 모드, 반응형 레이아웃 지원

### 6. 커뮤니티와 실시간 알림

- 영상 기반 공개 채팅
- 익명 채팅과 로그인 사용자 채팅 모두 지원
- WebSocket 구독 기반 새 메시지 반영
- 게임 알림 토스트/모달/목록 제공
- 5초 쿨다운, 중복 메시지 방지 등 기본 스팸 제어

### 7. 개인화 기능

- Google OAuth 로그인
- 세션 복원
- 채널 즐겨찾기 토글
- 즐겨찾기 채널 영상 섹션 별도 표시
- 사용자 취향 기반 로컬 UI 상태 저장

### 8. 관리자 화면

- `/admin` 경로에서 관리자 대시보드 제공
- 사용자 목록/상세 조회
- 지갑 포인트 조정
- 포지션, 하이라이트, 댓글, 즐겨찾기, 트렌드 스냅샷 확인
- 시즌 종료, 시작 자산, 일정 조정 등 운영 기능 제공

## 화면과 라우트

| 경로 | 설명 |
| --- | --- |
| `/` | 메인 홈 화면. 영상 탐색, 재생, 채팅, 즐겨찾기, 게임 기능을 포함합니다. |
| `/admin` | 관리자 대시보드입니다. 백엔드 권한 정책에 따라 접근이 제한됩니다. |

현재 프론트엔드는 별도 라우터 라이브러리 없이 `pathname` 기준으로 홈과 관리자 화면을 분기합니다.

## 사용자 흐름

1. 앱이 로컬에 저장된 국가, 테마, 시네마틱 모드, 인증 세션을 복원합니다.
2. 로그인 상태라면 현재 시즌, 지갑, 포지션, 리더보드, 시즌 코인, 칭호 정보를 함께 불러옵니다.
3. 사용자는 `전체`, `TOP 200`, `실시간 급상승`, `신규 진입`, `즐겨찾기` 차트에서 진입 대상을 탐색합니다.
4. 영상을 선택하면 플레이어와 재생 큐가 갱신되고, 조건에 맞는 경우 즉시 매수/매도 또는 상세 게임 정보를 확인할 수 있습니다.
5. 포지션은 순위 변화에 따라 성과가 갱신되고, 티어/하이라이트/리더보드/알림에서 시즌 진행 상황을 확인할 수 있습니다.
6. 채팅과 실시간 알림은 WebSocket 구독을 통해 반영됩니다.

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

백엔드 구현 레포: [youtube-atlas-backend](https://github.com/dldydtn0805/youtube-atlas-backend)

- 카탈로그/카테고리/비디오 조회 API
- 급상승 트렌드 API
- 신규 진입 차트 API
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
- 게임 거래 모달, 알림, 랭킹 패널 동작
- 게임 실시간 무효화 로직

## 프로젝트 구조

```text
src
├── app
│   ├── App.tsx
│   └── providers.tsx
├── pages
│   ├── admin
│   │   ├── components
│   │   ├── AdminPage.css
│   │   └── AdminPage.tsx
│   └── home
│       ├── hooks
│       ├── sections
│       ├── gameHelpers.ts
│       ├── homeGameModalActions.ts
│       ├── HomePage.tsx
│       ├── types.ts
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
│   ├── realtime
│   ├── trending
│   └── youtube
├── constants
├── lib
├── styles
└── test
```

### 구조 메모

- `pages/home`: 실제 사용자 경험 대부분이 모여 있는 메인 화면
- `pages/home/sections`: 홈 화면을 구성하는 게임/재생/필터/알림 UI 조각
- `pages/home/hooks`: 홈 전용 상태와 상호작용 로직
- `features/*`: 도메인별 API, Query, 타입 정의
- `features/realtime`: STOMP 클라이언트 연결 관리
- `lib/api.ts`: HTTP 요청과 WebSocket 기준 URL 계산
- `app/providers.tsx`: Query Client, 인증 컨텍스트 주입

## 참고 사항

- 프론트엔드는 YouTube Data API를 직접 호출하지 않고, 백엔드 API를 통해 데이터를 받습니다.
- Google OAuth 클라이언트 설정도 프론트 환경 변수가 아니라 백엔드의 `/api/auth/google/config` 응답을 통해 받습니다.
- `src/lib/supabase.ts`와 루트 `supabase/` 디렉터리는 현재 핵심 런타임 흐름과 분리된 보조 자산입니다.
- 전체 카테고리에서만 실시간 급상승, 신규 진입, 즐겨찾기 채널 영상 섹션이 함께 활성화됩니다.
- 현재 프로젝트는 토이 프로젝트이지만, 기능 면에서는 작은 게임형 서비스 프로토타입에 가깝게 구현되어 있습니다.
