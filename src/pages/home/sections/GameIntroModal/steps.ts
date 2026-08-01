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
    title: '순위와 구매·판매 횟수로 가격 결정',
    previewType: 'market',
    body: '영상 순위가 기본 가격을 정합니다. 순위가 갱신된 뒤 유저들이 해당 영상을 구매한 횟수와 판매한 횟수의 차이로 가격이 움직입니다. 구매가 더 많으면 오르고 판매가 더 많으면 내려가며, 횟수 차이 1회당 1%씩 최대 ±30%까지 변동합니다.',
  },
  {
    stepLabel: 'STEP 3 / 4',
    title: '다음 순위 갱신 후 전량 매도',
    previewType: 'sell',
    body: '현재 순위 기준으로 매수한 영상은 다음 순위 갱신 후 매도할 수 있습니다. 수량 선택 없이 보유한 1개를 전량 매도하며, 예약 매도도 같은 원칙이에요.',
  },
  {
    stepLabel: 'STEP 4 / 4',
    title: '총자산으로 티어 경쟁',
    previewType: 'assets',
    body: '봄·여름·가을·겨울의 3개월 시즌마다 현금, 보유 영상 평가액, 예약 포인트를 합친 총자산으로 티어와 리더보드 순위가 결정됩니다. 티어 기준은 3개월 성장 폭에 맞춰 설정됩니다.',
  },
];
