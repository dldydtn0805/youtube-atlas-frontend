import type { VideoCategory } from '../../constants/videoCategories';
import { fetchApi } from '../../lib/api';
import type { GameMarketVideo } from '../game/types';
import type {
  NewChartEntriesResponse,
  RealtimeSurgingResponse,
  TopRankRisersResponse,
} from '../trending/types';
import type { YouTubeCategorySection } from '../youtube/types';

export interface PublicHomeBootstrap {
  categories: VideoCategory[];
  gameMarket: GameMarketVideo[];
  musicTopVideos: YouTubeCategorySection;
  newEntries: NewChartEntriesResponse;
  realtimeSurging: RealtimeSurgingResponse;
  regionCode: string;
  topRankRisers: TopRankRisersResponse;
  topVideos: YouTubeCategorySection;
}

export function fetchPublicHomeBootstrap(regionCode: string) {
  const params = new URLSearchParams({ regionCode });

  return fetchApi<PublicHomeBootstrap>(
    `/api/home/bootstrap?${params.toString()}`,
  );
}
