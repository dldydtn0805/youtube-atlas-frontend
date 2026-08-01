import {
  formatCompactCount,
  getFallbackNewBadge,
  getPrimaryVideoTrendBadge,
} from "../../../../features/trending/presentation";
import type { VideoTrendSignal } from "../../../../features/trending/types";
import type { YouTubeVideoItem } from "../../../../features/youtube/types";

type TrendBadgeSignal = Pick<
  VideoTrendSignal,
  "isNew" | "previousRank" | "rankChange"
>;

function getItemViewCount(item: YouTubeVideoItem) {
  if (typeof item.trend?.currentViewCount === "number") {
    return item.trend.currentViewCount;
  }

  const parsedViewCount = Number(item.statistics?.viewCount);

  return Number.isFinite(parsedViewCount) && parsedViewCount >= 0
    ? parsedViewCount
    : null;
}

function hasInlineTrendData(item: YouTubeVideoItem) {
  return Boolean(
    item.trend &&
    (item.trend.isNew === true ||
      typeof item.trend.previousRank === "number" ||
      typeof item.trend.rankChange === "number"),
  );
}

export function formatRankingPrice(points?: number) {
  return typeof points === "number" && Number.isFinite(points) && points >= 0
    ? `${points.toLocaleString("ko-KR")}P`
    : "-";
}

export function formatRankingViews(item: YouTubeVideoItem) {
  const viewCount = getItemViewCount(item);

  return typeof viewCount === "number" ? formatCompactCount(viewCount) : "-";
}

export function resolveTrendBadgeSignal(
  item: YouTubeVideoItem,
  trendSignalsByVideoId?: Record<string, VideoTrendSignal>,
): TrendBadgeSignal | undefined {
  if (hasInlineTrendData(item)) {
    return {
      isNew: item.trend?.isNew ?? false,
      previousRank: item.trend?.previousRank ?? null,
      rankChange: item.trend?.rankChange ?? null,
    };
  }

  return trendSignalsByVideoId?.[item.id];
}

export function getRankingTrendBadge(
  item: YouTubeVideoItem,
  trendSignalsByVideoId: Record<string, VideoTrendSignal> | undefined,
  hasResolvedTrendSignals: boolean,
) {
  const trendBadge = getPrimaryVideoTrendBadge(
    resolveTrendBadgeSignal(item, trendSignalsByVideoId),
  );

  return trendBadge ?? (hasResolvedTrendSignals ? getFallbackNewBadge() : null);
}

export function getRankNumber(item: YouTubeVideoItem, rankLabel: string) {
  if (typeof item.trend?.currentRank === "number") {
    return item.trend.currentRank;
  }

  const match = rankLabel.match(/\d+/);

  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}
