import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VideoPlayer from './VideoPlayer';

type MockPlayerApi = {
  destroy: ReturnType<typeof vi.fn>;
  getCurrentTime: ReturnType<typeof vi.fn>;
  getPlayerState: ReturnType<typeof vi.fn>;
  getVideoData: ReturnType<typeof vi.fn>;
  loadVideoById: ReturnType<typeof vi.fn>;
  seekTo: ReturnType<typeof vi.fn>;
  stopVideo: ReturnType<typeof vi.fn>;
};

describe('VideoPlayer', () => {
  let currentTimeSeconds = 0;
  let currentPlaybackVideoId = 'video-a';
  let onReady: YT.PlayerEvents['onReady'];
  let onStateChange: YT.PlayerEvents['onStateChange'];
  let playerApi: MockPlayerApi;
  let playerConstructorCallCount = 0;

  beforeEach(() => {
    playerConstructorCallCount = 0;
    onReady = undefined;
    onStateChange = undefined;

    function Player(this: MockPlayerApi, _element: HTMLElement, configuration: YT.PlayerOptions) {
      playerConstructorCallCount += 1;
      onReady = configuration.events?.onReady;
      onStateChange = configuration.events?.onStateChange;

      this.destroy = vi.fn();
      this.getCurrentTime = vi.fn(() => currentTimeSeconds);
      this.getPlayerState = vi.fn(() => 1);
      this.getVideoData = vi.fn(() => ({ video_id: currentPlaybackVideoId }));
      this.loadVideoById = vi.fn();
      this.seekTo = vi.fn();
      this.stopVideo = vi.fn();
      playerApi = {
        destroy: this.destroy,
        getCurrentTime: this.getCurrentTime,
        getPlayerState: this.getPlayerState,
        getVideoData: this.getVideoData,
        loadVideoById: this.loadVideoById,
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

  it('keeps reporting the player video id while a new selection is loading', async () => {
    const onPlaybackProgress = vi.fn();
    const { rerender } = render(
      <VideoPlayer selectedVideoId="video-a" onPlaybackProgress={onPlaybackProgress} />,
    );

    await waitFor(() => expect(playerConstructorCallCount).toBe(1));

    act(() => {
      onReady?.({ target: playerApi as unknown as YT.Player });
    });

    currentTimeSeconds = 123;
    currentPlaybackVideoId = 'video-a';

    rerender(<VideoPlayer selectedVideoId="video-b" onPlaybackProgress={onPlaybackProgress} />);

    await waitFor(() => expect(playerApi.loadVideoById).toHaveBeenCalledWith('video-b'));

    act(() => {
      onStateChange?.({ data: window.YT!.PlayerState.PAUSED });
    });

    expect(onPlaybackProgress).toHaveBeenCalledWith('video-a', 123);
    expect(onPlaybackProgress).not.toHaveBeenCalledWith('video-b', 123);
  });
});
