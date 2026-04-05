import { YouTubeCategorySection, YouTubeVideoItem } from '../../features/youtube/types';
import { formatCompactCount, getFallbackNewBadge, getVideoTrendBadges } from '../../features/trending/presentation';
import type { VideoTrendSignal } from '../../features/trending/types';
import './VideoList.css';

export interface FeaturedVideoSection {
  section: YouTubeCategorySection;
  eyebrow?: string;
  emptyMessage?: string;
  getRankLabel?: (item: YouTubeVideoItem, index: number) => string;
}

interface VideoListProps {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  section?: YouTubeCategorySection;
  sectionEmptyMessage?: string;
  getRankLabel?: (item: YouTubeVideoItem, index: number) => string;
  collapsedSectionIds?: string[];
  featuredSections?: FeaturedVideoSection[];
  hasResolvedTrendSignals?: boolean;
  isPrimarySectionCollapsible?: boolean;
  selectedVideoId?: string;
  trendSignalsByVideoId?: Record<string, VideoTrendSignal>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelectVideo: (
    videoId: string,
    sectionCategoryId: string,
    triggerElement?: HTMLButtonElement,
  ) => void;
  onToggleSectionCollapse?: (sectionId: string) => void;
  primarySectionCollapseKey?: string;
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
  sectionEmptyMessage,
  getRankLabel,
  collapsedSectionIds = [],
  featuredSections = [],
  hasResolvedTrendSignals = false,
  isPrimarySectionCollapsible = false,
  selectedVideoId,
  trendSignalsByVideoId,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelectVideo,
  onToggleSectionCollapse,
  primarySectionCollapseKey,
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

  const hasFeaturedContent = featuredSections.some(
    ({ section: featuredSection, emptyMessage }) =>
      featuredSection.items.length > 0 || Boolean(emptyMessage),
  );

  if (section.items.length === 0 && !hasFeaturedContent) {
    return (
      <p className="video-list__status">
        {sectionEmptyMessage ?? '이 카테고리에는 현재 표시할 영상이 없습니다.'}
      </p>
    );
  }

  function renderSection(
    currentSection: YouTubeCategorySection,
    {
      eyebrow,
      emptyMessage,
      getRankLabel,
      isCollapsible,
      isCollapsed,
      sectionKey,
      showLoadMore,
    }: {
      eyebrow: string;
      emptyMessage?: string;
      getRankLabel?: (item: YouTubeVideoItem, index: number) => string;
      isCollapsible?: boolean;
      isCollapsed?: boolean;
      sectionKey?: string;
      showLoadMore: boolean;
    },
  ) {
    if (currentSection.items.length === 0 && !emptyMessage) {
      return null;
    }

    return (
      <section key={sectionKey} className="video-list__section" aria-label={`${currentSection.label} 영상`}>
        <header className="video-list__section-header">
          <div className="video-list__section-header-main">
            <div>
              <p className="video-list__section-eyebrow">{eyebrow}</p>
              <div className="video-list__section-title-row">
                <h3 className="video-list__section-title">{currentSection.label}</h3>
                {isCollapsible && sectionKey ? (
                  <button
                    aria-expanded={!isCollapsed}
                    aria-label={isCollapsed ? `${currentSection.label} 펼치기` : `${currentSection.label} 숨기기`}
                    className="video-list__section-toggle"
                    data-active={isCollapsed}
                    onClick={() => onToggleSectionCollapse?.(sectionKey)}
                    type="button"
                  >
                    <span className="video-list__section-toggle-icon" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="video-list__section-header-side">
            <p className="video-list__section-description">{currentSection.description}</p>
          </div>
        </header>
        {!isCollapsed && currentSection.items.length > 0 ? (
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
                  onClick={(event) => onSelectVideo(item.id, currentSection.categoryId, event.currentTarget)}
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
        ) : !isCollapsed ? (
          <p className="video-list__section-status">{emptyMessage}</p>
        ) : null}
        {!isCollapsed && showLoadMore && hasNextPage ? (
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
      {featuredSections.map(({ section: featuredSection, eyebrow, emptyMessage, getRankLabel }) =>
        renderSection(featuredSection, {
          eyebrow: eyebrow ?? 'Realtime Movers',
          emptyMessage,
          getRankLabel,
          isCollapsible: true,
          isCollapsed: collapsedSectionIds.includes(featuredSection.categoryId),
          sectionKey: featuredSection.categoryId,
          showLoadMore: false,
        }),
      )}
      {renderSection(section, {
        eyebrow: 'Category Ranking',
        emptyMessage: sectionEmptyMessage,
        getRankLabel,
        isCollapsible: isPrimarySectionCollapsible,
        isCollapsed: primarySectionCollapseKey
          ? collapsedSectionIds.includes(primarySectionCollapseKey)
          : false,
        sectionKey: primarySectionCollapseKey,
        showLoadMore: true,
      })}
    </div>
  );
}

export default VideoList;
