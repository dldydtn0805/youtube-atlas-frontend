import CommentSection from '../../../components/CommentSection/CommentSection';
import VideoList, { type FeaturedVideoSection } from '../../../components/VideoList/VideoList';
import type { AuthStatus } from '../../../features/auth/types';
import type { FavoriteStreamer } from '../../../features/favorites/types';
import type { VideoTrendSignal } from '../../../features/trending/types';
import type { YouTubeCategorySection } from '../../../features/youtube/types';

interface ChartPanelProps {
  buyableVideoSearchStatus?: string;
  chartErrorMessage?: string;
  className?: string;
  featuredSections?: FeaturedVideoSection[];
  hasNextPage: boolean;
  hasResolvedTrendSignals: boolean;
  isBuyableOnlyFilterActive?: boolean;
  isBuyableOnlyFilterAvailable?: boolean;
  isChartError: boolean;
  isChartLoading: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onToggleBuyableOnlyFilter?: () => void;
  onSelectVideo: (
    videoId: string,
    playbackQueueId: string,
    triggerElement?: HTMLButtonElement,
  ) => void;
  section?: YouTubeCategorySection;
  selectedCategoryLabel?: string;
  selectedVideoId?: string;
  trendSignalsByVideoId: Record<string, VideoTrendSignal>;
}

interface FavoriteVideosPanelProps {
  authStatus: AuthStatus;
  favoriteStreamerCount: number;
  favoriteStreamerVideoErrorMessage: string;
  favoriteStreamerVideoSection?: YouTubeCategorySection;
  favoriteStreamers: FavoriteStreamer[];
  favoriteTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  hasNextPage: boolean;
  hasResolvedTrendSignals: boolean;
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
  selectedCountryName: string;
  selectedVideoId?: string;
  trendSignalsByVideoId: Record<string, VideoTrendSignal>;
}

interface CommunityPanelProps {
  selectedVideoId?: string;
  selectedVideoTitle?: string;
}

export function ChartPanel({
  buyableVideoSearchStatus,
  chartErrorMessage,
  className,
  featuredSections,
  hasNextPage,
  hasResolvedTrendSignals,
  isBuyableOnlyFilterActive = false,
  isBuyableOnlyFilterAvailable = false,
  isChartError,
  isChartLoading,
  isFetchingNextPage,
  onLoadMore,
  onToggleBuyableOnlyFilter,
  onSelectVideo,
  section,
  selectedCategoryLabel,
  selectedVideoId,
  trendSignalsByVideoId,
}: ChartPanelProps) {
  const panelClassName = className
    ? `app-shell__panel app-shell__panel--chart ${className}`
    : 'app-shell__panel app-shell__panel--chart';

  return (
    <section className={panelClassName}>
      <div className="app-shell__section-heading app-shell__section-heading--chart">
        <div className="app-shell__section-heading-copy">
          <p className="app-shell__section-eyebrow">Program Queue</p>
          <h2 className="app-shell__section-title">{selectedCategoryLabel ?? '선택한 카테고리'} 인기 영상</h2>
        </div>
        {isBuyableOnlyFilterAvailable ? (
          <div className="app-shell__chart-filter-group">
            <button
              className="app-shell__subtle-toggle"
              data-active={isBuyableOnlyFilterActive}
              onClick={onToggleBuyableOnlyFilter}
              type="button"
            >
              매수 가능 목록 탐색
            </button>
            {buyableVideoSearchStatus ? (
              <p className="app-shell__chart-filter-status">{buyableVideoSearchStatus}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <VideoList
        errorMessage={chartErrorMessage}
        featuredSections={featuredSections}
        hasNextPage={hasNextPage}
        hasResolvedTrendSignals={hasResolvedTrendSignals}
        isError={isChartError}
        isFetchingNextPage={isFetchingNextPage}
        isLoading={isChartLoading}
        onLoadMore={onLoadMore}
        onSelectVideo={onSelectVideo}
        section={section}
        sectionEmptyMessage={
          isBuyableOnlyFilterActive
            ? '지금 매수 가능한 영상이 없습니다. 더 불러오거나 필터를 해제해 보세요.'
            : undefined
        }
        selectedVideoId={selectedVideoId}
        trendSignalsByVideoId={trendSignalsByVideoId}
      />
    </section>
  );
}

export function FavoriteVideosPanel({
  authStatus,
  favoriteStreamerCount,
  favoriteStreamerVideoErrorMessage,
  favoriteStreamerVideoSection,
  favoriteStreamers,
  favoriteTrendSignalsByVideoId,
  hasNextPage,
  hasResolvedTrendSignals,
  isCinematicModeActive,
  isFavoriteStreamerVideosError,
  isFavoriteStreamerVideosLoading,
  isFavoriteStreamersError,
  isFavoriteStreamersLoading,
  isFetchingNextPage,
  onLoadMore,
  onSelectVideo,
  selectedCountryName,
  selectedVideoId,
  trendSignalsByVideoId,
}: FavoriteVideosPanelProps) {
  const panelClassName = isCinematicModeActive
    ? 'app-shell__panel app-shell__panel--favorites app-shell__panel--chart-cinematic'
    : 'app-shell__panel app-shell__panel--favorites app-shell__panel--chart';

  return (
    <section className={panelClassName}>
      <div className="app-shell__section-heading">
        <p className="app-shell__section-eyebrow">Favorite Videos</p>
        <h2 className="app-shell__section-title">{selectedCountryName} 기준 즐겨찾기 영상</h2>
      </div>
      {authStatus !== 'authenticated' ? (
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
}

export function CommunityPanel({ selectedVideoId, selectedVideoTitle }: CommunityPanelProps) {
  return (
    <section className="app-shell__panel app-shell__panel--community">
      <div className="app-shell__section-heading">
        <p className="app-shell__section-eyebrow">Live Chat</p>
        <h2 className="app-shell__section-title">실시간 채팅</h2>
      </div>
      <CommentSection videoId={selectedVideoId} videoTitle={selectedVideoTitle} />
    </section>
  );
}
