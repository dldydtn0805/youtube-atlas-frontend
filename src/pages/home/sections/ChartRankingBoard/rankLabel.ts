import type { YouTubeVideoItem } from '../../../../features/youtube/types';

const PENDING_RANK_LABELS = new Set(['현재 순위 확인 중', '현재 순위 미집계']);

function formatRank(rank: number) {
  return `${rank}위`;
}

export function resolveChartRankLabel(
  item: YouTubeVideoItem,
  suppliedLabel: string | undefined,
  index: number,
) {
  const currentRank = item.trend?.currentRank;

  if (typeof currentRank === 'number' && Number.isFinite(currentRank) && currentRank > 0) {
    return formatRank(currentRank);
  }

  if (suppliedLabel && !PENDING_RANK_LABELS.has(suppliedLabel)) {
    return suppliedLabel;
  }

  return formatRank(index + 1);
}
