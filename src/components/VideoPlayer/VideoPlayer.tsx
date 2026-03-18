import './VideoPlayer.css';

const DEFAULT_VIDEO_ID = '61JHONRXhjs';

interface VideoPlayerProps {
  selectedVideoId?: string;
}

function VideoPlayer({ selectedVideoId }: VideoPlayerProps) {
  const videoId = selectedVideoId ?? DEFAULT_VIDEO_ID;

  return (
    <section className="video-player">
      <div className="video-player__frame">
        <iframe
          allowFullScreen
          key={videoId}
          src={`https://www.youtube.com/embed/${videoId}`}
          title="Selected YouTube video"
        />
      </div>
    </section>
  );
}

export default VideoPlayer;
