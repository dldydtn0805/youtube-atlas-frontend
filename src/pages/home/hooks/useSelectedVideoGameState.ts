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
  formatHoldCountdown,
  formatPoints,
  getBuyRemainingPointsText,
  getBuyShortfallPointsText,
  getGamePositionQuantity,
  normalizeGameQuantity,
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
  selectedGameActionTitle: string;
  selectedVideoCurrentChartRank: number | null | undefined;
  selectedVideoHistoryTargetPosition: GamePosition | null;
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

function buildSelectedVideoTrendBadgeSource(options: {
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

  if (selectedVideoTrendSignal) {
    return selectedVideoTrendSignal;
  }

  if (!selectedVideoMarketEntry) {
    return null;
  }

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
  const selectedVideoOpenPositions = useMemo(
    () => (selectedVideoId ? openGamePositions.filter((position) => position.videoId === selectedVideoId) : []),
    [openGamePositions, selectedVideoId],
  );
  const selectedVideoOpenPosition = selectedVideoOpenPositions[0];
  const selectedVideoMarketEntry = selectedVideoId
    ? gameMarket.find((marketVideo) => marketVideo.videoId === selectedVideoId)
    : undefined;
  const selectedVideoTrendSignal = selectedVideoId
    ? selectedVideoRankSignalById[selectedVideoId] ?? favoriteTrendSignalsByVideoId[selectedVideoId]
    : undefined;
  const selectedHistoricalPosition = selectedVideoId
    ? gameHistoryPositions.find((position) => position.videoId === selectedVideoId)
    : undefined;
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
  const selectedVideoAlreadyOwned = selectedVideoOpenPositionCount > 0;
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
  const normalizedBuyQuantity = normalizeGameQuantity(buyQuantity);
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
  const selectedVideoStatLabel = formatVideoViewCount(resolvedSelectedVideo?.statistics?.viewCount);
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
        ? '이 채널은 내 즐겨찾기에 저장되어 있습니다.'
        : '지금 보는 채널을 즐겨찾기로 저장할 수 있습니다.'
      : '즐겨찾기는 로그인 후 사용할 수 있습니다.';
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
        .filter((position) => getRemainingHoldSeconds(position) <= 0),
    [getRemainingHoldSeconds, selectedVideoOpenPositions],
  );
  const maxSellQuantity = sellableSelectedVideoOpenPositions.reduce(
    (count, position) => count + getGamePositionQuantity(position),
    0,
  );
  const normalizedSellQuantity = normalizeGameQuantity(sellQuantity);
  const selectedVideoSellSummary = useMemo(
    () => summarizeSellCandidates(buildSellCandidates(sellableSelectedVideoOpenPositions, normalizedSellQuantity)),
    [normalizedSellQuantity, sellableSelectedVideoOpenPositions],
  );
  const selectedGameActionTitle =
    selectedVideoOpenPosition?.title ?? resolvedSelectedVideo?.snippet.title ?? '선택한 영상';
  const selectedOpenHolding = selectedVideoId
    ? openGameHoldings.find((holding) => holding.videoId === selectedVideoId)
    : undefined;
  const selectedOpenHoldingLockedQuantity = selectedOpenHolding?.lockedQuantity ?? 0;
  const selectedOpenHoldingNextSellableInSeconds = selectedOpenHolding?.nextSellableInSeconds ?? null;
  const sellModalHelperText =
    maxSellQuantity > 0
      ? selectedOpenHoldingLockedQuantity > 0 && selectedOpenHoldingNextSellableInSeconds !== null
        ? `지금 ${formatGameQuantity(maxSellQuantity)} 매도 가능하고, 나머지 ${formatGameQuantity(selectedOpenHoldingLockedQuantity)}는 ${formatHoldCountdown(selectedOpenHoldingNextSellableInSeconds)} 후부터 가능합니다.`
        : `지금 매도 가능한 수량은 ${formatGameQuantity(maxSellQuantity)}이며 오래된 순서부터 정리됩니다.`
      : selectedOpenHoldingNextSellableInSeconds !== null
        ? `지금은 최소 보유 시간이 지나지 않았습니다. ${formatHoldCountdown(selectedOpenHoldingNextSellableInSeconds)} 후부터 매도할 수 있습니다.`
        : '지금은 최소 보유 시간이 지나지 않아 매도 가능한 포지션이 없습니다.';
  const defaultPreviewBuyQuantity =
    maxBuyQuantity > 0 ? Math.min(DEFAULT_GAME_QUANTITY, maxBuyQuantity) : DEFAULT_GAME_QUANTITY;
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
    maxBuyQuantity > 0
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
    maxBuyQuantity <= 0 ||
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
      : maxSellQuantity > 0
        ? `${formatGameQuantity(maxSellQuantity)}까지 수량을 선택해 매도할 수 있습니다.`
        : sellModalHelperText;
  const selectedVideoTradeThumbnailUrl =
    selectedVideoMarketEntry?.thumbnailUrl ??
    selectedVideoOpenPosition?.thumbnailUrl ??
    (resolvedSelectedVideo ? getVideoThumbnailUrl(resolvedSelectedVideo) : null);
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
    selectedGameActionTitle,
    selectedVideoCurrentChartRank,
    selectedVideoHistoryTargetPosition,
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
