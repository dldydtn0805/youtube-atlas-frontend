import type { ChartPoint, RankLineType } from './types';

export function createEventMarkLines(points: ChartPoint[]) {
  return points
    .map((point, index) => (point.eventLabel ? { name: point.eventLabel, xAxis: index } : null))
    .filter((point): point is { name: string; xAxis: number } => Boolean(point));
}

export function createRankLineData(points: ChartPoint[], outRank: number, rankLineType: RankLineType) {
  return points.map((point) => {
    const belongsToLine = rankLineType === 'active' ? !point.isFaded : point.isFaded || Boolean(point.eventLabel);
    const value = belongsToLine ? (point.chartOut ? outRank : point.rank) : null;

    return {
      chartOut: point.chartOut,
      itemStyle: {
        borderWidth: 0,
        color: point.isFaded ? 'rgba(217, 119, 6, 0.38)' : '#f2b47b',
      },
      rankLineType,
      symbol: 'none',
      value,
    };
  });
}

export function createViewBars(points: ChartPoint[]) {
  return points.map((point) => ({
    itemStyle: { color: point.isFaded ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.22)' },
    value: point.viewDelta,
  }));
}
