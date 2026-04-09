# YouTube Atlas

YouTube 인기 차트를 기반으로 영상을 사고파는 시즌제 랭킹 게임을 중심에 둔 프론트엔드 애플리케이션입니다. 실시간 차트 탐색, 신규 진입 추적, 시즌 코인 미리보기, 리더보드 경쟁, 영상 재생과 채팅 경험이 한 화면에서 이어집니다.

배포 링크: [https://youtube-atlas.vercel.app/](https://youtube-atlas.vercel.app/)

## 관련 레포지토리

- Backend: [youtube-atlas-backend](https://github.com/dldydtn0805/youtube-atlas-backend)

## 프로젝트 개요

YouTube Atlas는 단순한 인기 영상 탐색 앱이 아니라, YouTube 랭킹 데이터를 게임화해 "차트 탐색 -> 포지션 진입 -> 순위 변화 추적 -> 포인트/시즌 코인 경쟁" 흐름을 만드는 데 초점을 둡니다.

- 시즌별 영상 마켓에서 매수/매도 포지션 운영
- 순위 변화에 따라 포인트 성과와 리더보드 경쟁 진행
- Top 구간 시즌 코인 생산과 누적 코인 현황 확인
- 실시간 급상승 차트와 신규 진입 차트 분리 탐색
- 영상 재생, 채팅, 즐겨찾기, 재생 기록까지 한 화면에서 연결

프론트엔드는 `VITE_API_BASE_URL`로 연결한 백엔드 API를 기준으로 동작하며, WebSocket 주소도 같은 기준 URL에서 `/ws`로 파생합니다.

## 주요 기능

### 1. 시즌제 랭킹 게임

- 시즌별 지갑, 총자산, 보유 종목 수, 손익률 요약
- 영상 단위 매수/매도와 보유 포지션 관리
- 최소 보유 시간 이후 매도 가능 수량 계산
- 거래내역, 보유 포지션, 리더보드 탭 제공
- 다른 플레이어의 리더보드 포지션 열람 가능

### 2. 포인트와 시즌 코인

- 영상 순위 변화가 포지션 성과와 포인트 경쟁에 직접 반영
- 시즌별 누적 시즌 코인과 총자산 집계
- Top 코인 생산 구간 기준 예상 코인 생산 미리보기
- 코인 표 모달에서 1위~20위 고정 코인 생산률 확인
- 코인 대상 포지션과 준비 중 포지션 상태 확인

### 3. 차트 탐색

- 국가별 인기 영상 카탈로그 조회
- 메인/세부 카테고리 전환
- `전체`, `TOP 200`, `실시간 급상승`, `신규 진입`, `즐겨찾기` 차트 보기 지원
- 전체 카테고리 기준 급상승 배지와 실시간 급상승 섹션 노출
- 신규 진입 차트를 별도 섹션으로 분리해 추적
- 즐겨찾기 채널 영상 섹션 병합 표시

### 4. 시청 경험

- 선택 영상 즉시 재생
- 이전/다음 이동 및 자동 다음 재생
- 재생 큐 기반 탐색
- 라이트/다크 모드, 시네마틱 모드, 반응형 레이아웃

### 5. 커뮤니티 기능

- 영상 ID 기준 실시간 공개 채팅
- 익명 채팅과 로그인 사용자 채팅 모두 지원
- WebSocket 구독 기반 새 메시지 반영
- 5초 쿨다운, 중복 메시지 방지 등 기본 스팸 제어

### 6. 개인화 기능

- Google OAuth 로그인
- 세션 복원
- 채널 즐겨찾기 토글
- 마지막 재생 위치 저장 및 복원

### 7. 관리자 화면

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
2. 로그인 상태라면 현재 시즌, 지갑, 포지션, 리더보드, 시즌 코인 개요를 함께 불러옵니다.
3. 사용자는 `전체`, `TOP 200`, `실시간 급상승`, `신규 진입` 같은 차트 보기로 진입 대상을 탐색합니다.
4. 영상을 선택하면 플레이어와 재생 큐가 갱신되고, 조건에 맞는 경우 즉시 매수/매도 또는 차트 확인이 가능합니다.
5. 포지션은 순위 변화에 따라 성과가 갱신되고, 리더보드와 시즌 코인 미리보기에서 시즌 진행 상황을 확인할 수 있습니다.
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
- 전체 카테고리에서만 실시간 급상승, 신규 진입, 즐겨찾기 채널 영상 섹션이 함께 활성화됩니다.

## 앞으로 다듬을 수 있는 부분

- 채팅 moderation, 신고, 차단 기능
- 실제 백엔드와 함께 도는 E2E 테스트
- 시즌/거래 이력 중심의 게임 화면 확장
- 운영 모니터링 및 에러 추적 강화
