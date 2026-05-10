import type { OpenGameHolding } from './gameHelpers';

export type GameInventorySortKey = 'profit' | 'rank' | 'value';

export function getHoldingProfitRate(holding: OpenGameHolding) {
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

export function getHoldingEvaluationPoints(holding: OpenGameHolding) {
  if (typeof holding.currentPricePoints === 'number' && Number.isFinite(holding.currentPricePoints)) {
    return Math.max(0, holding.currentPricePoints);
  }

  if (typeof holding.profitPoints === 'number' && Number.isFinite(holding.profitPoints)) {
    return Math.max(0, holding.stakePoints + holding.profitPoints);
  }

  return Math.max(0, holding.stakePoints);
}

function getRankSortValue(holding: OpenGameHolding) {
  if (holding.chartOut || typeof holding.currentRank !== 'number' || !Number.isFinite(holding.currentRank)) {
    return Number.POSITIVE_INFINITY;
  }

  return holding.currentRank;
}

export function sortHoldingsByProfitRateDesc(holdings: OpenGameHolding[]) {
  return [...holdings].sort((left, right) => {
    const leftRate = getHoldingProfitRate(left);
    const rightRate = getHoldingProfitRate(right);

    if (leftRate === rightRate) {
      return 0;
    }

    return rightRate > leftRate ? 1 : -1;
  });
}

export function sortGameInventoryHoldings(holdings: OpenGameHolding[], sortKey: GameInventorySortKey) {
  if (sortKey === 'rank') {
    return [...holdings].sort((left, right) => getRankSortValue(left) - getRankSortValue(right));
  }

  if (sortKey === 'value') {
    return [...holdings].sort((left, right) => getHoldingEvaluationPoints(right) - getHoldingEvaluationPoints(left));
  }

  return sortHoldingsByProfitRateDesc(holdings);
}
