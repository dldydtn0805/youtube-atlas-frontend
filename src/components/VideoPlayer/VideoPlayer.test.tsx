import { act, createRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VideoPlayer, { type VideoPlayerHandle } from './VideoPlayer';

type MockPlayerApi = {
  destroy: ReturnType<typeof vi.fn>;
  getCurrentTime: ReturnType<typeof vi.fn>;
  getPlayerState: ReturnType<typeof vi.fn>;
  getVideoData: ReturnType<typeof vi.fn>;
  loadVideoById: ReturnType<typeof vi.fn>;
  playVideo: ReturnType<typeof vi.fn>;
  seekTo: ReturnType<typeof vi.fn>;
  stopVideo: ReturnType<typeof vi.fn>;
};

describe('VideoPlayer', () => {
  let currentTimeSeconds = 0;
  let currentPlaybackVideoId = 'video-a';
  let onReady: YT.PlayerEvents['onReady'];
  let latestPlayerOptions: YT.PlayerOptions | undefined;
  let playerApi: MockPlayerApi;
  let playerConstructorCallCount = 0;

  beforeEach(() => {
    playerConstructorCallCount = 0;
    onReady = undefined;

    function Player(this: MockPlayerApi, _element: HTMLElement, configuration: YT.PlayerOptions) {
      playerConstructorCallCount += 1;
      onReady = configuration.events?.onReady;
      latestPlayerOptions = configuration;

      this.destroy = vi.fn();
      this.getCurrentTime = vi.fn(() => currentTimeSeconds);
      this.getPlayerState = vi.fn(() => 1);
      this.getVideoData = vi.fn(() => ({ video_id: currentPlaybackVideoId }));
      this.loadVideoById = vi.fn();
      this.playVideo = vi.fn();
      this.seekTo = vi.fn();
      this.stopVideo = vi.fn();
      playerApi = {
        destroy: this.destroy,
        getCurrentTime: this.getCurrentTime,
        getPlayerState: this.getPlayerState,
        getVideoData: this.getVideoData,
        loadVideoById: this.loadVideoById,
        playVideo: this.playVideo,
        seekTo: this.seekTo,
        stopVideo: this.stopVideo,
      };
    }

    Object.defineProperty(window, 'YT', {
      configurable: true,
      value: {
        Player,
        PlayerState: {
          ENDED: 0,
          PAUSED: 2,
          PLAYING: 1,
        },
      },
    });
  });

  afterEach(() => {
    delete (window as Window & { YT?: unknown }).YT;
  });

  it('loads the newly selected video without recreating the player', async () => {
    const { rerender } = render(<VideoPlayer selectedVideoId="video-a" />);

    await waitFor(() => expect(playerConstructorCallCount).toBe(1));

    act(() => {
      onReady?.({ target: playerApi as unknown as YT.Player });
    });

    currentTimeSeconds = 123;
    currentPlaybackVideoId = 'video-a';

    rerender(<VideoPlayer selectedVideoId="video-b" />);

    await waitFor(() => expect(playerApi.loadVideoById).toHaveBeenCalledWith('video-b'));
    expect(playerApi.playVideo).toHaveBeenCalled();
    expect(playerConstructorCallCount).toBe(1);
  });

  it('requests inline autoplay when the player becomes ready', async () => {
    render(<VideoPlayer selectedVideoId="video-a" />);

    await waitFor(() => expect(playerConstructorCallCount).toBe(1));

    expect(latestPlayerOptions?.playerVars).toMatchObject({
      autoplay: 1,
      playsinline: 1,
      rel: 0,
    });

    act(() => {
      onReady?.({ target: playerApi as unknown as YT.Player });
    });

    expect(playerApi.playVideo).toHaveBeenCalled();
  });

  it('returns the current playback snapshot from the forwarded ref', async () => {
    const playerRef = createRef<VideoPlayerHandle>();

    render(<VideoPlayer ref={playerRef} selectedVideoId="video-a" />);

    await waitFor(() => expect(playerConstructorCallCount).toBe(1));

    act(() => {
      onReady?.({ target: playerApi as unknown as YT.Player });
    });

    currentTimeSeconds = 87;
    currentPlaybackVideoId = 'video-a';

    expect(playerRef.current?.readPlaybackSnapshot()).toEqual({
      positionSeconds: 87,
      videoId: 'video-a',
    });
  });

  it('docks the existing player frame slot without recreating the player', async () => {
    const { container, rerender } = render(<VideoPlayer selectedVideoId="video-a" />);

    await waitFor(() => expect(playerConstructorCallCount).toBe(1));

    const playerFrameSlot = container.querySelector<HTMLElement>('.video-player__frame-slot');
    const playerFrame = container.querySelector('.video-player__frame');
    const videoPlayer = container.querySelector('.video-player');

    expect(playerFrameSlot).not.toBeNull();
    expect(playerFrame).not.toBeNull();

    rerender(
      <VideoPlayer
        dockStyle={{ height: '68px', left: '12px', top: '12px', width: '120px' }}
        isDocked
        selectedVideoId="video-a"
      />,
    );

    expect(container.querySelector('.video-player__frame-slot')).toBe(playerFrameSlot);
    expect(container.querySelector('.video-player__frame')).toBe(playerFrame);
    expect(playerFrameSlot).not.toHaveStyle({
      left: '12px',
      top: '12px',
    });
    expect(videoPlayer).toHaveStyle({
      height: '68px',
      left: '12px',
      position: 'fixed',
      top: '12px',
      width: '120px',
    });
    expect(playerConstructorCallCount).toBe(1);
    expect(playerApi.destroy).not.toHaveBeenCalled();

    rerender(<VideoPlayer selectedVideoId="video-a" />);

    expect(container.querySelector('.video-player__frame-slot')).toBe(playerFrameSlot);
    expect(container.querySelector('.video-player__frame')).toBe(playerFrame);
    expect(playerConstructorCallCount).toBe(1);
    expect(playerApi.destroy).not.toHaveBeenCalled();
  });
});
