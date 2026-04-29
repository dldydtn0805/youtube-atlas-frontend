import type { OpenGameHolding } from './gameHelpers';

function getProfitRate(holding: OpenGameHolding) {
  const { profitPoints, stakePoints } = holding;

  if (
    typeof profitPoints !== 'number' ||
    !Number.isFinite(profitPoints) ||
    !Number.isFinite(stakePoints) ||
    stakePoints <= 0
  ) {
    return Number.NEGATIVE_INFINITY;
  }

  return profitPoints / stakePoints;
}

export function sortHoldingsByProfitRateDesc(holdings: OpenGameHolding[]) {
  return [...holdings].sort((left, right) => {
    const leftRate = getProfitRate(left);
    const rightRate = getProfitRate(right);

    if (leftRate === rightRate) {
      return 0;
    }

    return rightRate > leftRate ? 1 : -1;
  });
}
