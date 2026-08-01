export type GameIntroPreviewType = 'wallet' | 'market' | 'sell' | 'assets';

export interface GameIntroStep {
  body: string;
  stepLabel: string;
  previewType: GameIntroPreviewType;
  title: string;
}

export const gameIntroSteps: GameIntroStep[] = [
  {
    stepLabel: 'STEP 1 / 4',
    title: '100,000P로 시작하기',
    previewType: 'wallet',
    body: '모든 플레이어는 100,000P로 시작합니다. 서로 다른 영상은 여러 개 보유할 수 있지만, 같은 영상은 1개만 매수할 수 있어요.',
  },
  {
    stepLabel: 'STEP 2 / 4',
    title: '순위와 거래 카운트로 가격 결정',
    previewType: 'market',
    body: '순위 앵커가 기본가를 정하고 1위 기본가는 1,000,000P입니다. 순위 변동 자체에는 프리미엄이 없고, 이번 싱크의 순매수는 회당 +1%, 순매도는 회당 -1%로 최대 ±30%까지 반영돼요.',
  },
  {
    stepLabel: 'STEP 3 / 4',
    title: '다음 싱크부터 전량 매도',
    previewType: 'sell',
    body: '이번 트렌드 싱크에서 매수한 영상은 다음 싱크부터 매도할 수 있습니다. 수량 선택 없이 보유한 1개를 전량 매도하며, 예약 매도도 같은 원칙이에요.',
  },
  {
    stepLabel: 'STEP 4 / 4',
    title: '총자산으로 티어 경쟁',
    previewType: 'assets',
    body: '봄·여름·가을·겨울의 3개월 시즌마다 현금, 보유 영상 평가액, 예약 포인트를 합친 총자산으로 티어와 리더보드 순위가 결정됩니다. 티어 기준은 3개월 성장 폭에 맞췄고, 하이라이트 점수는 거래 기록과 칭호용이에요.',
  },
];
