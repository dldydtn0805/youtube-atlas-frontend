import { fetchApi } from '../../lib/api';
import type { RealtimeSurgingResponse, VideoRankHistory, VideoTrendSignal } from './types';

export async function fetchVideoTrendSignals(
  regionCode: string,
  categoryId: string,
  videoIds: string[],
): Promise<Record<string, VideoTrendSignal>> {
  if (videoIds.length === 0) {
    return {};
  }

  const params = new URLSearchParams({
    regionCode,
    categoryId,
  });

  for (const videoId of videoIds) {
    params.append('videoIds', videoId);
  }

  const data = await fetchApi<VideoTrendSignal[]>(`/api/trending/signals?${params.toString()}`);

  return Object.fromEntries(
    data.map((signal) => [signal.videoId, signal]),
  );
}

export async function fetchRealtimeSurging(regionCode: string): Promise<RealtimeSurgingResponse> {
  const params = new URLSearchParams({
    regionCode,
  });

  return fetchApi<RealtimeSurgingResponse>(`/api/trending/realtime-surging?${params.toString()}`);
}

export async function fetchVideoRankHistory(regionCode: string, videoId: string): Promise<VideoRankHistory> {
  const params = new URLSearchParams({
    regionCode,
  });

  return fetchApi<VideoRankHistory>(
    `/api/trending/videos/${encodeURIComponent(videoId)}/history?${params.toString()}`,
  );
}
