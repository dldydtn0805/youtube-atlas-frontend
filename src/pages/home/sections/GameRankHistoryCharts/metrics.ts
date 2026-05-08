import type { ChartPoint } from './types';

export interface ChartMetrics {
  actualRanks: Set<number>;
  maxRank: number;
  maxViewDelta: number;
  minRank: number;
  outRank: number;
}

export function valuesAreClose(left: number, right: number) {
  return Math.abs(left - right) < 0.001;
}

export function getChartMetrics(points: ChartPoint[]): ChartMetrics {
  const actualRanks = new Set<number>();
  let minRank = Number.POSITIVE_INFINITY;
  let maxRank = Number.NEGATIVE_INFINITY;
  let maxViewDelta = 0;
  let hasChartOut = false;

  points.forEach((point) => {
    if (typeof point.rank === 'number') {
      actualRanks.add(point.rank);
      minRank = Math.min(minRank, point.rank);
      maxRank = Math.max(maxRank, point.rank);
    }

    maxViewDelta = Math.max(maxViewDelta, point.viewDelta ?? 0);
    hasChartOut ||= point.chartOut;
  });

  const safeMinRank = Number.isFinite(minRank) ? minRank : 1;
  const safeMaxRank = Number.isFinite(maxRank) ? maxRank : 100;
  const outPadding = Math.max(1, Math.round((safeMaxRank - safeMinRank) * 0.18));

  return {
    actualRanks,
    maxRank: safeMaxRank,
    maxViewDelta,
    minRank: safeMinRank,
    outRank: hasChartOut ? safeMaxRank + outPadding : safeMaxRank,
  };
}
