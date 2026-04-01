import { YouTubeCategorySection, YouTubeVideoItem } from '../../features/youtube/types';
import { formatCompactCount, getFallbackNewBadge, getVideoTrendBadges } from '../../features/trending/presentation';
import type { VideoTrendSignal } from '../../features/trending/types';
import './VideoList.css';

interface VideoListProps {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  section?: YouTubeCategorySection;
  getRankLabel?: (item: YouTubeVideoItem, index: number) => string;
  featuredSection?: YouTubeCategorySection;
  featuredSectionEyebrow?: string;
  featuredSectionEmptyMessage?: string;
  getFeaturedRankLabel?: (item: YouTubeVideoItem, index: number) => string;
  hasResolvedTrendSignals?: boolean;
  selectedVideoId?: string;
  trendSignalsByVideoId?: Record<string, VideoTrendSignal>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelectVideo: (videoId: string, triggerElement?: HTMLButtonElement) => void;
}

function formatViewCount(viewCount?: string) {
  if (!viewCount) {
    return undefined;
  }

  const parsedViewCount = Number(viewCount);

  if (!Number.isFinite(parsedViewCount) || parsedViewCount < 0) {
    return undefined;
  }

  return `조회수 ${formatCompactCount(parsedViewCount)}`;
}

function VideoList({
  isLoading,
  isError,
  errorMessage,
  section,
  getRankLabel,
  featuredSection,
  featuredSectionEyebrow = 'Realtime Movers',
  featuredSectionEmptyMessage,
  getFeaturedRankLabel,
  hasResolvedTrendSignals = false,
  selectedVideoId,
  trendSignalsByVideoId,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelectVideo,
}: VideoListProps) {
  if (isLoading) {
    return <p className="video-list__status">영상을 불러오는 중입니다.</p>;
  }

  if (isError) {
    return <p className="video-list__status">불러오기에 실패했습니다. {errorMessage}</p>;
  }

  if (!section) {
    return <p className="video-list__status">카테고리를 먼저 선택해 주세요.</p>;
  }

  if (section.items.length === 0) {
    return <p className="video-list__status">이 카테고리에는 현재 표시할 영상이 없습니다.</p>;
  }

  function renderSection(
    currentSection: YouTubeCategorySection,
    {
      eyebrow,
      emptyMessage,
      getRankLabel,
      showLoadMore,
    }: {
      eyebrow: string;
      emptyMessage?: string;
      getRankLabel?: (item: YouTubeVideoItem, index: number) => string;
      showLoadMore: boolean;
    },
  ) {
    if (currentSection.items.length === 0 && !emptyMessage) {
      return null;
    }

    return (
      <section className="video-list__section" aria-label={`${currentSection.label} 영상`}>
        <header className="video-list__section-header">
          <div>
            <p className="video-list__section-eyebrow">{eyebrow}</p>
            <h3 className="video-list__section-title">{currentSection.label}</h3>
          </div>
          <p className="video-list__section-description">{currentSection.description}</p>
        </header>
        {currentSection.items.length > 0 ? (
          <div className="video-list__grid">
            {currentSection.items.map((item, index) => {
              const trendSignal = trendSignalsByVideoId?.[item.id];
              const trendBadges =
                trendSignal
                  ? getVideoTrendBadges(trendSignal)
                  : hasResolvedTrendSignals
                    ? [getFallbackNewBadge()]
                    : [];
              const rankLabel = getRankLabel?.(item, index) ?? `${currentSection.label} #${index + 1}`;
              const viewCountLabel = formatViewCount(item.statistics?.viewCount);

              return (
                <button
                  key={`${currentSection.categoryId}-${item.id}`}
                  className="video-card"
                  data-active={selectedVideoId === item.id}
                  onClick={(event) => onSelectVideo(item.id, event.currentTarget)}
                  type="button"
                >
                  <div className="video-card__meta-row">
                    <span className="video-card__rank">{rankLabel}</span>
                    {trendBadges.length > 0 ? (
                      <span className="video-card__trend-group" aria-label="급상승 신호">
                        {trendBadges.map((badge) => (
                          <span
                            key={`${item.id}-${badge.label}`}
                            className="video-card__trend-badge"
                            data-tone={badge.tone}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                  <img
                    className="video-card__thumbnail"
                    src={item.snippet.thumbnails.high.url}
                    alt={item.snippet.title}
                  />
                  <strong className="video-card__title">{item.snippet.title}</strong>
                  <div className="video-card__footer">
                    <span className="video-card__channel">{item.snippet.channelTitle}</span>
                    {viewCountLabel ? <span className="video-card__views">{viewCountLabel}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="video-list__section-status">{emptyMessage}</p>
        )}
        {showLoadMore && hasNextPage ? (
          <div className="video-list__actions">
            <button
              className="video-list__load-more"
              disabled={isFetchingNextPage}
              onClick={onLoadMore}
              type="button"
            >
              {isFetchingNextPage ? '더 불러오는 중...' : '50개 더 보기'}
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <div className="video-list" aria-label="선택한 카테고리 인기 영상 목록">
      {featuredSection
        ? renderSection(featuredSection, {
            eyebrow: featuredSectionEyebrow,
            emptyMessage: featuredSectionEmptyMessage,
            getRankLabel: getFeaturedRankLabel,
            showLoadMore: false,
          })
        : null}
      {renderSection(section, {
        eyebrow: 'Category Ranking',
        getRankLabel,
        showLoadMore: true,
      })}
    </div>
  );
}

export default VideoList;
