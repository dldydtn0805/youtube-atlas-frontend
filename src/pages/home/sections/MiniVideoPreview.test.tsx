import { act, createRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VideoPlayerHandle } from '../../../components/VideoPlayer/VideoPlayer';
import MiniVideoPreview, { resetMiniVideoPreviewSingletonForTests } from './MiniVideoPreview';

type MockPreviewPlayerApi = {
  destroy: ReturnType<typeof vi.fn>;
  getCurrentTime: ReturnType<typeof vi.fn>;
  getVideoData: ReturnType<typeof vi.fn>;
  loadVideoById: ReturnType<typeof vi.fn>;
  mute: ReturnType<typeof vi.fn>;
  seekTo: ReturnType<typeof vi.fn>;
  stopVideo: ReturnType<typeof vi.fn>;
};

describe('MiniVideoPreview', () => {
  let currentTimeSeconds = 0;
  let currentPlaybackVideoId = 'video-a';
  let onReady: YT.PlayerEvents['onReady'];
  let playerApi: MockPreviewPlayerApi;
  let playerConstructorCallCount = 0;

  beforeEach(() => {
    currentTimeSeconds = 0;
    currentPlaybackVideoId = 'video-a';
    playerConstructorCallCount = 0;
    onReady = undefined;

    function Player(this: MockPreviewPlayerApi, _element: HTMLElement, configuration: YT.PlayerOptions) {
      playerConstructorCallCount += 1;
      onReady = configuration.events?.onReady;

      this.destroy = vi.fn();
      this.getCurrentTime = vi.fn(() => currentTimeSeconds);
      this.getVideoData = vi.fn(() => ({ video_id: currentPlaybackVideoId }));
      this.loadVideoById = vi.fn();
      this.mute = vi.fn();
      this.seekTo = vi.fn();
      this.stopVideo = vi.fn();
      playerApi = {
        destroy: this.destroy,
        getCurrentTime: this.getCurrentTime,
        getVideoData: this.getVideoData,
        loadVideoById: this.loadVideoById,
        mute: this.mute,
        seekTo: this.seekTo,
        stopVideo: this.stopVideo,
      };
    }

    Object.defineProperty(window, 'YT', {
      configurable: true,
      value: {
        Player,
      },
    });
  });

  afterEach(() => {
    resetMiniVideoPreviewSingletonForTests();
    delete (window as Window & { YT?: unknown }).YT;
  });

  it('reuses the same preview player across remounts', async () => {
    const mainPlayerRef = createRef<VideoPlayerHandle>();
    const firstRender = render(
      <MiniVideoPreview
        containerClassName="preview-shell"
        frameClassName="preview-frame"
        mainPlayerRef={mainPlayerRef}
        selectedVideoId="video-a"
      />,
    );

    await waitFor(() => expect(playerConstructorCallCount).toBe(1));

    act(() => {
      onReady?.({ target: playerApi as unknown as YT.Player });
    });

    firstRender.unmount();

    expect(playerApi.destroy).not.toHaveBeenCalled();
    expect(playerApi.stopVideo).not.toHaveBeenCalled();

    render(
      <MiniVideoPreview
        containerClassName="preview-shell"
        frameClassName="preview-frame"
        mainPlayerRef={mainPlayerRef}
        selectedVideoId="video-b"
      />,
    );

    await waitFor(() => expect(playerApi.loadVideoById).toHaveBeenCalledWith({
      startSeconds: 0,
      videoId: 'video-b',
    }));
    expect(playerConstructorCallCount).toBe(1);
  });

  it('loads a newly selected video in the same slot', async () => {
    const mainPlayerRef = createRef<VideoPlayerHandle>();
    const { rerender } = render(
      <MiniVideoPreview
        containerClassName="preview-shell"
        frameClassName="preview-frame"
        mainPlayerRef={mainPlayerRef}
        selectedVideoId="video-a"
      />,
    );

    await waitFor(() => expect(playerConstructorCallCount).toBe(1));

    act(() => {
      onReady?.({ target: playerApi as unknown as YT.Player });
    });

    rerender(
      <MiniVideoPreview
        containerClassName="preview-shell"
        frameClassName="preview-frame"
        mainPlayerRef={mainPlayerRef}
        selectedVideoId="video-b"
      />,
    );

    currentPlaybackVideoId = 'video-a';

    await waitFor(() =>
      expect(playerApi.loadVideoById).toHaveBeenCalledWith({
        startSeconds: 0,
        videoId: 'video-b',
      }),
    );
  });

  it('does not reload the same video when remounted into another slot', async () => {
    const mainPlayerRef = createRef<VideoPlayerHandle>();
    const firstRender = render(
      <MiniVideoPreview
        containerClassName="preview-shell"
        frameClassName="preview-frame"
        mainPlayerRef={mainPlayerRef}
        selectedVideoId="video-a"
      />,
    );

    await waitFor(() => expect(playerConstructorCallCount).toBe(1));

    act(() => {
      onReady?.({ target: playerApi as unknown as YT.Player });
    });

    firstRender.unmount();

    expect(playerApi.loadVideoById).not.toHaveBeenCalled();

    render(
      <MiniVideoPreview
        containerClassName="preview-shell"
        frameClassName="preview-frame"
        mainPlayerRef={mainPlayerRef}
        selectedVideoId="video-a"
      />,
    );

    await waitFor(() => expect(playerConstructorCallCount).toBe(1));
    expect(playerApi.loadVideoById).not.toHaveBeenCalled();
  });

  it('does not stop playback after ownership moves to a new mount', async () => {
    const mainPlayerRef = createRef<VideoPlayerHandle>();
    const firstRender = render(
      <MiniVideoPreview
        containerClassName="preview-shell"
        frameClassName="preview-frame"
        mainPlayerRef={mainPlayerRef}
        selectedVideoId="video-a"
      />,
    );

    await waitFor(() => expect(playerConstructorCallCount).toBe(1));

    act(() => {
      onReady?.({ target: playerApi as unknown as YT.Player });
    });

    render(
      <MiniVideoPreview
        containerClassName="preview-shell"
        frameClassName="preview-frame"
        mainPlayerRef={mainPlayerRef}
        selectedVideoId="video-a"
      />,
    );

    firstRender.unmount();

    expect(playerApi.stopVideo).not.toHaveBeenCalled();
  });
});
