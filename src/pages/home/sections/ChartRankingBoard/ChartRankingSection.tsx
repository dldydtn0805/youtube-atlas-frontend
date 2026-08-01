import { useState } from 'react';
import type { MutableRefObject } from 'react';
import type { YouTubeCategorySection, YouTubeVideoItem } from '../../../../features/youtube/types';
import {
  formatRankingPrice,
  formatRankingViews,
  getRankingTrendBadge,
  getRankNumber,
} from './format';
import ChartRankingRow from './ChartRankingRow';
import ChartRankingTradeSheet from './ChartRankingTradeSheet';
import { resolveChartRankLabel } from './rankLabel';
import type { ChartRankingAction, ChartRankingBoardProps } from './types';

interface ChartRankingSectionProps {
  activePlaybackQueueId?: string;
  enableMobileTradeSheet?: boolean;
  emptyMessage?: string;
  eyebrow: string;
  getRankLabel?: (item: YouTubeVideoItem, index: number) => string;
  getTradeActionState?: ChartRankingBoardProps['getTradeActionState'];
  hasNextPage: boolean;
  hasResolvedTrendSignals: boolean;
  isCollapsed?: boolean;
  isCollapsible?: boolean;
  isFetchingNextPage: boolean;
  marketPriceByVideoId?: Record<string, number>;
  onOpenBuyTradeModal?: ChartRankingAction;
  onOpenChart?: ChartRankingAction;
  onOpenSellTradeModal?: ChartRankingAction;
  onSelectVideo: ChartRankingAction;
  onToggle?: () => void;
  loadMoreSentinelRef: MutableRefObject<HTMLDivElement | null>;
  section: YouTubeCategorySection;
  selectedVideoId?: string;
  shouldLoadMore?: boolean;
  trendSignalsByVideoId?: ChartRankingBoardProps['trendSignalsByVideoId'];
  visibleItems: YouTubeVideoItem[];
}

export default function ChartRankingSection({
  activePlaybackQueueId,
  enableMobileTradeSheet = false,
  emptyMessage,
  eyebrow,
  getRankLabel,
  getTradeActionState,
  hasNextPage,
  hasResolvedTrendSignals,
  isCollapsed = false,
  isCollapsible = false,
  isFetchingNextPage,
  marketPriceByVideoId,
  onOpenBuyTradeModal,
  onOpenChart,
  onOpenSellTradeModal,
  onSelectVideo,
  onToggle,
  loadMoreSentinelRef,
  section,
  selectedVideoId,
  shouldLoadMore = false,
  trendSignalsByVideoId,
  visibleItems,
}: ChartRankingSectionProps) {
  const [tradeSheetVideoId, setTradeSheetVideoId] = useState<string | null>(null);
  const tradeSheetVisibleIndex = visibleItems.findIndex((item) => item.id === tradeSheetVideoId);
  const tradeSheetItem = tradeSheetVisibleIndex >= 0 ? visibleItems[tradeSheetVisibleIndex] : null;
  const tradeSheetIndex = tradeSheetVisibleIndex >= 0 ? tradeSheetVisibleIndex : -1;
  const tradeSheetRankLabel = tradeSheetItem
    ? resolveChartRankLabel(tradeSheetItem, getRankLabel?.(tradeSheetItem, tradeSheetIndex), tradeSheetIndex)
    : '';
  const tradeSheetBadge = tradeSheetItem
    ? getRankingTrendBadge(tradeSheetItem, trendSignalsByVideoId, hasResolvedTrendSignals)
    : null;
  const tradeSheetActionState = tradeSheetItem ? getTradeActionState?.(tradeSheetItem) : undefined;

  return (
    <section className="chart-ranking-board__section" aria-label={`${section.label} 영상`}>
      <header className="chart-ranking-board__header">
        <div className="chart-ranking-board__title-wrap">
          <p className="chart-ranking-board__eyebrow">{eyebrow}</p>
          <div className="chart-ranking-board__title-row">
            <h3 className="chart-ranking-board__title-text">{section.label}</h3>
            {isCollapsible ? (
              <button
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? `${section.label} 펼치기` : `${section.label} 숨기기`}
                className="chart-ranking-board__toggle"
                data-active={isCollapsed}
                onClick={onToggle}
                type="button"
              >
                ▾
              </button>
            ) : null}
          </div>
        </div>
        <span className="chart-ranking-board__badge">TOP 200</span>
      </header>
      {!isCollapsed && visibleItems.length > 0 ? (
        <div className="chart-ranking-board__table-shell">
          <table className="chart-ranking-board__table">
            <thead>
              <tr>
                <th>순위</th>
                <th>등락</th>
                <th className="chart-ranking-board__left">영상</th>
                <th>현재가</th>
                <th>조회수</th>
                <th>거래</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item, visibleIndex) => {
                const index = visibleIndex;
                const rankLabel = resolveChartRankLabel(item, getRankLabel?.(item, index), index);
                const rankNumber = getRankNumber(item, rankLabel, index);
                const badge = getRankingTrendBadge(item, trendSignalsByVideoId, hasResolvedTrendSignals);
                const playbackQueueId = section.categoryId;
                const actionState = getTradeActionState?.(item);

                return (
                  <ChartRankingRow
                    actionState={actionState}
                    badge={badge}
                    isSelected={selectedVideoId === item.id && activePlaybackQueueId === playbackQueueId}
                    item={item}
                    key={`${section.categoryId}-${item.id}`}
                    onOpenBuyTradeModal={(triggerElement) =>
                      onOpenBuyTradeModal?.(item.id, playbackQueueId, triggerElement)
                    }
                    onOpenChart={(triggerElement) => {
                      if (onOpenChart) {
                        onOpenChart(item.id, playbackQueueId, triggerElement);
                        return;
                      }

                      onSelectVideo(item.id, playbackQueueId, triggerElement);
                    }}
                    onOpenSellTradeModal={(triggerElement) =>
                      onOpenSellTradeModal?.(item.id, playbackQueueId, triggerElement)
                    }
                    onOpenTradeSheet={
                      enableMobileTradeSheet && actionState
                        ? () => setTradeSheetVideoId(item.id)
                        : undefined
                    }
                    onSelectVideo={(triggerElement) => onSelectVideo(item.id, playbackQueueId, triggerElement)}
                    priceLabel={formatRankingPrice(marketPriceByVideoId?.[item.id])}
                    rankLabel={rankLabel}
                    rankNumber={rankNumber}
                    viewsLabel={formatRankingViews(item)}
                  />
                );
              })}
            </tbody>
          </table>
          {enableMobileTradeSheet && tradeSheetItem && tradeSheetActionState ? (
            <ChartRankingTradeSheet
              actionState={tradeSheetActionState}
              badge={tradeSheetBadge}
              isOpen
              item={tradeSheetItem}
              onClose={() => setTradeSheetVideoId(null)}
              onOpenBuyTradeModal={onOpenBuyTradeModal}
              onOpenSellTradeModal={onOpenSellTradeModal}
              playbackQueueId={section.categoryId}
              priceLabel={formatRankingPrice(marketPriceByVideoId?.[tradeSheetItem.id])}
              rankLabel={tradeSheetRankLabel}
              viewsLabel={formatRankingViews(tradeSheetItem)}
            />
          ) : null}
        </div>
      ) : !isCollapsed ? (
        <p className="chart-ranking-board__section-status">{emptyMessage}</p>
      ) : null}
      {!isCollapsed && hasNextPage && shouldLoadMore ? (
        <div className="chart-ranking-board__scroll-anchor-wrap" role="status" aria-live="polite">
          {isFetchingNextPage ? (
            <div className="chart-ranking-board__scroll-spinner-wrap">
              <span className="chart-ranking-board__scroll-spinner" aria-hidden="true" />
              <span className="sr-only">다음 영상을 불러오는 중</span>
            </div>
          ) : null}
          <div
            aria-hidden="true"
            className="chart-ranking-board__scroll-anchor"
            ref={loadMoreSentinelRef}
          />
        </div>
      ) : null}
    </section>
  );
}
