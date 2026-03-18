# YouTube Atlas

국가별 YouTube 인기 영상을 빠르게 탐색하고 바로 재생할 수 있는 React 기반 웹앱입니다.

배포 링크: [https://world-best-you-tube.vercel.app/](https://world-best-you-tube.vercel.app/)

## Overview

이 프로젝트는 YouTube Data API를 사용해 국가별 인기 영상을 불러오고, 한 화면에서 국가 선택, 인기 목록 확인, 영상 재생까지 이어서 처리할 수 있도록 구성했습니다.

## Features

- 국가별 인기 YouTube 영상 조회
- 선택한 국가를 `localStorage`에 저장해 다음 방문 시 유지
- 인기 영상 목록에서 원하는 영상을 클릭해 바로 재생
- Supabase Realtime 기반 영상별 공개 익명 채팅방
- React Query 기반의 데이터 요청 및 캐싱
- 반응형 UI

## Tech Stack

- React 19
- TypeScript
- Vite
- TanStack Query
- Supabase
- ESLint
- YouTube Data API v3

## Project Structure

```text
src
├── app
│   ├── App.tsx              # 전체 화면 레이아웃 및 상태 관리
│   └── providers.tsx        # React Query 등 앱 전역 provider 설정
├── components
│   ├── SearchBar            # 국가 선택 UI
│   ├── VideoList            # 인기 영상 목록 UI
│   └── VideoPlayer          # 선택한 영상 재생 iframe
├── constants
│   └── countryCodes.ts      # 지원 국가 코드 목록
├── features
│   ├── comments
│   │   ├── api.ts           # 채팅 메시지 CRUD
│   │   ├── queries.ts       # 메시지 조회/실시간 구독 훅
│   │   └── types.ts         # 메시지 타입 정의
│   └── youtube
│       ├── api.ts           # YouTube API 호출
│       ├── queries.ts       # React Query 훅
│       └── types.ts         # API 응답 타입 정의
├── lib
│   └── supabase.ts          # Supabase client 초기화
├── supabase
│   └── comments.sql         # 채팅 테이블 및 정책 설정
├── styles
│   ├── app.css              # 앱 레이아웃 스타일
│   └── global.css           # 전역 스타일
├── main.tsx                 # 앱 엔트리 포인트
└── vite-env.d.ts
```

## How It Works

1. 사용자가 국가를 선택합니다.
2. `usePopularVideos(regionCode)`가 YouTube 인기 영상 데이터를 요청합니다.
3. 목록에서 영상을 선택하면 현재 재생 영역의 영상이 변경됩니다.
4. 선택한 영상마다 독립된 공개 채팅방이 열리고, 새 메시지는 실시간으로 반영됩니다.
5. 마지막으로 선택한 국가는 브라우저 저장소에 유지됩니다.

## Environment Variables

프로젝트 실행 전 `.env` 파일에 아래 값을 설정해야 합니다.

```bash
VITE_YOUTUBE_API_KEY=your_youtube_api_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Supabase SQL Editor에서 [`supabase/comments.sql`](/Users/yongsoolee/Documents/GitHub/World-Best-YouTube/supabase/comments.sql)을 실행해야 채팅 테이블, 권한, Realtime publication 설정이 함께 적용됩니다.

## Getting Started

```bash
npm install
npm run dev
```

브라우저에서 기본 Vite 개발 서버 주소를 열면 됩니다.

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Notes

- 현재 영상 재생은 YouTube `embed` iframe 방식으로 동작합니다.
- 광고 노출 여부는 일반 YouTube watch 페이지와 다르게 동작할 수 있습니다.
- API 키가 없으면 인기 영상 데이터를 불러올 수 없습니다.
