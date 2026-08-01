import type { HomeChartRouteView } from '../../app/homeRoute';

export type ChartViewMode = HomeChartRouteView | 'all';

export type ChartSortMode =
  | "popular-desc"
  | "popular-asc"
  | "views-desc"
  | "views-asc"
  | "rank-up"
  | "rank-down";
