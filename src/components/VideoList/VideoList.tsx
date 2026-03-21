import { YouTubeCategorySection } from '../../features/youtube/types';
import './VideoList.css';

interface VideoListProps {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  section?: YouTubeCategorySection;
  selectedVideoId?: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelectVideo: (videoId: string, triggerElement?: HTMLButtonElement) => void;
}

function VideoList({
  isLoading,
  isError,
  errorMessage,
  section,
  selectedVideoId,
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

  return (
    <div className="video-list" aria-label="선택한 카테고리 인기 영상 목록">
      <section className="video-list__section" aria-label={`${section.label} 인기 영상`}>
        <header className="video-list__section-header">
          <div>
            <p className="video-list__section-eyebrow">Category Ranking</p>
            <h3 className="video-list__section-title">{section.label}</h3>
          </div>
          <p className="video-list__section-description">{section.description}</p>
        </header>
        <div className="video-list__grid">
          {section.items.map((item, index) => (
            <button
              key={`${section.categoryId}-${item.id}`}
              className="video-card"
              data-active={selectedVideoId === item.id}
              onClick={(event) => onSelectVideo(item.id, event.currentTarget)}
              type="button"
            >
              <span className="video-card__rank">
                {section.label} #{index + 1}
              </span>
              <img
                className="video-card__thumbnail"
                src={item.snippet.thumbnails.high.url}
                alt={item.snippet.title}
              />
              <strong className="video-card__title">{item.snippet.title}</strong>
              <span className="video-card__channel">{item.snippet.channelTitle}</span>
            </button>
          ))}
        </div>
        {hasNextPage ? (
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
    </div>
  );
}

export default VideoList;
