import { VIDEO_FILTER_REGION_CODES } from '../constants/videoCategories';

export type HomeChartRouteView =
  | 'popular'
  | 'buyable'
  | 'liked'
  | 'realtime-surging'
  | 'new-chart-entries'
  | 'music';

export type HomeRegionCode = (typeof VIDEO_FILTER_REGION_CODES)[number];

export interface HomeRouteState {
  chartView: HomeChartRouteView;
  regionCode: HomeRegionCode;
}

export const PENDING_LIKED_VIDEOS_VIEW_KEY =
  'youtube-atlas-pending-liked-videos-view';

const HOME_CHART_VIEW_SLUGS: Record<HomeChartRouteView, string> = {
  popular: 'top',
  buyable: 'buyable',
  liked: 'liked',
  'realtime-surging': 'surging',
  'new-chart-entries': 'new',
  music: 'music',
};

const HOME_CHART_VIEW_BY_SLUG = new Map(
  Object.entries(HOME_CHART_VIEW_SLUGS).map(([chartView, slug]) => [
    slug,
    chartView as HomeChartRouteView,
  ]),
);

const HOME_REGION_CODE_SET = new Set<string>(VIDEO_FILTER_REGION_CODES);

export function getHomePath(
  regionCode: HomeRegionCode,
  chartView: HomeChartRouteView,
) {
  return `/${regionCode.toLowerCase()}/${HOME_CHART_VIEW_SLUGS[chartView]}`;
}

export function parseHomeRoute(
  nationParam?: string,
  categoryParam?: string,
): HomeRouteState | null {
  const regionCode = nationParam?.toUpperCase();
  const chartView = categoryParam
    ? HOME_CHART_VIEW_BY_SLUG.get(categoryParam.toLowerCase())
    : undefined;

  if (!regionCode || !HOME_REGION_CODE_SET.has(regionCode) || !chartView) {
    return null;
  }

  return {
    chartView,
    regionCode: regionCode as HomeRegionCode,
  };
}

export function getPendingHomeChartView(): HomeChartRouteView {
  if (typeof window === 'undefined') {
    return 'popular';
  }

  const shouldRestoreLikedVideos =
    window.sessionStorage.getItem(PENDING_LIKED_VIDEOS_VIEW_KEY) === 'true';

  if (shouldRestoreLikedVideos) {
    return 'liked';
  }

  return 'popular';
}

export function clearPendingHomeChartView() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(PENDING_LIKED_VIDEOS_VIEW_KEY);
}
