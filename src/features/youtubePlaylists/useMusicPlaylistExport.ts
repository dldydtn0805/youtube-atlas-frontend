import { useCallback, useEffect, useRef, useState } from 'react';
import type { YouTubeVideoItem } from '../youtube/types';
import { useAuth } from '../auth/useAuth';
import { ApiRequestError } from '../../lib/api';
import { exportMusicPlaylist } from './api';
import {
  clearPendingMusicPlaylistExport,
  readPendingMusicPlaylistExport,
  writePendingMusicPlaylistExport,
  type PendingMusicPlaylistExport,
} from './pendingExport';
import type { MusicPlaylistExportResult } from './types';

const MUSIC_PLAYLIST_EXPORT_LIMIT = 20;

type MusicPlaylistExportPhase =
  | 'idle'
  | 'authorizing'
  | 'exporting'
  | 'success'
  | 'partial'
  | 'error';

export interface MusicPlaylistExportState {
  message: string | null;
  phase: MusicPlaylistExportPhase;
  requestedCount: number;
  result: MusicPlaylistExportResult | null;
}

function formatDateStamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function createPendingExport(items: YouTubeVideoItem[], regionCode: string): PendingMusicPlaylistExport | null {
  const videoIds = Array.from(new Set(items.map((item) => item.id).filter(Boolean))).slice(
    0,
    MUSIC_PLAYLIST_EXPORT_LIMIT,
  );

  if (videoIds.length === 0) {
    return null;
  }

  return {
    regionCode,
    requestedAt: Date.now(),
    title: `YouTube Atlas 음악 TOP ${videoIds.length} · ${regionCode} · ${formatDateStamp(new Date())}`,
    videoIds,
  };
}

function getExportErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError || error instanceof Error) {
    return error.message;
  }

  return 'YouTube 재생목록을 만들지 못했습니다.';
}

export default function useMusicPlaylistExport(onRestoreMusicView: () => void) {
  const {
    accessToken,
    googleProviderAccessToken,
    requestYouTubePlaylistAccess,
    status: authStatus,
  } = useAuth();
  const oauthRedirectInFlightRef = useRef(false);
  const resumedExportRef = useRef(false);
  const restoredViewRef = useRef(false);
  const initialPendingExport = useRef(readPendingMusicPlaylistExport());
  const [state, setState] = useState<MusicPlaylistExportState>(() => ({
    message: initialPendingExport.current ? 'YouTube 연결을 확인하고 있습니다.' : null,
    phase: initialPendingExport.current ? 'authorizing' : 'idle',
    requestedCount: initialPendingExport.current?.videoIds.length ?? 0,
    result: null,
  }));

  useEffect(() => {
    const pendingExport = readPendingMusicPlaylistExport();

    if (!pendingExport || oauthRedirectInFlightRef.current || resumedExportRef.current) {
      return;
    }

    if (!restoredViewRef.current) {
      restoredViewRef.current = true;
      onRestoreMusicView();
    }

    if (authStatus === 'loading') {
      return;
    }

    if (authStatus !== 'authenticated' || !accessToken) {
      clearPendingMusicPlaylistExport();
      setState({
        message: 'YouTube 연결이 완료되지 않았습니다. 다시 시도해 주세요.',
        phase: 'error',
        requestedCount: pendingExport.videoIds.length,
        result: null,
      });
      return;
    }

    if (!googleProviderAccessToken) {
      clearPendingMusicPlaylistExport();
      setState({
        message: 'YouTube 권한을 확인하지 못했습니다. 다시 연결해 주세요.',
        phase: 'error',
        requestedCount: pendingExport.videoIds.length,
        result: null,
      });
      return;
    }

    resumedExportRef.current = true;
    clearPendingMusicPlaylistExport();
    setState({
      message: `${pendingExport.videoIds.length}개 영상을 비공개 재생목록에 담고 있습니다.`,
      phase: 'exporting',
      requestedCount: pendingExport.videoIds.length,
      result: null,
    });

    void exportMusicPlaylist(accessToken, {
      googleAccessToken: googleProviderAccessToken,
      regionCode: pendingExport.regionCode,
      title: pendingExport.title,
      videoIds: pendingExport.videoIds,
    })
      .then((result) => {
        const hasFailures = result.failedItems.length > 0;

        setState({
          message: hasFailures
            ? `${result.addedCount}/${result.requestedCount}개를 담았습니다. 실패한 영상은 제외되었습니다.`
            : `${result.addedCount}개 영상을 새 재생목록에 담았습니다.`,
          phase: hasFailures ? 'partial' : 'success',
          requestedCount: result.requestedCount,
          result,
        });
      })
      .catch((error) => {
        setState({
          message: getExportErrorMessage(error),
          phase: 'error',
          requestedCount: pendingExport.videoIds.length,
          result: null,
        });
      });
  }, [accessToken, authStatus, googleProviderAccessToken, onRestoreMusicView]);

  const startExport = useCallback(
    async (items: YouTubeVideoItem[], regionCode: string) => {
      const pendingExport = createPendingExport(items, regionCode);

      if (!pendingExport) {
        setState({
          message: '재생목록에 담을 음악 영상이 없습니다.',
          phase: 'error',
          requestedCount: 0,
          result: null,
        });
        return;
      }

      oauthRedirectInFlightRef.current = true;
      writePendingMusicPlaylistExport(pendingExport);
      setState({
        message: 'YouTube 재생목록 권한을 요청하고 있습니다.',
        phase: 'authorizing',
        requestedCount: pendingExport.videoIds.length,
        result: null,
      });

      try {
        await requestYouTubePlaylistAccess(window.location.origin);
      } catch (error) {
        oauthRedirectInFlightRef.current = false;
        clearPendingMusicPlaylistExport();
        setState({
          message: getExportErrorMessage(error),
          phase: 'error',
          requestedCount: pendingExport.videoIds.length,
          result: null,
        });
      }
    },
    [requestYouTubePlaylistAccess],
  );

  return {
    exportLimit: MUSIC_PLAYLIST_EXPORT_LIMIT,
    startExport,
    state,
  };
}
