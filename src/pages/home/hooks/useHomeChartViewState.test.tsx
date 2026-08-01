import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { YouTubeCategorySection } from '../../../features/youtube/types';
import useHomeChartViewState from './useHomeChartViewState';

type HookOptions = Parameters<typeof useHomeChartViewState>[0];

const buyableSection: YouTubeCategorySection = {
  categoryId: 'buyable-market',
  description: '매수 가능 영상',
  items: [],
  label: '매수 가능',
};

const favoriteSection: YouTubeCategorySection = {
  categoryId: 'favorite-streamers',
  description: '즐겨찾기 영상',
  items: [],
  label: '즐겨찾기',
};

function createOptions(overrides: Partial<HookOptions>): HookOptions {
  return {
    authStatus: 'authenticated',
    buyableChartSection: buyableSection,
    buyableFavoriteChartSection: favoriteSection,
    chartTrendSignalsByVideoId: {},
    displaySelectedPlaybackSection: undefined,
    favoriteStreamerVideoErrorMessage: '즐겨찾기 영상을 불러오지 못했습니다.',
    favoriteStreamersCount: 1,
    favoriteTrendSignalsByVideoId: {},
    fetchNextBuyableChartPage: vi.fn(),
    fetchNextFavoriteStreamerVideosPage: vi.fn(),
    fetchNextPage: vi.fn(),
    featuredChartSections: [],
    hasNextBuyableChartPage: false,
    hasNextFavoriteStreamerVideosPage: false,
    hasNextMusicChartPage: false,
    hasNextPage: false,
    hasResolvedChartTrendSignals: true,
    hasResolvedFavoriteTrendSignals: true,
    isBuyableChartError: false,
    isBuyableChartLoading: false,
    isChartError: false,
    isChartLoading: false,
    isFavoriteStreamerVideosError: false,
    isFavoriteStreamerVideosLoading: false,
    isFavoriteStreamersError: false,
    isFavoriteStreamersLoading: false,
    isFetchingNextBuyableChartPage: false,
    isFetchingNextFavoriteStreamerVideosPage: false,
    isFetchingNextMusicChartPage: false,
    isFetchingNextPage: false,
    isMusicChartError: false,
    isMusicChartLoading: false,
    isNewChartEntriesError: false,
    isNewChartEntriesLoading: false,
    isRealtimeSurgingError: false,
    isRealtimeSurgingLoading: false,
    isTrendRegionSelected: true,
    musicTrendSignalsByVideoId: {},
    onLoadMoreMusicChart: vi.fn(),
    selectedChartView: 'buyable',
    setCollapsedHomeSectionIds: vi.fn(),
    setSelectedChartView: vi.fn(),
    ...overrides,
  };
}

describe('useHomeChartViewState', () => {
  it('shows the buyable list independently from the base chart loading and error state', () => {
    const { result } = renderHook(() =>
      useHomeChartViewState(
        createOptions({
          chartErrorMessage: 'TOP 200 오류',
          isChartError: true,
          isChartLoading: true,
          selectedChartView: 'buyable',
        }),
      ),
    );

    expect(result.current.activeChartSection?.categoryId).toBe('buyable-market');
    expect(result.current.activeChartIsLoading).toBe(false);
    expect(result.current.activeChartIsError).toBe(false);
    expect(result.current.activeChartErrorMessage).toBeUndefined();
  });

  it('shows the favorite list independently from the base chart loading and error state', () => {
    const { result } = renderHook(() =>
      useHomeChartViewState(
        createOptions({
          chartErrorMessage: 'TOP 200 오류',
          isChartError: true,
          isChartLoading: true,
          selectedChartView: 'favorites',
        }),
      ),
    );

    expect(result.current.activeChartSection?.categoryId).toBe('favorite-streamers');
    expect(result.current.activeChartIsLoading).toBe(false);
    expect(result.current.activeChartIsError).toBe(false);
  });
});
