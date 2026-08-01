import type { YouTubeVideoItem } from '../youtube/types';
import useMusicPlaylistExport from './useMusicPlaylistExport';
import './MusicPlaylistExportAction.css';

interface MusicPlaylistExportActionProps {
  isVisible: boolean;
  items: YouTubeVideoItem[];
  onRestoreMusicView: () => void;
  regionCode: string;
}

export default function MusicPlaylistExportAction({
  isVisible,
  items,
  onRestoreMusicView,
  regionCode,
}: MusicPlaylistExportActionProps) {
  const { exportLimit, startExport, state } = useMusicPlaylistExport(onRestoreMusicView);
  const itemCount = Math.min(items.length, exportLimit);
  const isPending = state.phase === 'authorizing' || state.phase === 'exporting';

  if (!isVisible && state.phase === 'idle') {
    return null;
  }

  return (
    <div className="music-playlist-export">
      <button
        aria-busy={isPending}
        className="music-playlist-export__button"
        disabled={isPending || itemCount === 0}
        onClick={() => void startExport(items, regionCode)}
        title="현재 음악 차트 상위 영상을 새 비공개 YouTube 재생목록에 담습니다."
        type="button"
      >
        {isPending ? (
          <span aria-hidden="true" className="music-playlist-export__spinner" />
        ) : (
          <span aria-hidden="true" className="music-playlist-export__youtube-mark">▶</span>
        )}
        {state.phase === 'authorizing'
          ? 'YouTube 연결 중'
          : state.phase === 'exporting'
            ? `${state.requestedCount}개 담는 중`
            : `YouTube TOP ${itemCount} 담기`}
      </button>
      {state.message ? (
        <p
          className="music-playlist-export__status"
          data-tone={state.phase === 'error' ? 'error' : state.phase}
          role={state.phase === 'error' ? 'alert' : 'status'}
        >
          {state.message}
          {state.result ? (
            <a href={state.result.playlistUrl} rel="noreferrer" target="_blank">
              YouTube에서 열기
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
