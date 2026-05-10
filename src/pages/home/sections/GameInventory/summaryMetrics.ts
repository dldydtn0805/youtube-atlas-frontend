import type { OpenGameHolding } from '../../gameHelpers';
import { getPointTone } from '../../gameHelpers';
import { getHoldingEvaluationPoints } from '../../gameInventorySorting';

export interface GameInventorySegment {
  id: number;
  tone: ReturnType<typeof getPointTone>;
  widthPercent: number;
}

function getFinitePoints(points: number | null) {
  return typeof points === 'number' && Number.isFinite(points) ? points : 0;
}

export function buildGameInventorySummary(holdings: OpenGameHolding[]) {
  const totalStakePoints = holdings.reduce((sum, holding) => sum + Math.max(0, getFinitePoints(holding.stakePoints)), 0);
  const totalEvaluationPoints = holdings.reduce((sum, holding) => sum + getHoldingEvaluationPoints(holding), 0);
  const totalProfitPoints = holdings.reduce((sum, holding) => sum + getFinitePoints(holding.profitPoints), 0);
  const gainCount = holdings.filter((holding) => (holding.profitPoints ?? 0) > 0).length;
  const lossCount = holdings.filter((holding) => (holding.profitPoints ?? 0) < 0).length;
  const profitRatePercent = totalStakePoints > 0 ? (totalProfitPoints / totalStakePoints) * 100 : null;
  const segments = holdings
    .map<GameInventorySegment>((holding) => {
      const value = getHoldingEvaluationPoints(holding);

      return {
        id: holding.positionId,
        tone: getPointTone(holding.profitPoints),
        widthPercent: totalEvaluationPoints > 0 ? (value / totalEvaluationPoints) * 100 : 0,
      };
    })
    .filter((segment) => segment.widthPercent > 0);

  return {
    gainCount,
    lossCount,
    profitRatePercent,
    segments,
    totalEvaluationPoints,
    totalProfitPoints,
  };
}
