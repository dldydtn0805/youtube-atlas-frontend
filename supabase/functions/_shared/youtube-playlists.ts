import { ApiError } from './http.ts';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface YouTubeApiErrorBody {
  error?: {
    errors?: Array<{ reason?: string }>;
    message?: string;
  };
}

interface YouTubePlaylistBody {
  id?: string;
}

export interface YouTubePlaylistInsertFailure {
  message: string;
  videoId: string;
}

export interface YouTubePlaylistExportResult {
  addedCount: number;
  failedItems: YouTubePlaylistInsertFailure[];
  playlistId: string;
  playlistUrl: string;
  requestedCount: number;
  title: string;
}

function getYouTubeError(body: unknown) {
  const errorBody = body as YouTubeApiErrorBody | null;

  return {
    message: errorBody?.error?.message?.trim() || 'YouTube 요청을 처리하지 못했습니다.',
    reason: errorBody?.error?.errors?.[0]?.reason?.trim() || null,
  };
}

async function readResponseBody(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toCreatePlaylistError(status: number, body: unknown) {
  const youtubeError = getYouTubeError(body);

  if (status === 401 || youtubeError.reason === 'authError') {
    return new ApiError(401, 'youtube_authorization_expired', 'YouTube 연결이 만료되었습니다. 다시 연결해 주세요.');
  }

  if (youtubeError.reason === 'insufficientPermissions') {
    return new ApiError(403, 'youtube_permission_required', 'YouTube 재생목록 관리 권한이 필요합니다.');
  }

  if (youtubeError.reason === 'quotaExceeded' || youtubeError.reason === 'dailyLimitExceeded') {
    return new ApiError(429, 'youtube_quota_exceeded', '오늘 사용할 수 있는 YouTube 내보내기 한도를 초과했습니다.');
  }

  return new ApiError(502, 'youtube_playlist_create_failed', youtubeError.message);
}

async function createPrivatePlaylist(
  googleAccessToken: string,
  title: string,
  fetcher: typeof fetch,
) {
  const response = await fetcher(`${YOUTUBE_API_BASE_URL}/playlists?part=snippet,status`, {
    body: JSON.stringify({
      snippet: {
        description: 'YouTube Atlas 음악 차트에서 만든 재생목록입니다.',
        title,
      },
      status: {
        privacyStatus: 'private',
      },
    }),
    headers: {
      Authorization: `Bearer ${googleAccessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  const body = await readResponseBody(response) as YouTubePlaylistBody | null;

  if (!response.ok || !body?.id) {
    throw toCreatePlaylistError(response.status, body);
  }

  return body.id;
}

async function insertPlaylistItem(
  googleAccessToken: string,
  playlistId: string,
  videoId: string,
  fetcher: typeof fetch,
) {
  const response = await fetcher(`${YOUTUBE_API_BASE_URL}/playlistItems?part=snippet`, {
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId,
        },
      },
    }),
    headers: {
      Authorization: `Bearer ${googleAccessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (response.ok) {
    return null;
  }

  const body = await readResponseBody(response);
  const youtubeError = getYouTubeError(body);

  return {
    fatal:
      response.status === 401 ||
      youtubeError.reason === 'authError' ||
      youtubeError.reason === 'insufficientPermissions' ||
      youtubeError.reason === 'quotaExceeded' ||
      youtubeError.reason === 'dailyLimitExceeded',
    message: youtubeError.message,
  };
}

export async function exportPrivateYouTubePlaylist(
  options: {
    googleAccessToken: string;
    title: string;
    videoIds: string[];
  },
  fetcher: typeof fetch = fetch,
): Promise<YouTubePlaylistExportResult> {
  const playlistId = await createPrivatePlaylist(
    options.googleAccessToken,
    options.title,
    fetcher,
  );
  const failedItems: YouTubePlaylistInsertFailure[] = [];
  let addedCount = 0;

  for (let index = 0; index < options.videoIds.length; index += 1) {
    const videoId = options.videoIds[index];
    const failure = await insertPlaylistItem(
      options.googleAccessToken,
      playlistId,
      videoId,
      fetcher,
    );

    if (!failure) {
      addedCount += 1;
      continue;
    }

    failedItems.push({ message: failure.message, videoId });

    if (failure.fatal) {
      for (const remainingVideoId of options.videoIds.slice(index + 1)) {
        failedItems.push({ message: failure.message, videoId: remainingVideoId });
      }
      break;
    }
  }

  return {
    addedCount,
    failedItems,
    playlistId,
    playlistUrl: `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`,
    requestedCount: options.videoIds.length,
    title: options.title,
  };
}
