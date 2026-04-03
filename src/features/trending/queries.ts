import { useQuery } from '@tanstack/react-query';
import { supportsVideoTrendSignals } from '../../constants/videoCategories';
import { fetchRealtimeSurging, fetchVideoTrendSignals } from './api';

export function useVideoTrendSignals(
  regionCode: string | undefined,
  categoryId: string | undefined,
  videoIds: string[],
  enabled = true,
) {
  const normalizedVideoIds = [...new Set(videoIds)].filter(Boolean).sort();
  const isSupportedCategory = supportsVideoTrendSignals(categoryId, regionCode);

  return useQuery({
    enabled: enabled && Boolean(regionCode) && isSupportedCategory && normalizedVideoIds.length > 0,
    queryKey: ['videoTrendSignals', regionCode, categoryId, normalizedVideoIds],
    queryFn: () => fetchVideoTrendSignals(regionCode as string, categoryId as string, normalizedVideoIds),
    staleTime: 1000 * 60 * 10,
  });
}

export function useRealtimeSurging(regionCode: string | undefined, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(regionCode),
    queryKey: ['realtimeSurging', regionCode],
    queryFn: () => fetchRealtimeSurging(regionCode as string),
    staleTime: 1000 * 60 * 5,
  });
}
