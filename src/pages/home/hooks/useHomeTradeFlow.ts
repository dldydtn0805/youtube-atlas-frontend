import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AuthStatus } from '../../../features/auth/types';
import type {
  CreateScheduledSellOrderInput,
  GameCurrentSeason,
  GameMarketVideo,
  ScheduledSellTriggerDirection,
} from '../../../features/game/types';
import { useGameSellPreview } from '../../../features/game/queries';
import { ApiRequestError } from '../../../lib/api';
import {
  formatPoints,
  formatRank,
  normalizeGameOrderCapacity,
  normalizeGameOrderQuantity,
  type GameSellSummary,
} from '../gameHelpers';
import useDebouncedValue from './useDebouncedValue';
import useHomeGameTradeActions from './useHomeGameTradeActions';

const SELL_PREVIEW_DEBOUNCE_MS = 300;

interface UseHomeTradeFlowOptions {
  accessToken: string | null;
  activeTradeModal: 'buy' | 'sell' | null;
  authStatus: AuthStatus;
  buyQuantity: number;
  closeTradeModal: () => void;
  createScheduledSellOrder: (input: CreateScheduledSellOrderInput) => Promise<unknown>;
  currentGameSeason?: GameCurrentSeason;
  currentGameSeasonError: unknown;
  gameSeasonRegionMismatch: boolean;
  logout: () => Promise<void>;
  maxBuyQuantity: number;
  maxSellQuantity: number;
  mutateBuyGamePosition: UseHomeGameTradeActionsOptions['mutateBuyGamePosition'];
  mutateSellGamePositions: UseHomeGameTradeActionsOptions['mutateSellGamePositions'];
  normalizedSellQuantity: number;
  onBuySuccess: () => Promise<void> | void;
  onSellSuccess: () => Promise<void> | void;
  onScheduledSellSuccess: () => Promise<void> | void;
  selectedOpenPositionId?: number | null;
  selectedSellPositionId: number | null;
  selectedGameActionTitle: string;
  selectedRegionCode: string;
  selectedVideoCurrentChartRank: number | null | undefined;
  selectedVideoId?: string;
  selectedVideoMarketEntry?: GameMarketVideo;
  selectedVideoSellSummary: GameSellSummary;
  selectedVideoUnitPricePoints: number | null;
  sellQuantity: number;
  setActiveTradeModal: Dispatch<SetStateAction<'buy' | 'sell' | null>>;
  setBuyQuantity: Dispatch<SetStateAction<number>>;
  setGameActionStatus: Dispatch<SetStateAction<string | null>>;
  setSellQuantity: Dispatch<SetStateAction<number>>;
  totalSelectedVideoBuyPoints: number | null;
}

type UseHomeGameTradeActionsOptions = Parameters<typeof useHomeGameTradeActions>[0];

function getProjectedWalletBalance(currentBalancePoints?: number | null, deltaPoints?: number | null) {
  if (typeof currentBalancePoints !== 'number' || !Number.isFinite(currentBalancePoints)) {
    return null;
  }

  if (typeof deltaPoints !== 'number' || !Number.isFinite(deltaPoints)) {
    return null;
  }

  return currentBalancePoints + deltaPoints;
}

export default function useHomeTradeFlow({
  accessToken,
  activeTradeModal,
  authStatus,
  buyQuantity,
  closeTradeModal,
  createScheduledSellOrder,
  currentGameSeason,
  currentGameSeasonError,
  gameSeasonRegionMismatch,
  logout,
  maxBuyQuantity,
  maxSellQuantity,
  mutateBuyGamePosition,
  mutateSellGamePositions,
  normalizedSellQuantity,
  onBuySuccess,
  onSellSuccess,
  onScheduledSellSuccess,
  selectedOpenPositionId,
  selectedSellPositionId,
  selectedGameActionTitle,
  selectedRegionCode,
  selectedVideoCurrentChartRank,
  selectedVideoId,
  selectedVideoMarketEntry,
  selectedVideoSellSummary,
  selectedVideoUnitPricePoints,
  sellQuantity,
  setActiveTradeModal,
  setBuyQuantity,
  setGameActionStatus,
  setSellQuantity,
  totalSelectedVideoBuyPoints,
}: UseHomeTradeFlowOptions) {
  const [isScheduledSellSubmitting, setIsScheduledSellSubmitting] = useState(false);
  const lastInstantSellDefaultKeyRef = useRef<string | null>(null);
  const [sellOrderMode, setSellOrderMode] = useState<'instant' | 'scheduled'>('instant');
  const [scheduledSellTargetRank, setScheduledSellTargetRank] = useState<number | null>(100);
  const [scheduledSellTriggerDirection, setScheduledSellTriggerDirection] =
    useState<ScheduledSellTriggerDirection>('RANK_IMPROVES_TO');

  useEffect(() => {
    if (authStatus === 'authenticated') {
      return;
    }

    setSellOrderMode('instant');
    setScheduledSellTargetRank(100);
    setScheduledSellTriggerDirection('RANK_IMPROVES_TO');
  }, [authStatus]);

  useEffect(() => {
    setSellOrderMode('instant');
    setScheduledSellTargetRank(100);
    setScheduledSellTriggerDirection('RANK_IMPROVES_TO');
  }, [selectedOpenPositionId, selectedVideoId]);

  const canScheduleSellCurrentSelection = selectedSellPositionId != null;
  const debouncedSellPreviewQuantity = useDebouncedValue(normalizedSellQuantity, SELL_PREVIEW_DEBOUNCE_MS);
  const sellPreviewRequest = useMemo(
    () =>
      debouncedSellPreviewQuantity > 0
        ? {
            positionId: selectedSellPositionId ?? undefined,
            quantity: debouncedSellPreviewQuantity,
            regionCode: selectedRegionCode,
            videoId: selectedSellPositionId == null ? selectedVideoId : undefined,
          }
        : null,
    [debouncedSellPreviewQuantity, selectedRegionCode, selectedSellPositionId, selectedVideoId],
  );
  const sellPreviewQuery = useGameSellPreview(
    accessToken,
    sellPreviewRequest,
    activeTradeModal === 'sell' && sellOrderMode === 'instant' && maxSellQuantity > 0,
  );
  const activeSellPreview =
    debouncedSellPreviewQuantity === normalizedSellQuantity &&
    sellPreviewQuery.data?.quantity === normalizedSellQuantity
      ? sellPreviewQuery.data
      : undefined;
  const [lastSuccessfulSellPreview, setLastSuccessfulSellPreview] = useState<typeof activeSellPreview>();

  useEffect(() => {
    if (activeTradeModal !== 'sell' || sellOrderMode !== 'instant') {
      setLastSuccessfulSellPreview(undefined);
      return;
    }

    if (activeSellPreview) {
      setLastSuccessfulSellPreview(activeSellPreview);
    }
  }, [activeSellPreview, activeTradeModal, sellOrderMode]);

  useEffect(() => {
    if (sellOrderMode === 'scheduled' && !canScheduleSellCurrentSelection) {
      setSellOrderMode('instant');
    }
  }, [canScheduleSellCurrentSelection, sellOrderMode]);

  useEffect(() => {
    if (activeTradeModal !== 'sell' || sellOrderMode !== 'instant') {
      lastInstantSellDefaultKeyRef.current = null;
      return;
    }

    const normalizedMaxSellQuantity = normalizeGameOrderCapacity(maxSellQuantity);
    const defaultKey = `${selectedSellPositionId ?? 'video'}:${selectedVideoId ?? ''}:${normalizedMaxSellQuantity}`;

    if (lastInstantSellDefaultKeyRef.current === defaultKey) {
      return;
    }

    lastInstantSellDefaultKeyRef.current = defaultKey;

    if (normalizedMaxSellQuantity > 0) {
      setSellQuantity(normalizedMaxSellQuantity);
    }
  }, [
    activeTradeModal,
    maxSellQuantity,
    selectedSellPositionId,
    selectedVideoId,
    sellOrderMode,
    setSellQuantity,
  ]);

  const displaySellPreview = activeSellPreview ?? lastSuccessfulSellPreview;
  const isSellPreviewPending =
    debouncedSellPreviewQuantity !== normalizedSellQuantity ||
    sellPreviewQuery.isLoading ||
    sellPreviewQuery.isFetching;
  const resolvedSellSummary = useMemo(
    () =>
      displaySellPreview
        ? {
            feePoints: displaySellPreview.sellPricePoints - displaySellPreview.settledPoints,
            grossSellPoints: displaySellPreview.sellPricePoints,
            pnlPoints: displaySellPreview.pnlPoints,
            quantity: displaySellPreview.quantity,
            settledPoints: displaySellPreview.settledPoints,
            stakePoints: displaySellPreview.stakePoints,
          }
        : selectedVideoSellSummary,
    [displaySellPreview, selectedVideoSellSummary],
  );

  const {
    handleBuyCurrentVideo,
    handleSellCurrentVideo,
    isBuySubmitting,
    isSellSubmitting,
    openBuyTradeModal,
    openSellTradeModal,
  } = useHomeGameTradeActions({
    authStatus,
    buyQuantity,
    currentGameSeason,
    currentGameSeasonError,
    gameSeasonRegionMismatch,
    logout,
    maxBuyQuantity,
    maxSellQuantity,
    mutateBuyGamePosition,
    mutateSellGamePositions,
    onBuySuccess,
    onSellSuccess,
    selectedOpenPositionId: selectedSellPositionId,
    selectedGameActionTitle,
    selectedVideoId,
    selectedVideoMarketEntry,
    selectedRegionCode,
    sellQuantity,
    setActiveTradeModal,
    setBuyQuantity,
    setGameActionStatus,
    setSellQuantity,
    totalSelectedVideoBuyPoints,
  });

  const projectedWalletBalanceAfterBuy = useMemo(
    () =>
      getProjectedWalletBalance(
        currentGameSeason?.wallet.balancePoints,
        -(totalSelectedVideoBuyPoints ?? (selectedVideoUnitPricePoints ?? 0)),
      ),
    [currentGameSeason?.wallet.balancePoints, selectedVideoUnitPricePoints, totalSelectedVideoBuyPoints],
  );
  const projectedWalletBalanceAfterSell = useMemo(
    () =>
      getProjectedWalletBalance(currentGameSeason?.wallet.balancePoints, resolvedSellSummary.settledPoints),
    [currentGameSeason?.wallet.balancePoints, resolvedSellSummary.settledPoints],
  );
  const scheduledSellConditionError = useMemo(() => {
    if (sellOrderMode !== 'scheduled') {
      return null;
    }

    if (typeof scheduledSellTargetRank !== 'number' || !Number.isFinite(scheduledSellTargetRank)) {
      return '목표 순위를 입력해 주세요.';
    }

    if (typeof selectedVideoCurrentChartRank !== 'number' || !Number.isFinite(selectedVideoCurrentChartRank)) {
      return null;
    }

    if (scheduledSellTriggerDirection === 'RANK_DROPS_TO') {
      return scheduledSellTargetRank <= selectedVideoCurrentChartRank
        ? `현재 ${formatRank(selectedVideoCurrentChartRank)}입니다. 하락 방어는 ${selectedVideoCurrentChartRank + 1}위 이하부터 설정할 수 있어요.`
        : null;
    }

    return scheduledSellTargetRank >= selectedVideoCurrentChartRank
      ? `현재 ${formatRank(selectedVideoCurrentChartRank)}입니다. 상승 목표는 ${selectedVideoCurrentChartRank - 1}위 이내부터 설정할 수 있어요.`
      : null;
  }, [
    scheduledSellTargetRank,
    scheduledSellTriggerDirection,
    selectedVideoCurrentChartRank,
    sellOrderMode,
  ]);

  const handleCreateScheduledSellOrder = useCallback(async () => {
    if (!currentGameSeason) {
      setGameActionStatus('지금은 게임 시즌을 불러올 수 없습니다.');
      return;
    }

    if (selectedSellPositionId == null) {
      setGameActionStatus('예약 매도는 인벤토리의 단일 포지션에서 설정할 수 있습니다.');
      return;
    }

    if (scheduledSellConditionError) {
      setGameActionStatus(scheduledSellConditionError);
      return;
    }

    if (typeof scheduledSellTargetRank !== 'number' || !Number.isFinite(scheduledSellTargetRank)) {
      setGameActionStatus('목표 순위를 입력해 주세요.');
      return;
    }

    const normalizedTargetRank = Math.max(1, Math.floor(scheduledSellTargetRank));

    try {
      setIsScheduledSellSubmitting(true);
      await createScheduledSellOrder({
        positionId: selectedSellPositionId,
        quantity: normalizedSellQuantity,
        regionCode: currentGameSeason.regionCode,
        targetRank: normalizedTargetRank,
        triggerDirection: scheduledSellTriggerDirection,
      });

      setActiveTradeModal(null);
      setSellOrderMode('instant');
      setScheduledSellTargetRank(100);
      setScheduledSellTriggerDirection('RANK_IMPROVES_TO');
      void onScheduledSellSuccess?.();
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.code === 'unauthorized' || error.code === 'session_expired')
      ) {
        void logout();
        return;
      }

      setGameActionStatus(
        error instanceof Error ? error.message : '예약 매도 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setIsScheduledSellSubmitting(false);
    }
  }, [
    createScheduledSellOrder,
    currentGameSeason,
    logout,
    normalizedSellQuantity,
    onScheduledSellSuccess,
    scheduledSellConditionError,
    scheduledSellTargetRank,
    scheduledSellTriggerDirection,
    selectedSellPositionId,
    setActiveTradeModal,
    setGameActionStatus,
  ]);

  const handleBuyQuantityChange = useCallback((quantity: number) => {
    const normalizedMaxBuyQuantity = normalizeGameOrderCapacity(maxBuyQuantity);

    if (normalizedMaxBuyQuantity > 0 && quantity <= 0) {
      setBuyQuantity(normalizedMaxBuyQuantity);
      return;
    }

    setBuyQuantity(
      normalizedMaxBuyQuantity > 0
        ? Math.min(normalizeGameOrderQuantity(quantity), normalizedMaxBuyQuantity)
        : normalizeGameOrderQuantity(quantity),
    );
  }, [maxBuyQuantity, setBuyQuantity]);

  const handleSellQuantityChange = useCallback((quantity: number) => {
    const normalizedMaxSellQuantity = normalizeGameOrderCapacity(maxSellQuantity);

    if (normalizedMaxSellQuantity > 0 && quantity <= 0) {
      setSellQuantity(normalizedMaxSellQuantity);
      return;
    }

    setSellQuantity(
      normalizedMaxSellQuantity > 0
        ? Math.min(normalizeGameOrderQuantity(quantity), normalizedMaxSellQuantity)
        : normalizeGameOrderQuantity(quantity),
    );
  }, [maxSellQuantity, setSellQuantity]);

  const isBuyTradeModalOpen =
    activeTradeModal === 'buy' && Boolean(selectedVideoId) && Boolean(selectedVideoMarketEntry);
  const isSellTradeModalOpen =
    activeTradeModal === 'sell' && Boolean(selectedVideoId) && maxSellQuantity > 0;

  return {
    canScheduleSellCurrentSelection,
    closeTradeModal,
    displaySellPreview,
    handleBuyCurrentVideo,
    handleBuyQuantityChange,
    handleCreateScheduledSellOrder,
    handleSellCurrentVideo,
    handleSellQuantityChange,
    isBuySubmitting,
    isBuyTradeModalOpen,
    isScheduledSellSubmitting,
    isSellPreviewPending,
    isSellSubmitting,
    isSellTradeModalOpen,
    openBuyTradeModal,
    openSellTradeModal,
    projectedWalletBalanceAfterBuy,
    projectedWalletBalanceAfterSell,
    resolvedSellSummary,
    scheduledSellConditionError,
    scheduledSellTargetRank,
    scheduledSellTriggerDirection,
    sellOrderMode,
    sellTradeUnitPointsLabel: formatPoints(selectedVideoUnitPricePoints ?? resolvedSellSummary.settledPoints ?? 0),
    setScheduledSellTargetRank,
    setScheduledSellTriggerDirection,
    setSellOrderMode,
  };
}
