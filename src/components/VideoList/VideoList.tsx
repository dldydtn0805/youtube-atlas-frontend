import { YouTubeVideoItem } from '../../features/youtube/types';
import './VideoList.css';

interface VideoListProps {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  items: YouTubeVideoItem[];
  selectedVideoId?: string;
  onSelectVideo: (videoId: string) => void;
}

function VideoList({
  isLoading,
  isError,
  errorMessage,
  items,
  selectedVideoId,
  onSelectVideo,
}: VideoListProps) {
  if (isLoading) {
    return <p className="video-list__status">영상을 불러오는 중입니다.</p>;
  }

  if (isError) {
    return <p className="video-list__status">불러오기에 실패했습니다. {errorMessage}</p>;
  }

  if (items.length === 0) {
    return <p className="video-list__status">표시할 영상이 없습니다.</p>;
  }

  return (
    <section className="video-list" aria-label="인기 영상 목록">
      {items.map((item, index) => (
        <button
          key={item.id}
          className="video-card"
          data-active={selectedVideoId === item.id}
          onClick={() => onSelectVideo(item.id)}
          type="button"
        >
          <span className="video-card__rank">{index + 1}</span>
          <img
            className="video-card__thumbnail"
            src={item.snippet.thumbnails.high.url}
            alt={item.snippet.title}
          />
          <strong className="video-card__title">{item.snippet.title}</strong>
          <span className="video-card__channel">{item.snippet.channelTitle}</span>
        </button>
      ))}
    </section>
  );
}

export default VideoList;
