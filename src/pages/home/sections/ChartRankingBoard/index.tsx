import { memo, useRef } from 'react';
import ChartRankingSection from './ChartRankingSection';
import { getSectionRenderKey } from './pagination';
import type { ChartRankingBoardProps } from './types';
import useInfiniteScrollTrigger from './useInfiniteScrollTrigger';
import './ChartRankingBoard.css';
import './ChartRankingTable.css';
import './ChartRankingResponsive.css';
import './ChartRankingMobileFrame.css';

function ChartRankingBoard({
  activePlaybackQueueId,
  collapsedSectionIds = [],
  currentTierCode,
  enableMobileTradeSheet = false,
  errorMessage,
  featuredSections = [],
  getRankLabel,
  getTradeActionState,
  hasNextPage,
  hasResolvedTrendSignals = false,
  isError,
  isFetchingNextPage,
  isLoading,
  isPrimarySectionCollapsible = false,
  marketPriceByVideoId,
  onLoadMore,
  onOpenBuyTradeModal,
  onOpenChart,
  onOpenSellTradeModal,
  onSelectVideo,
  onToggleSectionCollapse,
  primarySectionCollapseKey,
  primarySectionEyebrow = 'Category Ranking',
  section,
  sectionEmptyMessage,
  selectedVideoId,
  trendSignalsByVideoId,
}: ChartRankingBoardProps) {
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useInfiniteScrollTrigger({
    enabled: Boolean(section) && hasNextPage,
    onReachEnd: () => {
      if (!isFetchingNextPage) {
        onLoadMore();
      }
    },
    targetRef: loadMoreSentinelRef,
  });

  if (isLoading) {
    return <p className="chart-ranking-board__status">영상을 불러오는 중입니다.</p>;
  }

  if (isError) {
    return <p className="chart-ranking-board__status">불러오기에 실패했습니다. {errorMessage}</p>;
  }

  if (!section) {
    return <p className="chart-ranking-board__status">카테고리를 먼저 선택해 주세요.</p>;
  }

  const hasFeaturedContent = featuredSections.some(
    ({ section: featuredSection, emptyMessage }) => featuredSection.items.length > 0 || Boolean(emptyMessage),
  );

  if (section.items.length === 0 && !hasFeaturedContent) {
    return (
      <p className="chart-ranking-board__status">
        {sectionEmptyMessage ?? '이 카테고리에는 현재 표시할 영상이 없습니다.'}
      </p>
    );
  }

  const renderSection = (
    currentSection: typeof section,
    options: {
      emptyMessage?: string;
      eyebrow: string;
      getRankLabel?: ChartRankingBoardProps['getRankLabel'];
      isCollapsible?: boolean;
      isCollapsed?: boolean;
      sectionKey?: string;
      shouldLoadMore?: boolean;
    },
  ) => {
    if (currentSection.items.length === 0 && !options.emptyMessage) {
      return null;
    }

    const sectionKey = options.sectionKey ?? currentSection.categoryId;
    const visibleItems = currentSection.items;

    return (
      <ChartRankingSection
        activePlaybackQueueId={activePlaybackQueueId}
        enableMobileTradeSheet={enableMobileTradeSheet}
        emptyMessage={options.emptyMessage}
        eyebrow={options.eyebrow}
        getRankLabel={options.getRankLabel}
        getTradeActionState={getTradeActionState}
        hasNextPage={hasNextPage}
        hasResolvedTrendSignals={hasResolvedTrendSignals}
        isCollapsed={options.isCollapsed}
        isCollapsible={options.isCollapsible}
        key={getSectionRenderKey(currentSection.items.map((item) => item.id), sectionKey)}
        marketPriceByVideoId={marketPriceByVideoId}
        isFetchingNextPage={isFetchingNextPage}
        loadMoreSentinelRef={loadMoreSentinelRef}
        onOpenBuyTradeModal={onOpenBuyTradeModal}
        onOpenChart={onOpenChart}
        onOpenSellTradeModal={onOpenSellTradeModal}
        onSelectVideo={onSelectVideo}
        onToggle={() => onToggleSectionCollapse?.(sectionKey)}
        section={currentSection}
        selectedVideoId={selectedVideoId}
        shouldLoadMore={options.shouldLoadMore}
        trendSignalsByVideoId={trendSignalsByVideoId}
        visibleItems={visibleItems}
      />
    );
  };

  return (
    <div
      className="chart-ranking-board"
      data-current-tier={currentTierCode}
      data-mobile-trade-sheet={enableMobileTradeSheet ? 'true' : undefined}
    >
      {featuredSections.map(({ section: featuredSection, eyebrow, emptyMessage, getRankLabel }) =>
        renderSection(featuredSection, {
          emptyMessage,
          eyebrow: eyebrow ?? 'Realtime Movers',
          getRankLabel,
          isCollapsed: collapsedSectionIds.includes(featuredSection.categoryId),
          isCollapsible: true,
          sectionKey: featuredSection.categoryId,
          shouldLoadMore: false,
        }),
      )}
      {renderSection(section, {
        emptyMessage: sectionEmptyMessage,
        eyebrow: primarySectionEyebrow,
        getRankLabel,
        isCollapsed: primarySectionCollapseKey ? collapsedSectionIds.includes(primarySectionCollapseKey) : false,
        isCollapsible: isPrimarySectionCollapsible,
        sectionKey: primarySectionCollapseKey,
        shouldLoadMore: true,
      })}
    </div>
  );
}

export default memo(ChartRankingBoard);
