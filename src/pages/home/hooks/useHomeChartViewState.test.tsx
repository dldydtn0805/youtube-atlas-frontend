import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  YouTubeCategorySection,
  YouTubeVideoItem,
} from "../../../features/youtube/types";
import useHomeChartViewState from "./useHomeChartViewState";

type HookOptions = Parameters<typeof useHomeChartViewState>[0];

const buyableSection: YouTubeCategorySection = {
  categoryId: "buyable-market",
  description: "매수 가능 영상",
  items: [],
  label: "매수 가능",
};

const likedVideoSection: YouTubeCategorySection = {
  categoryId: "youtube-liked-videos",
  description: "좋아요한 영상",
  items: [],
  label: "좋아요",
};

function createOptions(overrides: Partial<HookOptions>): HookOptions {
  return {
    authStatus: "authenticated",
    buyableChartSection: buyableSection,
    buyableLikedVideoChartSection: likedVideoSection,
    chartTrendSignalsByVideoId: {},
    displaySelectedPlaybackSection: undefined,
    fetchNextBuyableChartPage: vi.fn(),
    fetchNextLikedVideosPage: vi.fn(),
    fetchNextPage: vi.fn(),
    featuredChartSections: [],
    hasNextBuyableChartPage: false,
    hasNextLikedVideosPage: false,
    hasNextMusicChartPage: false,
    hasNextPage: false,
    hasResolvedChartTrendSignals: true,
    hasResolvedLikedVideoTrendSignals: true,
    isBuyableChartError: false,
    isBuyableChartLoading: false,
    isChartError: false,
    isChartLoading: false,
    isFetchingNextBuyableChartPage: false,
    isFetchingNextLikedVideosPage: false,
    isFetchingNextMusicChartPage: false,
    isFetchingNextPage: false,
    isMusicChartError: false,
    isMusicChartLoading: false,
    isNewChartEntriesError: false,
    isNewChartEntriesLoading: false,
    isRealtimeSurgingError: false,
    isRealtimeSurgingLoading: false,
    isTrendRegionSelected: true,
    isYouTubeLikedVideosConnected: true,
    isYouTubeLikedVideosError: false,
    isYouTubeLikedVideosLoading: false,
    likedVideoErrorMessage: "좋아요한 영상을 불러오지 못했습니다.",
    likedVideoTrendSignalsByVideoId: {},
    musicTrendSignalsByVideoId: {},
    onLoadMoreMusicChart: vi.fn(),
    selectedChartView: "buyable",
    setCollapsedHomeSectionIds: vi.fn(),
    setSelectedChartView: vi.fn(),
    ...overrides,
  };
}

describe("useHomeChartViewState", () => {
  it("shows the buyable list independently from the base chart loading and error state", () => {
    const { result } = renderHook(() =>
      useHomeChartViewState(
        createOptions({
          chartErrorMessage: "TOP 200 오류",
          isChartError: true,
          isChartLoading: true,
          selectedChartView: "buyable",
        }),
      ),
    );

    expect(result.current.activeChartSection?.categoryId).toBe(
      "buyable-market",
    );
    expect(result.current.activeChartIsLoading).toBe(false);
    expect(result.current.activeChartIsError).toBe(false);
    expect(result.current.activeChartErrorMessage).toBeUndefined();
  });

  it("shows the liked video list independently from the base chart loading and error state", () => {
    const { result } = renderHook(() =>
      useHomeChartViewState(
        createOptions({
          chartErrorMessage: "TOP 200 오류",
          isChartError: true,
          isChartLoading: true,
          selectedChartView: "liked",
        }),
      ),
    );

    expect(result.current.activeChartSection?.categoryId).toBe(
      "youtube-liked-videos",
    );
    expect(result.current.activeChartIsLoading).toBe(false);
    expect(result.current.activeChartIsError).toBe(false);
    expect(result.current.selectedChartViewOption.label).toBe("좋아요");
    expect(
      result.current.activeChartRankLabel?.(
        {
          id: "chart-out-video",
          snippet: { title: "차트 아웃 영상" },
        } as YouTubeVideoItem,
        0,
      ),
    ).toBe("차트 아웃");
  });

  it("guides the user to connect YouTube before the liked video list is available", () => {
    const { result } = renderHook(() =>
      useHomeChartViewState(
        createOptions({
          isYouTubeLikedVideosConnected: false,
          selectedChartView: "liked",
        }),
      ),
    );

    expect(result.current.activeChartEmptyMessage).toContain(
      "YouTube를 연결하면",
    );
  });
});
