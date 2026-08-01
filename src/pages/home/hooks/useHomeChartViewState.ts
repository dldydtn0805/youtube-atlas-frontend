import {
  useCallback,
  useEffect,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { FeaturedVideoSection } from "../../../components/VideoList/VideoList";
import type { AuthStatus } from "../../../features/auth/types";
import type { VideoTrendSignal } from "../../../features/trending/types";
import type {
  YouTubeCategorySection,
  YouTubeVideoItem,
} from "../../../features/youtube/types";
import {
  NEW_CHART_ENTRIES_QUEUE_ID,
  REALTIME_SURGING_QUEUE_ID,
  formatTrendRankLabel,
} from "../utils";
import type { ChartViewMode } from "../types";
import type { ViewOption } from "../sections/filterPanelTypes";

type ChartViewOption = ViewOption & { id: ChartViewMode };

interface UseHomeChartViewStateOptions {
  authStatus: AuthStatus;
  buyableChartEmptyMessage?: string;
  buyableChartSection?: YouTubeCategorySection;
  buyableLikedVideoChartSection?: YouTubeCategorySection;
  chartErrorMessage?: string;
  chartTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  displaySelectedPlaybackSection?: YouTubeCategorySection;
  fetchNextLikedVideosPage: () => Promise<unknown>;
  fetchNextBuyableChartPage: () => Promise<unknown>;
  fetchNextPage: () => Promise<unknown>;
  featuredChartSections: FeaturedVideoSection[];
  hasNextBuyableChartPage: boolean;
  hasNextLikedVideosPage: boolean;
  hasNextPage: boolean;
  hasResolvedChartTrendSignals: boolean;
  hasResolvedLikedVideoTrendSignals: boolean;
  isBuyableChartError: boolean;
  isBuyableChartLoading: boolean;
  isFetchingNextBuyableChartPage: boolean;
  isChartError: boolean;
  isChartLoading: boolean;
  isFetchingNextLikedVideosPage: boolean;
  isFetchingNextPage: boolean;
  isFetchingNextMusicChartPage: boolean;
  isMusicChartError: boolean;
  isMusicChartLoading: boolean;
  isNewChartEntriesError: boolean;
  isNewChartEntriesLoading: boolean;
  isRealtimeSurgingError: boolean;
  isRealtimeSurgingLoading: boolean;
  isTrendRegionSelected: boolean;
  isYouTubeLikedVideosConnected: boolean;
  isYouTubeLikedVideosError: boolean;
  isYouTubeLikedVideosLoading: boolean;
  likedVideoErrorMessage: string;
  likedVideoTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  hasNextMusicChartPage: boolean;
  musicChartSection?: YouTubeCategorySection;
  musicTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  onLoadMoreMusicChart: () => Promise<unknown>;
  selectedChartView: ChartViewMode;
  setCollapsedHomeSectionIds: Dispatch<SetStateAction<string[]>>;
  setSelectedChartView: Dispatch<SetStateAction<ChartViewMode>>;
}

interface HomeChartViewState {
  activeChartEmptyMessage?: string;
  activeChartErrorMessage?: string;
  activeChartFeaturedSections: FeaturedVideoSection[];
  activeChartHasNextPage: boolean;
  activeChartHasResolvedTrendSignals: boolean;
  activeChartIsError: boolean;
  activeChartIsFetchingNextPage: boolean;
  activeChartIsLoading: boolean;
  activeChartMainSectionCollapseKey?: string;
  activeChartOnLoadMore: () => void;
  activeChartRankLabel?: (item: YouTubeVideoItem, index: number) => string;
  activeChartSection?: YouTubeCategorySection;
  activeChartSectionEyebrow?: string;
  activeChartTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  chartViewOptions: ChartViewOption[];
  effectiveChartView: ChartViewMode;
  handleSelectChartView: (
    viewId: string,
    triggerElement?: HTMLButtonElement,
  ) => void;
  selectedChartViewOption: ChartViewOption;
}

export default function useHomeChartViewState({
  authStatus,
  buyableChartEmptyMessage,
  buyableChartSection,
  buyableLikedVideoChartSection,
  chartErrorMessage,
  chartTrendSignalsByVideoId,
  displaySelectedPlaybackSection,
  fetchNextLikedVideosPage,
  fetchNextBuyableChartPage,
  fetchNextPage,
  featuredChartSections,
  hasNextBuyableChartPage,
  hasNextLikedVideosPage,
  hasNextPage,
  hasResolvedChartTrendSignals,
  hasResolvedLikedVideoTrendSignals,
  isBuyableChartError,
  isBuyableChartLoading,
  isFetchingNextBuyableChartPage,
  isChartError,
  isChartLoading,
  isFetchingNextLikedVideosPage,
  isFetchingNextPage,
  isFetchingNextMusicChartPage,
  isMusicChartError,
  isMusicChartLoading,
  isNewChartEntriesError,
  isNewChartEntriesLoading,
  isRealtimeSurgingError,
  isRealtimeSurgingLoading,
  isTrendRegionSelected,
  isYouTubeLikedVideosConnected,
  isYouTubeLikedVideosError,
  isYouTubeLikedVideosLoading,
  likedVideoErrorMessage,
  likedVideoTrendSignalsByVideoId,
  hasNextMusicChartPage,
  musicChartSection,
  musicTrendSignalsByVideoId,
  onLoadMoreMusicChart,
  selectedChartView,
  setCollapsedHomeSectionIds,
  setSelectedChartView,
}: UseHomeChartViewStateOptions): HomeChartViewState {
  const realtimeSurgingFeaturedSection = useMemo(
    () =>
      featuredChartSections.find(
        (featuredSection) =>
          featuredSection.section.categoryId === REALTIME_SURGING_QUEUE_ID,
      ),
    [featuredChartSections],
  );
  const newChartEntriesFeaturedSection = useMemo(
    () =>
      featuredChartSections.find(
        (featuredSection) =>
          featuredSection.section.categoryId === NEW_CHART_ENTRIES_QUEUE_ID,
      ),
    [featuredChartSections],
  );
  const chartViewOptions = useMemo(
    () =>
      [
        { id: "popular", label: "TOP 200", tone: "top200" },
        {
          id: "buyable",
          label: "매수 가능",
          tone: "buy",
          disabled: authStatus !== "authenticated",
        },
        {
          id: "liked",
          disabled: authStatus !== "authenticated",
          label: "좋아요 영상",
          tone: "like",
        },
        {
          id: "realtime-surging",
          disabled: !isTrendRegionSelected,
          label: "급상승",
          live: true,
          tone: "surge",
        },
        {
          id: "new-chart-entries",
          label: "신규 진입",
          tone: "new",
          disabled: !isTrendRegionSelected,
        },
        {
          id: "music",
          label: "음악",
          tone: "music",
          disabled: !musicChartSection,
        },
      ] satisfies ChartViewOption[],
    [authStatus, isTrendRegionSelected, musicChartSection],
  );

  useEffect(() => {
    if (
      (selectedChartView === "liked" || selectedChartView === "buyable") &&
      authStatus !== "authenticated"
    ) {
      setSelectedChartView("all");
      return;
    }

    if (
      isTrendRegionSelected ||
      selectedChartView === "liked" ||
      selectedChartView === "buyable" ||
      selectedChartView === "popular" ||
      selectedChartView === "music"
    ) {
      return;
    }

    setSelectedChartView("popular");
  }, [
    authStatus,
    isTrendRegionSelected,
    selectedChartView,
    setSelectedChartView,
  ]);

  const effectiveChartView: ChartViewMode =
    !isTrendRegionSelected &&
    selectedChartView !== "liked" &&
    selectedChartView !== "buyable" &&
    selectedChartView !== "popular"
      ? "popular"
      : authStatus !== "authenticated" &&
          (selectedChartView === "liked" || selectedChartView === "buyable")
        ? "popular"
        : selectedChartView;

  const selectedChartViewOption =
    chartViewOptions.find((option) => option.id === effectiveChartView) ??
    chartViewOptions[0];

  const likedVideoChartGetRankLabel = useCallback(
    (item: YouTubeVideoItem) =>
      formatTrendRankLabel(
        likedVideoTrendSignalsByVideoId[item.id],
        hasResolvedLikedVideoTrendSignals,
      ),
    [hasResolvedLikedVideoTrendSignals, likedVideoTrendSignalsByVideoId],
  );

  const popularChartGetRankLabel = useCallback(
    (item: YouTubeVideoItem) =>
      formatTrendRankLabel(
        chartTrendSignalsByVideoId[item.id],
        hasResolvedChartTrendSignals,
      ),
    [chartTrendSignalsByVideoId, hasResolvedChartTrendSignals],
  );
  const musicChartGetRankLabel = useCallback(
    (item: YouTubeVideoItem) =>
      typeof item.trend?.currentRank === "number"
        ? `${item.trend.currentRank}위`
        : "현재 순위 확인 중",
    [],
  );

  const likedVideoFeaturedSection = useMemo(
    () =>
      authStatus === "authenticated" &&
      (buyableLikedVideoChartSection?.items.length ?? 0) > 0
        ? {
            section: buyableLikedVideoChartSection as YouTubeCategorySection,
            eyebrow: "Liked Videos",
            getRankLabel: likedVideoChartGetRankLabel,
          }
        : undefined,
    [authStatus, buyableLikedVideoChartSection, likedVideoChartGetRankLabel],
  );

  const activeChartSection =
    effectiveChartView === "realtime-surging"
      ? realtimeSurgingFeaturedSection?.section
      : effectiveChartView === "new-chart-entries"
        ? newChartEntriesFeaturedSection?.section
        : effectiveChartView === "buyable"
          ? buyableChartSection
          : effectiveChartView === "liked"
            ? buyableLikedVideoChartSection
            : effectiveChartView === "music"
              ? musicChartSection
              : displaySelectedPlaybackSection;
  const activeChartFeaturedSections =
    effectiveChartView === "all"
      ? likedVideoFeaturedSection
        ? [...featuredChartSections, likedVideoFeaturedSection]
        : featuredChartSections
      : [];
  const activeChartSectionEyebrow =
    effectiveChartView === "realtime-surging"
      ? realtimeSurgingFeaturedSection?.eyebrow
      : effectiveChartView === "new-chart-entries"
        ? newChartEntriesFeaturedSection?.eyebrow
        : effectiveChartView === "buyable"
          ? "Buyable Market"
          : effectiveChartView === "liked"
            ? "Liked Videos"
            : effectiveChartView === "music"
              ? "Music Chart"
              : effectiveChartView === "popular"
                ? "Popular Videos"
                : "Category Ranking";
  const activeChartRankLabel =
    effectiveChartView === "realtime-surging"
      ? realtimeSurgingFeaturedSection?.getRankLabel
      : effectiveChartView === "new-chart-entries"
        ? newChartEntriesFeaturedSection?.getRankLabel
        : effectiveChartView === "buyable"
          ? musicChartGetRankLabel
          : effectiveChartView === "liked"
            ? likedVideoChartGetRankLabel
            : effectiveChartView === "music"
              ? musicChartGetRankLabel
              : popularChartGetRankLabel;
  const activeChartEmptyMessage =
    effectiveChartView === "realtime-surging"
      ? realtimeSurgingFeaturedSection?.emptyMessage
      : effectiveChartView === "new-chart-entries"
        ? newChartEntriesFeaturedSection?.emptyMessage
        : effectiveChartView === "buyable"
          ? buyableChartEmptyMessage
          : effectiveChartView === "liked"
            ? isYouTubeLikedVideosConnected
              ? "YouTube 계정에서 좋아요 표시한 영상이 없습니다."
              : "YouTube를 연결하면 좋아요 표시한 동영상을 여기에서 볼 수 있습니다."
            : effectiveChartView === "music"
              ? "음악 차트에 표시할 영상이 없습니다."
              : undefined;
  const isTrendOnlyViewSelected = effectiveChartView !== "all";
  const activeTrendViewIsLoading =
    effectiveChartView === "realtime-surging"
      ? isRealtimeSurgingLoading
      : effectiveChartView === "new-chart-entries"
        ? isNewChartEntriesLoading
        : effectiveChartView === "buyable"
          ? isBuyableChartLoading
          : effectiveChartView === "liked"
            ? isYouTubeLikedVideosLoading
            : effectiveChartView === "music"
              ? isMusicChartLoading
              : false;
  const activeTrendViewIsError =
    effectiveChartView === "realtime-surging"
      ? isRealtimeSurgingError
      : effectiveChartView === "new-chart-entries"
        ? isNewChartEntriesError
        : effectiveChartView === "buyable"
          ? isBuyableChartError
          : effectiveChartView === "liked"
            ? isYouTubeLikedVideosError
            : effectiveChartView === "music"
              ? isMusicChartError
              : false;
  const usesBaseChartState =
    effectiveChartView === "all" || effectiveChartView === "popular";
  const activeChartIsLoading = usesBaseChartState
    ? isChartLoading
    : activeTrendViewIsLoading;
  const activeChartIsError = usesBaseChartState
    ? isChartError
    : activeTrendViewIsError;
  const activeChartErrorMessage =
    effectiveChartView === "liked"
      ? likedVideoErrorMessage
      : usesBaseChartState
        ? chartErrorMessage
        : activeTrendViewIsError
          ? "선택한 차트 보기를 불러오지 못했습니다."
          : undefined;
  const activeChartHasNextPage =
    effectiveChartView === "buyable"
      ? hasNextBuyableChartPage
      : effectiveChartView === "liked"
        ? hasNextLikedVideosPage
        : effectiveChartView === "music"
          ? hasNextMusicChartPage
          : effectiveChartView === "realtime-surging" ||
              effectiveChartView === "new-chart-entries"
            ? false
            : hasNextPage;
  const activeChartMainSectionCollapseKey = isTrendOnlyViewSelected
    ? activeChartSection?.categoryId
    : "chart-main-list";
  const activeChartHasResolvedTrendSignals =
    effectiveChartView === "buyable"
      ? true
      : effectiveChartView === "liked"
        ? hasResolvedLikedVideoTrendSignals
        : effectiveChartView === "music"
          ? true
          : hasResolvedChartTrendSignals;
  const activeChartIsFetchingNextPage =
    effectiveChartView === "buyable"
      ? isFetchingNextBuyableChartPage
      : effectiveChartView === "liked"
        ? isFetchingNextLikedVideosPage
        : effectiveChartView === "music"
          ? isFetchingNextMusicChartPage
          : isFetchingNextPage;
  const activeChartTrendSignalsByVideoId =
    effectiveChartView === "buyable"
      ? {}
      : effectiveChartView === "liked"
        ? likedVideoTrendSignalsByVideoId
        : effectiveChartView === "music"
          ? musicTrendSignalsByVideoId
          : chartTrendSignalsByVideoId;
  const activeChartOnLoadMore = useCallback(() => {
    if (effectiveChartView === "buyable") {
      void fetchNextBuyableChartPage();
      return;
    }

    if (effectiveChartView === "liked") {
      void fetchNextLikedVideosPage();
      return;
    }

    if (effectiveChartView === "music") {
      void onLoadMoreMusicChart();
      return;
    }

    void fetchNextPage();
  }, [
    effectiveChartView,
    fetchNextBuyableChartPage,
    fetchNextLikedVideosPage,
    fetchNextPage,
    onLoadMoreMusicChart,
  ]);
  const chartViewExpandedSectionIds = useMemo(
    (): Partial<Record<ChartViewMode, string[]>> => ({
      all: [
        "chart-main-list",
        ...featuredChartSections.map(({ section }) => section.categoryId),
        ...(likedVideoFeaturedSection
          ? [likedVideoFeaturedSection.section.categoryId]
          : []),
      ],
      buyable: buyableChartSection?.categoryId
        ? [buyableChartSection.categoryId]
        : [],
      liked: buyableLikedVideoChartSection?.categoryId
        ? [buyableLikedVideoChartSection.categoryId]
        : [],
      music: musicChartSection?.categoryId
        ? [musicChartSection.categoryId]
        : [],
      "new-chart-entries": newChartEntriesFeaturedSection?.section.categoryId
        ? [newChartEntriesFeaturedSection.section.categoryId]
        : [],
      popular: displaySelectedPlaybackSection?.categoryId
        ? [displaySelectedPlaybackSection.categoryId]
        : [],
      "realtime-surging": realtimeSurgingFeaturedSection?.section.categoryId
        ? [realtimeSurgingFeaturedSection.section.categoryId]
        : [],
    }),
    [
      buyableChartSection?.categoryId,
      buyableLikedVideoChartSection?.categoryId,
      displaySelectedPlaybackSection?.categoryId,
      likedVideoFeaturedSection,
      featuredChartSections,
      musicChartSection?.categoryId,
      newChartEntriesFeaturedSection?.section.categoryId,
      realtimeSurgingFeaturedSection?.section.categoryId,
    ],
  );

  const handleSelectChartView = useCallback(
    (viewId: string, triggerElement?: HTMLButtonElement) => {
      const nextView = chartViewOptions.find((option) => option.id === viewId);

      if (!nextView || nextView.disabled) {
        triggerElement?.blur();
        return;
      }

      const nextSectionIds = chartViewExpandedSectionIds[nextView.id] ?? [];

      if (nextSectionIds.length > 0) {
        setCollapsedHomeSectionIds((currentSectionIds) =>
          currentSectionIds.filter(
            (currentSectionId) => !nextSectionIds.includes(currentSectionId),
          ),
        );
      }

      setSelectedChartView(nextView.id);
      triggerElement?.blur();
    },
    [
      chartViewExpandedSectionIds,
      chartViewOptions,
      setCollapsedHomeSectionIds,
      setSelectedChartView,
    ],
  );

  return {
    activeChartEmptyMessage,
    activeChartErrorMessage,
    activeChartFeaturedSections,
    activeChartHasNextPage,
    activeChartHasResolvedTrendSignals,
    activeChartIsError,
    activeChartIsFetchingNextPage,
    activeChartIsLoading,
    activeChartMainSectionCollapseKey,
    activeChartOnLoadMore,
    activeChartRankLabel,
    activeChartSection,
    activeChartSectionEyebrow,
    activeChartTrendSignalsByVideoId,
    chartViewOptions,
    effectiveChartView,
    handleSelectChartView,
    selectedChartViewOption,
  };
}
