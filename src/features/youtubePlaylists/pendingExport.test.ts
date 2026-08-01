import { beforeEach, describe, expect, it } from 'vitest';
import {
  readPendingMusicPlaylistExport,
  writePendingMusicPlaylistExport,
} from './pendingExport';

describe('pending music playlist export', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('restores a recent export request after the OAuth redirect', () => {
    writePendingMusicPlaylistExport({
      regionCode: 'KR',
      requestedAt: 1_000,
      title: '음악 TOP 20',
      videoIds: ['video-1', 'video-2'],
    });

    expect(readPendingMusicPlaylistExport(2_000)).toEqual({
      regionCode: 'KR',
      requestedAt: 1_000,
      title: '음악 TOP 20',
      videoIds: ['video-1', 'video-2'],
    });
  });

  it('clears an expired request instead of exporting it later', () => {
    writePendingMusicPlaylistExport({
      regionCode: 'KR',
      requestedAt: 1_000,
      title: '음악 TOP 20',
      videoIds: ['video-1'],
    });

    expect(readPendingMusicPlaylistExport(1_000 + 11 * 60 * 1000)).toBeNull();
    expect(window.sessionStorage).toHaveLength(0);
  });
});
