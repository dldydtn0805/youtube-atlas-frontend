import { memo, useEffect, useRef, useState } from 'react';
import { CHART_RANKING_PAGE_SIZE } from './constants';
import ChartRankingSection from './ChartRankingSection';
import { getPageCount, getSectionRenderKey, shouldPrefetchNextPage } from './pagination';
import type { ChartRankingBoardProps } from './types';
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
  const [pageIndexBySectionKey, setPageIndexBySectionKey] = useState<Record<string, number>>({});
  const [prefetchAllSectionKey, setPrefetchAllSectionKey] = useState<string | null>(null);
  const prefetchedItemCountBySectionKey = useRef<Record<string, number>>({});
  const resetKey = [
    ...featuredSections.map(({ section: featuredSection }) => featuredSection.categoryId),
    section ? `${primarySectionCollapseKey ?? section.categoryId}:${section.categoryId}` : 'none',
  ].join('|');

  useEffect(() => {
    setPageIndexBySectionKey({});
    setPrefetchAllSectionKey(null);
    prefetchedItemCountBySectionKey.current = {};
  }, [resetKey]);

  useEffect(() => {
    if (!prefetchAllSectionKey || !section || prefetchAllSectionKey !== (primarySectionCollapseKey ?? section.categoryId)) {
      return;
    }

    if (!hasNextPage) {
      setPrefetchAllSectionKey(null);
      return;
    }

    if (!isFetchingNextPage) {
      onLoadMore();
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore, prefetchAllSectionKey, primarySectionCollapseKey, section]);

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
      showLoadMore: boolean;
    },
  ) => {
    if (currentSection.items.length === 0 && !options.emptyMessage) {
      return null;
    }

    const sectionKey = options.sectionKey ?? currentSection.categoryId;
    const storedPageIndex = pageIndexBySectionKey[sectionKey] ?? 0;
    const loadedPageCount = Math.max(1, Math.ceil(currentSection.items.length / CHART_RANKING_PAGE_SIZE));
    const totalPages = getPageCount(currentSection.items.length, hasNextPage);
    const currentPageIndex = options.showLoadMore ? Math.min(storedPageIndex, loadedPageCount - 1) : 0;
    const pageStartIndex = currentPageIndex * CHART_RANKING_PAGE_SIZE;
    const pageEndIndex = pageStartIndex + CHART_RANKING_PAGE_SIZE;
    const visibleItems = options.showLoadMore
      ? currentSection.items.slice(pageStartIndex, pageEndIndex)
      : currentSection.items;
    const canGoNext = options.showLoadMore && (pageEndIndex < currentSection.items.length || hasNextPage);
    const canGoPrevious = options.showLoadMore && currentPageIndex > 0;
    const isPrefetchingAllPages = prefetchAllSectionKey === sectionKey && hasNextPage;

    const handlePageChange = (nextPageIndex: number) => {
      const safePageIndex = Math.min(Math.max(nextPageIndex, 0), totalPages - 1);
      const hasPrefetchedCurrentItems =
        prefetchedItemCountBySectionKey.current[sectionKey] === currentSection.items.length;

      setPageIndexBySectionKey((currentValue) => ({ ...currentValue, [sectionKey]: safePageIndex }));

      if (
        !isFetchingNextPage &&
        hasNextPage &&
        !hasPrefetchedCurrentItems &&
        shouldPrefetchNextPage(safePageIndex, loadedPageCount)
      ) {
        prefetchedItemCountBySectionKey.current[sectionKey] = currentSection.items.length;
        onLoadMore();
      }
    };

    return (
      <ChartRankingSection
        activePlaybackQueueId={activePlaybackQueueId}
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
        currentPage={currentPageIndex + 1}
        enableMobileTradeSheet={enableMobileTradeSheet}
        emptyMessage={options.emptyMessage}
        eyebrow={options.eyebrow}
        getRankLabel={options.getRankLabel}
        getTradeActionState={getTradeActionState}
        hasNextPage={hasNextPage}
        hasResolvedTrendSignals={hasResolvedTrendSignals}
        isCollapsed={options.isCollapsed}
        isCollapsible={options.isCollapsible}
        isPrefetchingAllPages={isPrefetchingAllPages}
        key={getSectionRenderKey(currentSection.items.map((item) => item.id), sectionKey)}
        marketPriceByVideoId={marketPriceByVideoId}
        onOpenBuyTradeModal={onOpenBuyTradeModal}
        onOpenChart={onOpenChart}
        onOpenPageSelect={() => setPrefetchAllSectionKey(sectionKey)}
        onOpenSellTradeModal={onOpenSellTradeModal}
        onPageChange={handlePageChange}
        onSelectVideo={onSelectVideo}
        onToggle={() => onToggleSectionCollapse?.(sectionKey)}
        pageStartIndex={pageStartIndex}
        section={currentSection}
        selectedVideoId={selectedVideoId}
        shouldPaginate={options.showLoadMore}
        totalPages={totalPages}
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
          showLoadMore: false,
        }),
      )}
      {renderSection(section, {
        emptyMessage: sectionEmptyMessage,
        eyebrow: primarySectionEyebrow,
        getRankLabel,
        isCollapsed: primarySectionCollapseKey ? collapsedSectionIds.includes(primarySectionCollapseKey) : false,
        isCollapsible: isPrimarySectionCollapsible,
        sectionKey: primarySectionCollapseKey,
        showLoadMore: true,
      })}
    </div>
  );
}

export default memo(ChartRankingBoard);
