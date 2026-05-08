import type {
  GameHighlight,
  GamePosition,
  GamePositionRankHistory,
  GameScheduledSellOrder,
  GameSeasonResult,
  GameSeasonResultHighlightItem,
} from '../../features/game/types';
import type { VideoRankHistory } from '../../features/trending/types';

export function createScheduledSellOrderRankHistoryPosition(order: GameScheduledSellOrder): GamePosition {
  return {
    id: order.positionId,
    videoId: order.videoId,
    title: order.videoTitle,
    channelTitle: order.channelTitle,
    thumbnailUrl: order.thumbnailUrl,
    buyRank: order.buyRank,
    currentRank: order.currentRank,
    rankDiff: null,
    quantity: order.quantity,
    stakePoints: order.stakePoints,
    currentPricePoints: order.sellPricePoints ?? null,
    profitPoints: order.pnlPoints ?? null,
    chartOut: order.currentRank == null,
    status: order.status,
    buyCapturedAt: order.createdAt,
    createdAt: order.createdAt,
    closedAt: order.executedAt ?? order.canceledAt ?? null,
  };
}

export function createHighlightRankHistoryPosition(highlight: GameHighlight): GamePosition {
  return {
    id: highlight.positionId,
    videoId: highlight.videoId,
    title: highlight.videoTitle,
    channelTitle: highlight.channelTitle,
    thumbnailUrl: highlight.thumbnailUrl,
    buyRank: highlight.buyRank,
    currentRank: highlight.highlightRank,
    rankDiff: highlight.rankDiff,
    quantity: highlight.quantity,
    stakePoints: highlight.stakePoints,
    currentPricePoints: highlight.currentPricePoints,
    profitPoints: highlight.profitPoints,
    chartOut: false,
    status: highlight.status,
    buyCapturedAt: highlight.createdAt,
    createdAt: highlight.createdAt,
    closedAt: highlight.status === 'OPEN' ? null : highlight.createdAt,
  };
}

export function createSeasonResultHighlightRankHistoryPosition(
  result: GameSeasonResult,
  highlight: GameSeasonResultHighlightItem,
): GamePosition {
  return {
    id: highlight.positionId,
    videoId: highlight.videoId,
    title: highlight.title,
    channelTitle: highlight.channelTitle,
    thumbnailUrl: highlight.thumbnailUrl,
    buyRank: highlight.buyRank ?? highlight.sellRank ?? 0,
    currentRank: highlight.sellRank,
    rankDiff: highlight.rankDiff,
    quantity: 1,
    stakePoints: 0,
    currentPricePoints: null,
    profitPoints: highlight.profitPoints,
    strategyTags: highlight.strategyTags,
    chartOut: highlight.sellRank == null,
    status: 'CLOSED',
    buyCapturedAt: result.seasonStartAt,
    createdAt: result.seasonEndAt,
    closedAt: result.seasonEndAt,
  };
}

function mergeRankHistories(
  positionHistory?: GamePositionRankHistory,
  videoHistory?: VideoRankHistory,
): GamePositionRankHistory | VideoRankHistory | undefined {
  if (!positionHistory) {
    return videoHistory;
  }

  if (!videoHistory || videoHistory.videoId !== positionHistory.videoId) {
    return positionHistory;
  }

  const firstPositionCapturedAt = positionHistory.points[0]?.capturedAt ?? positionHistory.buyCapturedAt;
  const latestPositionCapturedAt = positionHistory.points.at(-1)?.capturedAt ?? positionHistory.latestCapturedAt;
  const leadingVideoPoints = videoHistory.points
    .filter((point) => new Date(point.capturedAt).getTime() < new Date(firstPositionCapturedAt).getTime())
    .map((point) => ({
      ...point,
      buyPoint: false,
      sellPoint: false,
    }));
  const trailingVideoPoints = videoHistory.points
    .filter((point) => !latestPositionCapturedAt || new Date(point.capturedAt).getTime() > new Date(latestPositionCapturedAt).getTime())
    .map((point) => ({
      ...point,
      buyPoint: false,
      sellPoint: false,
    }));

  if (leadingVideoPoints.length === 0 && trailingVideoPoints.length === 0) {
    return positionHistory;
  }

  return {
    ...positionHistory,
    latestCapturedAt: videoHistory.latestCapturedAt,
    latestChartOut: videoHistory.latestChartOut,
    latestRank: videoHistory.latestRank,
    points: [...leadingVideoPoints, ...positionHistory.points, ...trailingVideoPoints],
  };
}

export function mergeMultiplePositionHistories(
  positionHistories: GamePositionRankHistory[],
  videoHistory?: VideoRankHistory,
): GamePositionRankHistory | VideoRankHistory | undefined {
  if (positionHistories.length === 0) {
    return videoHistory;
  }

  const sortedHistories = [...positionHistories].sort(
    (left, right) => new Date(left.buyCapturedAt).getTime() - new Date(right.buyCapturedAt).getTime(),
  );
  const dedupeMergedPoints = (
    points: GamePositionRankHistory['points'],
  ): GamePositionRankHistory['points'] => {
    const uniquePoints = new Map<string, GamePositionRankHistory['points'][number]>();

    for (const point of points) {
      const key = `${point.runId}:${point.capturedAt}:${point.buyPoint ? 'b' : 'n'}:${point.sellPoint ? 's' : 'n'}`;
      uniquePoints.set(key, point);
    }

    return Array.from(uniquePoints.values()).sort(
      (left, right) => new Date(left.capturedAt).getTime() - new Date(right.capturedAt).getTime(),
    );
  };
  const [firstHistory, ...restHistories] = sortedHistories;
  let mergedHistory = firstHistory;

  for (const nextHistory of restHistories) {
    const latestCapturedAt = mergedHistory.points.at(-1)?.capturedAt ?? mergedHistory.latestCapturedAt;
    const nextBuyCapturedAt = nextHistory.buyCapturedAt;
    const gapVideoPoints =
      videoHistory?.points
        .filter((point) => {
          const capturedAt = new Date(point.capturedAt).getTime();
          const latestCapturedTime = latestCapturedAt ? new Date(latestCapturedAt).getTime() : null;
          const nextBuyCapturedTime = nextBuyCapturedAt ? new Date(nextBuyCapturedAt).getTime() : null;

          return (
            (latestCapturedTime === null || capturedAt > latestCapturedTime) &&
            (nextBuyCapturedTime === null || capturedAt < nextBuyCapturedTime)
          );
        })
        .map((point) => ({
          ...point,
          buyPoint: false,
          sellPoint: false,
        })) ?? [];
    const trailingPoints = nextHistory.points.filter(
      (point) => !latestCapturedAt || new Date(point.capturedAt).getTime() > new Date(latestCapturedAt).getTime(),
    );

    mergedHistory = {
      ...mergedHistory,
      closedAt: nextHistory.closedAt,
      latestCapturedAt: nextHistory.latestCapturedAt,
      latestChartOut: nextHistory.latestChartOut,
      latestRank: nextHistory.latestRank,
      positionId: nextHistory.positionId,
      sellRank: nextHistory.sellRank,
      status: nextHistory.status,
      points: dedupeMergedPoints(
        gapVideoPoints.length > 0 || trailingPoints.length > 0
          ? [...mergedHistory.points, ...gapVideoPoints, ...trailingPoints]
          : mergedHistory.points,
      ),
    };
  }

  return mergeRankHistories(mergedHistory, videoHistory);
}
