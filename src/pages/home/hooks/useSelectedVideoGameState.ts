import { useMemo } from 'react';
import type { FavoriteStreamer } from '../../../features/favorites/types';
import type { GameCurrentSeason, GameMarketVideo, GamePosition } from '../../../features/game/types';
import { getPrimaryVideoTrendBadge, getVideoTrendBadges, type VideoTrendBadge } from '../../../features/trending/presentation';
import type { VideoTrendSignal } from '../../../features/trending/types';
import type { YouTubeVideoItem } from '../../../features/youtube/types';
import {
  buildSellCandidates,
  calculateGameOrderPoints,
  DEFAULT_GAME_QUANTITY,
  formatGameQuantity,
  formatGameOrderQuantity,
  formatHoldCountdown,
  formatPoints,
  getBuyRemainingPointsText,
  getBuyShortfallPointsText,
  getGamePositionManualSellQuantity,
  getGamePositionQuantity,
  normalizeGameOrderCapacity,
  normalizeGameOrderQuantity,
  summarizeGamePositions,
  summarizeSellCandidates,
  type OpenGameHolding,
  type GamePositionSummary,
  type GameSellSummary,
} from '../gameHelpers';
import {
  formatSelectedVideoRankLabel,
  formatVideoViewCount,
  getVideoThumbnailUrl,
} from '../utils';

interface UseSelectedVideoGameStateOptions {
  authStatus: 'loading' | 'anonymous' | 'authenticated';
  canShowGameActions: boolean;
  currentGameSeason?: GameCurrentSeason;
  currentGameSeasonError: unknown;
  favoriteStreamers: FavoriteStreamer[];
  favoriteTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  gameHistoryPositions: GamePosition[];
  gameMarket: GameMarketVideo[];
  isBuySubmitting: boolean;
  isCurrentGameSeasonLoading: boolean;
  isFavoriteTogglePending: boolean;
  openGameHoldings: OpenGameHolding[];
  openGamePositions: GamePosition[];
  resolvedSelectedVideo?: YouTubeVideoItem;
  selectedOpenPositionId?: number | null;
  selectedCategoryId: string;
  selectedCategoryLabel?: string;
  selectedCountryName: string;
  selectedRegionCode: string;
  selectedVideoId?: string;
  selectedVideoRankSignalById: Record<string, VideoTrendSignal>;
  sellQuantity: number;
  buyQuantity: number;
  getRemainingHoldSeconds: (position: GamePosition) => number;
}

interface UseSelectedVideoGameStateResult {
  buyActionTitle: string;
  buyModalHelperText: string;
  buyShortfallPointsText: string | null;
  currentVideoGameHelperText: string;
  favoriteToggleHelperText: string;
  favoriteToggleLabel: string;
  gameSeasonRegionMismatch: boolean;
  isCurrentVideoGameHelperWarning: boolean;
  isSelectedChannelFavorited: boolean;
  isSelectedVideoBuyDisabled: boolean;
  isSelectedVideoSellDisabled: boolean;
  isChartActionDisabled: boolean;
  maxBuyQuantity: number;
  maxSellQuantity: number;
  normalizedBuyQuantity: number;
  normalizedSellQuantity: number;
  selectedChannelId?: string;
  selectedGameActionChannelTitle: string;
  selectedGameActionTitle: string;
  selectedVideoCurrentChartRank: number | null | undefined;
  selectedVideoHistoryTargetPosition: GamePosition | null;
  selectedVideoHistoricalPosition: GamePosition | null;
  selectedVideoIsChartOut: boolean;
  selectedVideoMarketEntry?: GameMarketVideo;
  selectedVideoOpenPosition?: GamePosition;
  selectedVideoOpenPositionCount: number;
  selectedVideoOpenPositionSummary: GamePositionSummary;
  selectedVideoPriceLabel?: string;
  selectedVideoRankLabel?: string;
  selectedVideoRankTrendIndicator: VideoTrendBadge | null;
  selectedVideoSellSummary: GameSellSummary;
  selectedVideoStatLabel?: string;
  selectedVideoTradeThumbnailUrl: string | null;
  selectedVideoTrendBadges: VideoTrendBadge[];
  selectedVideoUnitPricePoints: number | null;
  sellActionTitle: string;
  sellModalHelperText: string;
  totalSelectedVideoBuyPoints: number | null;
}

export function buildSelectedVideoTrendBadgeSource(options: {
  currentGameSeason?: GameCurrentSeason;
  selectedCategoryId: string;
  selectedCategoryLabel?: string;
  selectedRegionCode: string;
  selectedVideoMarketEntry?: GameMarketVideo;
  selectedVideoTrendSignal?: VideoTrendSignal;
}) {
  const {
    currentGameSeason,
    selectedCategoryId,
    selectedCategoryLabel,
    selectedRegionCode,
    selectedVideoMarketEntry,
    selectedVideoTrendSignal,
  } = options;

  if (selectedVideoMarketEntry) {
    return {
      categoryId: selectedCategoryId,
      categoryLabel: selectedCategoryLabel ?? '',
      capturedAt: selectedVideoMarketEntry.capturedAt,
      currentRank: selectedVideoMarketEntry.currentRank,
      currentViewCount: selectedVideoMarketEntry.currentViewCount,
      isNew: selectedVideoMarketEntry.isNew,
      previousRank: selectedVideoMarketEntry.previousRank,
      previousViewCount: null,
      rankChange: selectedVideoMarketEntry.rankChange,
      regionCode: currentGameSeason?.regionCode ?? selectedRegionCode,
      title: selectedVideoMarketEntry.title,
      channelTitle: selectedVideoMarketEntry.channelTitle,
      thumbnailUrl: selectedVideoMarketEntry.thumbnailUrl,
      videoId: selectedVideoMarketEntry.videoId,
      viewCountDelta: selectedVideoMarketEntry.viewCountDelta,
    } satisfies VideoTrendSignal;
  }

  return selectedVideoTrendSignal ?? null;
}

export default function useSelectedVideoGameState({
  authStatus,
  canShowGameActions,
  currentGameSeason,
  currentGameSeasonError,
  favoriteStreamers,
  favoriteTrendSignalsByVideoId,
  gameHistoryPositions,
  gameMarket,
  isBuySubmitting,
  isCurrentGameSeasonLoading,
  isFavoriteTogglePending,
  openGameHoldings,
  openGamePositions,
  resolvedSelectedVideo,
  selectedOpenPositionId,
  selectedCategoryId,
  selectedCategoryLabel,
  selectedCountryName,
  selectedRegionCode,
  selectedVideoId,
  selectedVideoRankSignalById,
  sellQuantity,
  buyQuantity,
  getRemainingHoldSeconds,
}: UseSelectedVideoGameStateOptions): UseSelectedVideoGameStateResult {
  const groupPositionsByVideoId = (positions: GamePosition[]) => {
    const positionsByVideoId = new Map<string, GamePosition[]>();

    for (const position of positions) {
      const existingPositions = positionsByVideoId.get(position.videoId);

      if (existingPositions) {
        existingPositions.push(position);
      } else {
        positionsByVideoId.set(position.videoId, [position]);
      }
    }

    return positionsByVideoId;
  };
  const groupHoldingsByVideoId = (holdings: OpenGameHolding[]) => {
    const holdingsByVideoId = new Map<string, OpenGameHolding[]>();

    for (const holding of holdings) {
      const existingHoldings = holdingsByVideoId.get(holding.videoId);

      if (existingHoldings) {
        existingHoldings.push(holding);
      } else {
        holdingsByVideoId.set(holding.videoId, [holding]);
      }
    }

    return holdingsByVideoId;
  };
  const openGamePositionsById = useMemo(() => {
    const positionsById = new Map<number, GamePosition>();

    for (const position of openGamePositions) {
      positionsById.set(position.id, position);
    }

    return positionsById;
  }, [openGamePositions]);
  const openGamePositionsByVideoId = useMemo(
    () => groupPositionsByVideoId(openGamePositions),
    [openGamePositions],
  );
  const gameHistoryPositionsById = useMemo(() => {
    const positionsById = new Map<number, GamePosition>();

    for (const position of gameHistoryPositions) {
      positionsById.set(position.id, position);
    }

    return positionsById;
  }, [gameHistoryPositions]);
  const gameHistoryPositionsByVideoId = useMemo(
    () => groupPositionsByVideoId(gameHistoryPositions),
    [gameHistoryPositions],
  );
  const openGameHoldingsByPositionId = useMemo(() => {
    const holdingsByPositionId = new Map<number, OpenGameHolding>();

    for (const holding of openGameHoldings) {
      holdingsByPositionId.set(holding.positionId, holding);
    }

    return holdingsByPositionId;
  }, [openGameHoldings]);
  const openGameHoldingsByVideoId = useMemo(
    () => groupHoldingsByVideoId(openGameHoldings),
    [openGameHoldings],
  );
  const selectedVideoOpenPositionsForVideo = useMemo(
    () => (selectedVideoId ? openGamePositionsByVideoId.get(selectedVideoId) ?? [] : []),
    [openGamePositionsByVideoId, selectedVideoId],
  );
  const selectedVideoOpenPosition = useMemo(
    () => {
      const matchedPosition =
        selectedOpenPositionId != null
          ? openGamePositionsById.get(selectedOpenPositionId)
          : undefined;

      if (matchedPosition && (!selectedVideoId || matchedPosition.videoId === selectedVideoId)) {
        return matchedPosition;
      }

      return selectedVideoOpenPositionsForVideo[0];
    },
    [openGamePositionsById, selectedOpenPositionId, selectedVideoId, selectedVideoOpenPositionsForVideo],
  );
  const selectedVideoOpenPositions = useMemo(
    () => (selectedVideoOpenPosition ? [selectedVideoOpenPosition] : selectedVideoOpenPositionsForVideo),
    [selectedVideoOpenPosition, selectedVideoOpenPositionsForVideo],
  );
  const selectedVideoMarketEntry = selectedVideoId
    ? gameMarket.find((marketVideo) => marketVideo.videoId === selectedVideoId)
    : undefined;
  const selectedVideoTrendSignal = selectedVideoId
    ? selectedVideoRankSignalById[selectedVideoId] ?? favoriteTrendSignalsByVideoId[selectedVideoId]
    : undefined;
  const selectedHistoricalPosition = useMemo(() => {
    const matchedPosition =
      selectedOpenPositionId != null
        ? gameHistoryPositionsById.get(selectedOpenPositionId)
        : undefined;

    if (matchedPosition && (!selectedVideoId || matchedPosition.videoId === selectedVideoId)) {
      return matchedPosition;
    }

    return selectedVideoId ? gameHistoryPositionsByVideoId.get(selectedVideoId)?.[0] : undefined;
  }, [gameHistoryPositionsByVideoId, gameHistoryPositionsById, selectedOpenPositionId, selectedVideoId]);
  const selectedVideoHistoryTargetPosition = useMemo(() => {
    const candidatePositions = [...selectedVideoOpenPositions];

    if (selectedHistoricalPosition) {
      candidatePositions.push(selectedHistoricalPosition);
    }

    if (candidatePositions.length === 0) {
      return null;
    }

    return candidatePositions.reduce((latestPosition, currentPosition) =>
      new Date(currentPosition.createdAt).getTime() > new Date(latestPosition.createdAt).getTime()
        ? currentPosition
        : latestPosition,
    );
  }, [selectedHistoricalPosition, selectedVideoOpenPositions]);
  const selectedVideoOpenPositionCount = selectedVideoOpenPositions.reduce(
    (count, position) => count + getGamePositionQuantity(position),
    0,
  );
  const selectedVideoOpenPositionSummary = useMemo(
    () => summarizeGamePositions(selectedVideoOpenPositions),
    [selectedVideoOpenPositions],
  );
  const selectedVideoUnitPricePoints = selectedVideoMarketEntry?.currentPricePoints ?? null;
  const selectedVideoAlreadyOwned = selectedVideoOpenPositionsForVideo.length > 0;
  const openDistinctVideoCount = new Set(openGamePositions.map((position) => position.videoId)).size;
  const remainingOpenPositionSlots = currentGameSeason
    ? Math.max(0, currentGameSeason.maxOpenPositions - openDistinctVideoCount)
    : 0;
  const maxBuyQuantity =
    currentGameSeason && selectedVideoUnitPricePoints
      ? Math.max(
          0,
          selectedVideoAlreadyOwned || remainingOpenPositionSlots > 0
            ? Math.floor((currentGameSeason.wallet.balancePoints * DEFAULT_GAME_QUANTITY) / selectedVideoUnitPricePoints)
            : 0,
        )
      : 0;
  const normalizedBuyQuantity = normalizeGameOrderQuantity(buyQuantity);
  const maxOrderBuyQuantity = normalizeGameOrderCapacity(maxBuyQuantity);
  const totalSelectedVideoBuyPoints =
    typeof selectedVideoUnitPricePoints === 'number'
      ? calculateGameOrderPoints(selectedVideoUnitPricePoints, normalizedBuyQuantity)
      : null;
  const selectedVideoCurrentChartRank =
    selectedVideoMarketEntry?.currentRank ??
    selectedVideoTrendSignal?.currentRank ??
    selectedVideoOpenPosition?.currentRank;
  const selectedVideoIsChartOut =
    selectedVideoMarketEntry || selectedVideoTrendSignal
      ? false
      : selectedVideoOpenPositions.some((position) => position.chartOut) || (selectedHistoricalPosition?.chartOut ?? false);
  const selectedVideoRankLabel = formatSelectedVideoRankLabel(
    selectedCountryName,
    selectedVideoCurrentChartRank,
    {
      chartOut: selectedVideoIsChartOut,
    },
  );
  const selectedVideoPriceLabel =
    typeof selectedVideoUnitPricePoints === 'number'
      ? formatPoints(selectedVideoUnitPricePoints)
      : undefined;
  const selectedVideoStatLabel = formatVideoViewCount(
    resolvedSelectedVideo?.statistics?.viewCount ??
      selectedVideoTrendSignal?.currentViewCount?.toString() ??
      selectedVideoMarketEntry?.currentViewCount?.toString(),
  );
  const selectedChannelId = resolvedSelectedVideo?.snippet.channelId?.trim();
  const gameSeasonRegionMismatch =
    Boolean(currentGameSeason?.regionCode) &&
    selectedRegionCode.toUpperCase() !== currentGameSeason?.regionCode.toUpperCase();
  const isSelectedChannelFavorited = selectedChannelId
    ? favoriteStreamers.some((favoriteStreamer) => favoriteStreamer.channelId === selectedChannelId)
    : false;
  const favoriteToggleHelperText =
    authStatus === 'authenticated'
      ? isSelectedChannelFavorited
        ? '즐겨찾는 채널입니다.'
        : '이 채널을 즐겨찾기에 추가할 수 있습니다.'
      : '로그인 후 즐겨찾기를 사용할 수 있습니다.';
  const favoriteToggleLabel =
    isFavoriteTogglePending
      ? '즐겨찾기 처리 중'
      : isSelectedChannelFavorited
        ? '즐겨찾기 저장됨'
        : '채널 즐겨찾기';
  const sellableSelectedVideoOpenPositions = useMemo(
    () =>
      [...selectedVideoOpenPositions]
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
        .filter((position) => getRemainingHoldSeconds(position) <= 0 && getGamePositionManualSellQuantity(position) > 0),
    [getRemainingHoldSeconds, selectedVideoOpenPositions],
  );
  const maxSellQuantity = sellableSelectedVideoOpenPositions.reduce(
    (count, position) => count + getGamePositionManualSellQuantity(position),
    0,
  );
  const normalizedSellQuantity = normalizeGameOrderQuantity(sellQuantity);
  const maxOrderSellQuantity = normalizeGameOrderCapacity(maxSellQuantity);
  const selectedVideoSellSummary = useMemo(
    () => summarizeSellCandidates(buildSellCandidates(sellableSelectedVideoOpenPositions, normalizedSellQuantity)),
    [normalizedSellQuantity, sellableSelectedVideoOpenPositions],
  );
  const selectedGameActionTitle =
    selectedVideoOpenPosition?.title ?? resolvedSelectedVideo?.snippet.title ?? '선택한 영상';
  const selectedOpenHolding =
    selectedOpenPositionId != null
      ? openGameHoldingsByPositionId.get(selectedOpenPositionId)
      : selectedVideoId
        ? openGameHoldingsByVideoId.get(selectedVideoId)?.[0]
        : undefined;
  const selectedOpenHoldingLockedQuantity = selectedOpenHolding?.lockedQuantity ?? 0;
  const selectedOpenHoldingNextSellableInSeconds = selectedOpenHolding?.nextSellableInSeconds ?? null;
  const sellModalHelperText =
    maxOrderSellQuantity > 0
      ? selectedOpenHoldingLockedQuantity > 0 && selectedOpenHoldingNextSellableInSeconds !== null
        ? `지금 ${formatGameOrderQuantity(maxOrderSellQuantity)} 매도 가능하고, 나머지 ${formatGameQuantity(selectedOpenHoldingLockedQuantity)}는 ${formatHoldCountdown(selectedOpenHoldingNextSellableInSeconds)} 후부터 가능합니다.`
        : `지금 매도 가능한 수량은 ${formatGameOrderQuantity(maxOrderSellQuantity)}입니다.`
      : selectedOpenHoldingNextSellableInSeconds !== null
        ? `지금은 최소 보유 시간이 지나지 않았습니다. ${formatHoldCountdown(selectedOpenHoldingNextSellableInSeconds)} 후부터 매도할 수 있습니다.`
        : '지금은 최소 보유 시간이 지나지 않아 매도 가능한 포지션이 없습니다.';
  const defaultPreviewBuyQuantity =
    maxOrderBuyQuantity > 0 ? Math.min(DEFAULT_GAME_QUANTITY, maxOrderBuyQuantity) : DEFAULT_GAME_QUANTITY;
  const buyRemainingPointsText = getBuyRemainingPointsText(
    currentGameSeason,
    selectedVideoMarketEntry,
    defaultPreviewBuyQuantity,
  );
  const buyShortfallPointsText = getBuyShortfallPointsText(
    currentGameSeason,
    selectedVideoMarketEntry,
    defaultPreviewBuyQuantity,
  );
  const buyModalRemainingPointsText = getBuyRemainingPointsText(
    currentGameSeason,
    selectedVideoMarketEntry,
    normalizedBuyQuantity,
  );
  const buyModalShortfallPointsText = getBuyShortfallPointsText(
    currentGameSeason,
    selectedVideoMarketEntry,
    normalizedBuyQuantity,
  );
  const buyModalHelperText =
    maxOrderBuyQuantity > 0
      ? selectedVideoAlreadyOwned
        ? buyModalRemainingPointsText ?? '이 영상은 보유 포인트가 허용하는 만큼 계속 추가 매수할 수 있습니다.'
        : buyModalRemainingPointsText ??
          `새 영상은 남은 종목 슬롯 ${remainingOpenPositionSlots}개 안에서, 보유 포인트가 허용하는 만큼 매수할 수 있습니다.`
      : buyModalShortfallPointsText ?? selectedVideoMarketEntry?.buyBlockedReason ?? '지금은 추가 매수할 수 없습니다.';
  const currentVideoGameHelperText =
    !canShowGameActions
      ? '매수/매도는 전체 카테고리에서만 가능합니다.'
      : authStatus !== 'authenticated'
        ? '로그인하면 지금 보는 영상도 바로 게임 포지션으로 담을 수 있습니다.'
        : selectedVideoOpenPositionCount > 0
          ? selectedVideoMarketEntry?.canBuy
            ? `현재 이 영상을 ${formatGameQuantity(selectedVideoOpenPositionCount)} 보유 중이며, 보유 포인트가 허용하는 만큼 계속 추가 매수할 수 있습니다.`
            : `현재 이 영상을 ${formatGameQuantity(selectedVideoOpenPositionCount)} 보유 중입니다.`
          : selectedVideoMarketEntry
            ? selectedVideoMarketEntry.canBuy
              ? buyRemainingPointsText ?? '지금 바로 매수할 수 있습니다.'
              : buyShortfallPointsText ??
                selectedVideoMarketEntry.buyBlockedReason ??
                '지금은 매수할 수 없습니다.'
            : currentGameSeason
              ? gameSeasonRegionMismatch
                ? `게임 시즌은 ${currentGameSeason.regionCode} 기준으로 진행 중입니다.`
                : '현재 영상은 아직 게임 거래 대상이 아닙니다.'
              : isCurrentGameSeasonLoading
                ? '게임 시즌을 불러오는 중입니다.'
                : currentGameSeasonError instanceof Error
                  ? currentGameSeasonError.message
                  : '다음 게임 시즌을 준비 중입니다.';
  const isCurrentVideoGameHelperWarning = Boolean(
    selectedVideoMarketEntry?.canBuy === false && buyShortfallPointsText,
  );
  const selectedVideoTrendBadgeSource = buildSelectedVideoTrendBadgeSource({
    currentGameSeason,
    selectedCategoryId,
    selectedCategoryLabel,
    selectedRegionCode,
    selectedVideoMarketEntry,
    selectedVideoTrendSignal,
  });
  const selectedVideoTrendBadges = getVideoTrendBadges(selectedVideoTrendBadgeSource);
  const selectedVideoRankTrendIndicator = getPrimaryVideoTrendBadge(selectedVideoTrendBadgeSource);
  const isSelectedVideoBuyDisabled =
    !selectedVideoId ||
    authStatus !== 'authenticated' ||
    isBuySubmitting ||
    !selectedVideoMarketEntry ||
    !selectedVideoMarketEntry.canBuy ||
    maxOrderBuyQuantity <= 0 ||
    !currentGameSeason;
  const isSelectedVideoSellDisabled =
    !selectedVideoId ||
    authStatus !== 'authenticated' ||
    !canShowGameActions ||
    selectedVideoOpenPositionCount <= 0;
  const buyActionTitle =
    authStatus !== 'authenticated'
      ? '로그인 후 매수할 수 있습니다.'
      : selectedVideoMarketEntry?.canBuy
        ? selectedVideoOpenPositionCount > 0
          ? '현재 영상의 추가 매수 수량을 선택합니다.'
          : '현재 영상의 매수 수량을 선택합니다.'
        : buyShortfallPointsText ??
          selectedVideoMarketEntry?.buyBlockedReason ??
          (currentGameSeason ? '현재 영상은 게임 거래 대상이 아닙니다.' : '활성 시즌이 없습니다.');
  const sellActionTitle =
    !canShowGameActions
      ? '전체 카테고리에서만 매도할 수 있습니다.'
      : maxOrderSellQuantity > 0
        ? `${formatGameOrderQuantity(maxOrderSellQuantity)}까지 수량을 선택해 매도할 수 있습니다.`
        : sellModalHelperText;
  const selectedVideoTradeThumbnailUrl =
    selectedVideoMarketEntry?.thumbnailUrl ??
    selectedVideoOpenPosition?.thumbnailUrl ??
    (resolvedSelectedVideo ? getVideoThumbnailUrl(resolvedSelectedVideo) : null);
  const selectedGameActionChannelTitle =
    selectedVideoOpenPosition?.channelTitle ??
    selectedVideoMarketEntry?.channelTitle ??
    resolvedSelectedVideo?.snippet.channelTitle ??
    '';
  const isChartActionDisabled = !selectedVideoId || !canShowGameActions;

  return {
    buyActionTitle,
    buyModalHelperText,
    buyShortfallPointsText,
    currentVideoGameHelperText,
    favoriteToggleHelperText,
    favoriteToggleLabel,
    gameSeasonRegionMismatch,
    isChartActionDisabled,
    isCurrentVideoGameHelperWarning,
    isSelectedChannelFavorited,
    isSelectedVideoBuyDisabled,
    isSelectedVideoSellDisabled,
    maxBuyQuantity,
    maxSellQuantity,
    normalizedBuyQuantity,
    normalizedSellQuantity,
    selectedChannelId,
    selectedGameActionChannelTitle,
    selectedGameActionTitle,
    selectedVideoCurrentChartRank,
    selectedVideoHistoryTargetPosition,
    selectedVideoHistoricalPosition: selectedHistoricalPosition ?? null,
    selectedVideoIsChartOut,
    selectedVideoMarketEntry,
    selectedVideoOpenPosition,
    selectedVideoOpenPositionCount,
    selectedVideoOpenPositionSummary,
    selectedVideoPriceLabel,
    selectedVideoRankLabel,
    selectedVideoRankTrendIndicator,
    selectedVideoSellSummary,
    selectedVideoStatLabel,
    selectedVideoTradeThumbnailUrl,
    selectedVideoTrendBadges,
    selectedVideoUnitPricePoints,
    sellActionTitle,
    sellModalHelperText,
    totalSelectedVideoBuyPoints,
  };
}
