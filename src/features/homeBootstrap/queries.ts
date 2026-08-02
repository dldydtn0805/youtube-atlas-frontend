import { useEffect, useState } from 'react';
import {
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { gameQueryKeys } from '../game/queries';
import type { YouTubeCategorySection } from '../youtube/types';
import { fetchPublicHomeBootstrap } from './api';

export function usePublicHomeBootstrap(
  regionCode: string,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const [hydratedRegionCode, setHydratedRegionCode] = useState<string | null>(
    null,
  );
  const query = useQuery({
    enabled: enabled && Boolean(regionCode),
    queryKey: ['homeBootstrap', regionCode],
    queryFn: () => fetchPublicHomeBootstrap(regionCode),
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    setHydratedRegionCode(null);
  }, [regionCode]);

  useEffect(() => {
    if (!query.data || query.data.regionCode !== regionCode) {
      return;
    }

    queryClient.setQueryData(
      ['videoCategories', regionCode],
      query.data.categories,
    );
    queryClient.setQueryData<InfiniteData<YouTubeCategorySection>>(
      ['popularVideosByCategory', regionCode, query.data.topVideos.categoryId],
      {
        pageParams: [undefined],
        pages: [query.data.topVideos],
      },
    );
    queryClient.setQueryData<InfiniteData<YouTubeCategorySection>>(
      ['musicTopVideos', regionCode],
      {
        pageParams: [undefined],
        pages: [query.data.musicTopVideos],
      },
    );
    queryClient.setQueryData(
      ['realtimeSurging', regionCode],
      query.data.realtimeSurging,
    );
    queryClient.setQueryData(
      ['topRankRisers', regionCode],
      query.data.topRankRisers,
    );
    queryClient.setQueryData(
      ['newChartEntries', regionCode],
      query.data.newEntries,
    );
    queryClient.setQueryData(
      gameQueryKeys.market(null, regionCode),
      query.data.gameMarket,
    );
    setHydratedRegionCode(regionCode);
  }, [query.data, queryClient, regionCode]);

  return {
    ...query,
    isHydrated: hydratedRegionCode === regionCode,
  };
}
