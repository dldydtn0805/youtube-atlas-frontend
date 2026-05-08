import type { ChartPoint, RankHistoryPoint } from './types';

function getEventLabel(point: RankHistoryPoint) {
  if ('buyPoint' in point && point.buyPoint) {
    return 'B';
  }

  return 'sellPoint' in point && point.sellPoint ? 'S' : null;
}

export function buildChartPoints(points: RankHistoryPoint[]) {
  const buyPointIndex = points.findIndex((point) => 'buyPoint' in point && point.buyPoint);
  const hasTradeMarker = points.some((point) => {
    return ('buyPoint' in point && point.buyPoint) || ('sellPoint' in point && point.sellPoint);
  });
  let isHolding = false;

  return points.map((point, index): ChartPoint => {
    const isBuyPoint = 'buyPoint' in point && point.buyPoint;
    const isSellPoint = 'sellPoint' in point && point.sellPoint;
    const previousViewCount = index > 0 ? points[index - 1]?.viewCount : null;
    const currentViewCount = point.viewCount;

    if (isBuyPoint) {
      isHolding = true;
    }

    const isPreBuy = buyPointIndex > 0 && index < buyPointIndex;
    const isFaded = hasTradeMarker && (isPreBuy || (!isHolding && !isBuyPoint && !isSellPoint));
    const viewDelta =
      typeof currentViewCount === 'number' &&
      typeof previousViewCount === 'number' &&
      currentViewCount >= previousViewCount
        ? currentViewCount - previousViewCount
        : null;

    if (isSellPoint) {
      isHolding = false;
    }

    return {
      chartOut: point.chartOut && typeof point.rank !== 'number',
      eventLabel: getEventLabel(point),
      isFaded,
      rank: point.rank,
      timestamp: point.capturedAt,
      viewDelta,
    };
  });
}
