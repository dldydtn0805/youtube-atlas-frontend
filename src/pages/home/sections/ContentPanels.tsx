import { memo, useState } from 'react';
import CommentSection from '../../../components/CommentSection/CommentSection';
import VideoList, { type FeaturedVideoSection } from '../../../components/VideoList/VideoList';
import type { AuthStatus } from '../../../features/auth/types';
import type { FavoriteStreamer } from '../../../features/favorites/types';
import type { GameMarketVideo } from '../../../features/game/types';
import type { VideoTrendSignal } from '../../../features/trending/types';
import type { YouTubeCategorySection, YouTubeVideoItem } from '../../../features/youtube/types';
import { QuickViewButtons, type ViewOption } from './FilterPanels';
import type { ChartSortMode } from '../types';
import './ContentPanels.css';

interface ChartSortOption {
  id: ChartSortMode;
  label: string;
}

interface ChartPanelProps {
  activePlaybackQueueId?: string;
  chartErrorMessage?: string;
  marketPriceByVideoId?: Record<string, GameMarketVideo['currentPricePoints']>;
  chartSortMode: ChartSortMode;
  chartSortOptions: ChartSortOption[];
  className?: string;
  collapsedFeaturedSectionIds?: string[];
  currentTierCode?: string;
  featuredSections?: FeaturedVideoSection[];
  getRankLabel?: (item: YouTubeVideoItem, index: number) => string;
  hasNextPage: boolean;
  hasResolvedTrendSignals: boolean;
  isChartError: boolean;
  isChartLoading: boolean;
  isFetchingNextPage: boolean;
  mainSectionCollapseKey?: string;
  onChangeChartSortMode: (sortMode: ChartSortMode) => void;
  onLoadMore: () => void;
  onOpenChart?: (
    videoId: string,
    playbackQueueId: string,
    triggerElement?: HTMLButtonElement,
  ) => void;
  onOpenRegionModal: () => void;
  onSelectView: (viewId: string, triggerElement?: HTMLButtonElement) => void;
  onToggleFeaturedSectionCollapse?: (sectionId: string) => void;
  onSelectVideo: (
    videoId: string,
    playbackQueueId: string,
    triggerElement?: HTMLButtonElement,
  ) => void;
  primarySectionEyebrow?: string;
  section?: YouTubeCategorySection;
  sectionEmptyMessage?: string;
  selectedCategoryLabel?: string;
  selectedCountryName: string;
  selectedViewId: string;
  selectedVideoId?: string;
  trendSignalsByVideoId: Record<string, VideoTrendSignal>;
  viewOptions: ViewOption[];
}

interface FavoriteVideosPanelProps {
  activePlaybackQueueId?: string;
  authStatus: AuthStatus;
  favoriteStreamerCount: number;
  favoriteStreamerVideoErrorMessage: string;
  favoriteStreamerVideoSection?: YouTubeCategorySection;
  favoriteStreamers: FavoriteStreamer[];
  favoriteTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  hasNextPage: boolean;
  hasResolvedTrendSignals: boolean;
  isCollapsed: boolean;
  isCinematicModeActive: boolean;
  isFavoriteStreamerVideosError: boolean;
  isFavoriteStreamerVideosLoading: boolean;
  isFavoriteStreamersError: boolean;
  isFavoriteStreamersLoading: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelectVideo: (
    videoId: string,
    playbackQueueId: string,
    triggerElement?: HTMLButtonElement,
  ) => void;
  onToggleCollapse: () => void;
  selectedCountryName: string;
  selectedVideoId?: string;
  trendSignalsByVideoId: Record<string, VideoTrendSignal>;
}

interface CommunityPanelProps {
  selectedVideoId?: string;
  selectedVideoTitle?: string;
}

export const ChartPanel = memo(function ChartPanel({
  activePlaybackQueueId,
  chartErrorMessage,
  marketPriceByVideoId,
  chartSortMode,
  chartSortOptions,
  className,
  collapsedFeaturedSectionIds,
  currentTierCode,
  featuredSections,
  getRankLabel,
  hasNextPage,
  hasResolvedTrendSignals,
  isChartError,
  isChartLoading,
  isFetchingNextPage,
  mainSectionCollapseKey,
  onChangeChartSortMode,
  onLoadMore,
  onOpenChart,
  onOpenRegionModal,
  onSelectView,
  onToggleFeaturedSectionCollapse,
  onSelectVideo,
  primarySectionEyebrow,
  section,
  sectionEmptyMessage,
  selectedCategoryLabel,
  selectedCountryName,
  selectedViewId,
  selectedVideoId,
  trendSignalsByVideoId,
  viewOptions,
}: ChartPanelProps) {
  const panelClassName = className
    ? `app-shell__panel app-shell__panel--chart ${className}`
    : 'app-shell__panel app-shell__panel--chart';

  return (
    <section className={panelClassName}>
      <div className="app-shell__chart-explore">
        <div className="app-shell__chart-explore-copy">
          <p className="app-shell__section-eyebrow">Explore</p>
          <h3 className="app-shell__chart-explore-title">
            <button className="app-shell__section-title-button" onClick={onOpenRegionModal} type="button">
              {selectedCountryName}
            </button>{' '}
            탐색 필터
          </h3>
          <p className="app-shell__chart-explore-helper">
            국가명을 클릭하면 다른 국가 차트로 바꿀 수 있어요.
          </p>
        </div>
        <div className="app-shell__quick-category-group" aria-label="탐색 필터 선택">
          <QuickViewButtons onSelectView={onSelectView} options={viewOptions} selectedViewId={selectedViewId} />
        </div>
      </div>
      <div className="app-shell__section-heading app-shell__section-heading--chart">
        <div className="app-shell__section-heading-copy">
          <p className="app-shell__section-eyebrow">Program Queue</p>
          <h2 className="app-shell__section-title">인기 영상</h2>
        </div>
        <div className="app-shell__chart-controls">
          <p className="app-shell__chart-context">
            {selectedCountryName}
            {selectedCategoryLabel ? ` · ${selectedCategoryLabel}` : ''}
          </p>
          <div className="app-shell__chart-filter-actions">
            <label className="app-shell__chart-sort-field">
              <select
                aria-label="인기 영상 정렬"
                className="app-shell__chart-sort-select"
                onChange={(event) => onChangeChartSortMode(event.target.value as ChartSortMode)}
                value={chartSortMode}
              >
                {chartSortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>
      <VideoList
        activePlaybackQueueId={activePlaybackQueueId}
        collapsedSectionIds={collapsedFeaturedSectionIds}
        currentTierCode={currentTierCode}
        errorMessage={chartErrorMessage}
        featuredSections={featuredSections}
        getRankLabel={getRankLabel}
        hasNextPage={hasNextPage}
        hasResolvedTrendSignals={hasResolvedTrendSignals}
        isError={isChartError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isChartLoading}
        isPrimarySectionCollapsible={Boolean(mainSectionCollapseKey)}
        marketPriceByVideoId={marketPriceByVideoId}
        primarySectionEyebrow={primarySectionEyebrow}
        primarySectionCollapseKey={mainSectionCollapseKey}
        onLoadMore={onLoadMore}
        onOpenChart={onOpenChart}
        onSelectVideo={onSelectVideo}
        onToggleSectionCollapse={onToggleFeaturedSectionCollapse}
        section={section}
        sectionEmptyMessage={sectionEmptyMessage}
        selectedVideoId={selectedVideoId}
        trendSignalsByVideoId={trendSignalsByVideoId}
      />
    </section>
  );
});

export const FavoriteVideosPanel = memo(function FavoriteVideosPanel({
  activePlaybackQueueId,
  authStatus,
  favoriteStreamerCount,
  favoriteStreamerVideoErrorMessage,
  favoriteStreamerVideoSection,
  favoriteStreamers,
  favoriteTrendSignalsByVideoId,
  hasNextPage,
  hasResolvedTrendSignals,
  isCollapsed,
  isCinematicModeActive,
  isFavoriteStreamerVideosError,
  isFavoriteStreamerVideosLoading,
  isFavoriteStreamersError,
  isFavoriteStreamersLoading,
  isFetchingNextPage,
  onLoadMore,
  onSelectVideo,
  onToggleCollapse,
  selectedCountryName,
  selectedVideoId,
  trendSignalsByVideoId,
}: FavoriteVideosPanelProps) {
  const panelClassName = isCinematicModeActive
    ? 'app-shell__panel app-shell__panel--favorites app-shell__panel--chart-cinematic'
    : 'app-shell__panel app-shell__panel--favorites app-shell__panel--chart';

  return (
    <section className={panelClassName}>
      <div className="app-shell__section-heading app-shell__section-heading--chart">
        <div className="app-shell__section-heading-copy">
          <p className="app-shell__section-eyebrow">Favorite Videos</p>
          <div className="app-shell__section-title-row">
            <h2 className="app-shell__section-title">{selectedCountryName} 기준 즐겨찾기 채널</h2>
            <button
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? '즐겨찾기 채널 펼치기' : '즐겨찾기 채널 숨기기'}
              className="app-shell__collapse-toggle"
              data-active={isCollapsed}
              onClick={onToggleCollapse}
              type="button"
            >
              <span className="app-shell__collapse-toggle-icon" aria-hidden="true">
                ▾
              </span>
            </button>
          </div>
        </div>
      </div>
      {isCollapsed ? null : authStatus !== 'authenticated' ? (
        <p className="app-shell__favorites-status">
          로그인하면 저장한 채널의 인기 영상을 여기에서 모아 볼 수 있습니다.
        </p>
      ) : isFavoriteStreamersLoading ? (
        <p className="app-shell__favorites-status">
          즐겨찾기 채널을 확인한 뒤 영상 목록을 준비하고 있습니다.
        </p>
      ) : isFavoriteStreamersError ? (
        <p className="app-shell__favorites-status">
          즐겨찾기 채널을 불러오지 못해 영상 목록을 준비하지 못했습니다.
        </p>
      ) : favoriteStreamerCount === 0 || favoriteStreamers.length === 0 ? (
        <p className="app-shell__favorites-status">
          저장한 채널이 생기면 해당 채널의 인기 영상을 여기에서 바로 볼 수 있습니다.
        </p>
      ) : (
        <VideoList
          activePlaybackQueueId={activePlaybackQueueId}
          errorMessage={favoriteStreamerVideoErrorMessage}
          getRankLabel={(item) => {
            const signal = favoriteTrendSignalsByVideoId[item.id];

            if (signal?.currentRank) {
              return `현재 ${signal.currentRank}위`;
            }

            return hasResolvedTrendSignals ? '현재 순위 미집계' : '현재 순위 확인 중';
          }}
          hasNextPage={hasNextPage}
          hasResolvedTrendSignals={hasResolvedTrendSignals}
          isError={isFavoriteStreamerVideosError}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isFavoriteStreamerVideosLoading}
          onLoadMore={onLoadMore}
          onSelectVideo={onSelectVideo}
          section={favoriteStreamerVideoSection}
          selectedVideoId={selectedVideoId}
          trendSignalsByVideoId={trendSignalsByVideoId}
        />
      )}
    </section>
  );
});

export const CommunityPanel = memo(function CommunityPanel({ selectedVideoId, selectedVideoTitle }: CommunityPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <section className="app-shell__panel app-shell__panel--community">
      <div className="app-shell__section-heading">
        <div className="app-shell__section-heading-copy">
          <p className="app-shell__section-eyebrow">Live Chat</p>
          <div className="app-shell__section-title-row">
            <h2 className="app-shell__section-title">실시간 채팅</h2>
            <button
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? '실시간 채팅 펼치기' : '실시간 채팅 숨기기'}
              className="app-shell__collapse-toggle"
              data-active={isCollapsed}
              onClick={() => setIsCollapsed((current) => !current)}
              type="button"
            >
              <span className="app-shell__collapse-toggle-icon" aria-hidden="true">
                ▾
              </span>
            </button>
          </div>
        </div>
      </div>
      {isCollapsed ? null : <CommentSection videoId={selectedVideoId} videoTitle={selectedVideoTitle} />}
    </section>
  );
});
