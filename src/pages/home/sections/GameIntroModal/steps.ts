export type GameIntroPreviewType = 'trade' | 'highlights' | 'leaderboard';

export interface GameIntroStep {
  body: string;
  stepLabel: string;
  previewType: GameIntroPreviewType;
  title: string;
}

export const gameIntroSteps: GameIntroStep[] = [
  {
    stepLabel: 'STEP 1 / 3',
    title: '사고 팔아 포인트 벌기',
    previewType: 'trade',
    body: '홈에서 영상 차트를 확인하고, 순위가 오를 것 같은 영상을 싸게 사보세요. 나중에 순위가 오르면 비싸게 팔아 차익을 포인트로 챙길 수 있어요!',
  },
  {
    stepLabel: 'STEP 2 / 3',
    title: '하이라이트로 티어 올리기',
    previewType: 'highlights',
    body: '큰 순위 이동을 성공시키거나 수익률이 높으면 하이라이트가 기록돼요. 하이라이트 점수를 쌓아 시즌 티어를 올려보세요.',
  },
  {
    stepLabel: 'STEP 3 / 3',
    title: '기록과 경쟁',
    previewType: 'leaderboard',
    body: '거래내역에서 내가 했던 선택들을 돌아보고, 리더보드에서 다른 유저들과 이번 시즌 순위를 비교해보세요.',
  },
];
