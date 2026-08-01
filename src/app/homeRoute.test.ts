import { beforeEach, describe, expect, it } from 'vitest';
import {
  PENDING_LIKED_VIDEOS_VIEW_KEY,
  clearPendingHomeChartView,
  getHomePath,
  getPendingHomeChartView,
  parseHomeRoute,
} from './homeRoute';

describe('homeRoute', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('builds readable nation and category paths', () => {
    expect(getHomePath('KR', 'popular')).toBe('/kr/top');
    expect(getHomePath('US', 'music')).toBe('/us/music');
    expect(getHomePath('JP', 'realtime-surging')).toBe('/jp/surging');
  });

  it('parses supported nation and category paths case-insensitively', () => {
    expect(parseHomeRoute('jp', 'music')).toEqual({
      chartView: 'music',
      regionCode: 'JP',
    });
    expect(parseHomeRoute('KR', 'NEW')).toEqual({
      chartView: 'new-chart-entries',
      regionCode: 'KR',
    });
  });

  it('rejects unsupported nation and category paths', () => {
    expect(parseHomeRoute('de', 'top')).toBeNull();
    expect(parseHomeRoute('kr', 'gaming')).toBeNull();
  });

  it('keeps the pending liked view stable until the destination page clears it', () => {
    window.sessionStorage.setItem(PENDING_LIKED_VIDEOS_VIEW_KEY, 'true');

    expect(getPendingHomeChartView()).toBe('liked');
    expect(getPendingHomeChartView()).toBe('liked');

    clearPendingHomeChartView();

    expect(getPendingHomeChartView()).toBe('popular');
  });
});
