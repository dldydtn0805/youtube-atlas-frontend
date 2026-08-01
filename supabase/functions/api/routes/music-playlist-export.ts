import type { TrendSignalRow } from '../../_shared/game.ts';
import { ApiError } from '../../_shared/http.ts';

const MUSIC_VIDEO_CATEGORY_ID = '10';
const MUSIC_PLAYLIST_EXPORT_LIMIT = 20;

export function normalizeMusicPlaylistExportInput(body: {
  regionCode?: string;
  title?: string;
  videoIds?: string[];
}) {
  const regionCode = body.regionCode?.trim().toUpperCase();
  const title = body.title?.trim();
  const videoIds = Array.isArray(body.videoIds)
    ? body.videoIds.map((videoId) => videoId?.trim()).filter(Boolean)
    : [];

  if (!regionCode || !/^[A-Z]{2}$/.test(regionCode)) {
    throw new ApiError(400, 'validation_error', '올바른 국가 코드가 필요합니다.');
  }

  if (!title || title.length > 150) {
    throw new ApiError(400, 'validation_error', '재생목록 제목은 1자 이상 150자 이하여야 합니다.');
  }

  if (videoIds.length === 0 || videoIds.length > MUSIC_PLAYLIST_EXPORT_LIMIT) {
    throw new ApiError(400, 'validation_error', `영상은 최대 ${MUSIC_PLAYLIST_EXPORT_LIMIT}개까지 담을 수 있습니다.`);
  }

  if (new Set(videoIds).size !== videoIds.length) {
    throw new ApiError(400, 'validation_error', '중복된 영상은 재생목록에 담을 수 없습니다.');
  }

  return { regionCode, title, videoIds };
}

export function findUnavailableMusicVideoIds(
  signals: TrendSignalRow[],
  requestedVideoIds: string[],
) {
  const allowedMusicVideoIds = new Set(
    signals
      .filter((signal) => signal.video_category_id === MUSIC_VIDEO_CATEGORY_ID)
      .map((signal) => signal.video_id),
  );

  return requestedVideoIds.filter((videoId) => !allowedMusicVideoIds.has(videoId));
}
