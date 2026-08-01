import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { YouTubeVideoItem } from '../youtube/types';
import { writePendingMusicPlaylistExport } from './pendingExport';
import useMusicPlaylistExport from './useMusicPlaylistExport';

const useAuthMock = vi.fn();
const exportMusicPlaylistMock = vi.fn();

vi.mock('../auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('./api', () => ({
  exportMusicPlaylist: (...args: unknown[]) => exportMusicPlaylistMock(...args),
}));

function createItem(id: string) {
  return { id } as YouTubeVideoItem;
}

describe('useMusicPlaylistExport', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useAuthMock.mockReset();
    exportMusicPlaylistMock.mockReset();
  });

  it('stores at most 20 unique videos before requesting contextual YouTube access', async () => {
    const requestYouTubePlaylistAccess = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      accessToken: 'app-token',
      googleProviderAccessToken: 'identity-only-token',
      requestYouTubePlaylistAccess,
      status: 'authenticated',
    });
    const { result } = renderHook(() => useMusicPlaylistExport(vi.fn()));

    await act(async () => {
      await result.current.startExport(
        [...Array.from({ length: 22 }, (_, index) => createItem(`video-${index + 1}`)), createItem('video-1')],
        'KR',
      );
    });

    expect(requestYouTubePlaylistAccess).toHaveBeenCalledWith(window.location.origin);
    const pending = JSON.parse(window.sessionStorage.getItem('youtube-atlas-pending-music-playlist-export') ?? '{}');
    expect(pending.videoIds).toHaveLength(20);
    expect(new Set(pending.videoIds).size).toBe(20);
    expect(exportMusicPlaylistMock).not.toHaveBeenCalled();
  });

  it('resumes the export after OAuth and reports partial completion', async () => {
    writePendingMusicPlaylistExport({
      regionCode: 'KR',
      requestedAt: Date.now(),
      title: '음악 TOP 2',
      videoIds: ['video-1', 'video-2'],
    });
    useAuthMock.mockReturnValue({
      accessToken: 'app-token',
      googleProviderAccessToken: 'youtube-token',
      requestYouTubePlaylistAccess: vi.fn(),
      status: 'authenticated',
    });
    exportMusicPlaylistMock.mockResolvedValue({
      addedCount: 1,
      failedItems: [{ message: '비공개 영상', videoId: 'video-2' }],
      playlistId: 'playlist-1',
      playlistUrl: 'https://www.youtube.com/playlist?list=playlist-1',
      requestedCount: 2,
      title: '음악 TOP 2',
    });
    const onRestoreMusicView = vi.fn();
    const { result } = renderHook(() => useMusicPlaylistExport(onRestoreMusicView));

    await waitFor(() => expect(result.current.state.phase).toBe('partial'));

    expect(onRestoreMusicView).toHaveBeenCalledTimes(1);
    expect(exportMusicPlaylistMock).toHaveBeenCalledWith('app-token', {
      googleAccessToken: 'youtube-token',
      regionCode: 'KR',
      title: '음악 TOP 2',
      videoIds: ['video-1', 'video-2'],
    });
    expect(result.current.state.message).toContain('1/2개');
    expect(window.sessionStorage).toHaveLength(0);
  });
});
