import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AuthStatus } from '../../../features/auth/types';
import { FALLBACK_SCHEDULED_SELL_DEFAULT_PROFIT_RATE_PERCENT } from '../../../features/game/constants';
import type {
  CreateScheduledSellOrderInput,
  GameCurrentSeason,
  GameMarketVideo,
  ScheduledSellTriggerDirection,
  ScheduledSellTriggerType,
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
import { getDefaultSellOrderMode, getSellOrderCapacity } from '../sellOrderMode';

const SELL_PREVIEW_DEBOUNCE_MS = 300;

interface UseHomeTradeFlowOptions {
  accessToken: string | null;
  activeTradeModal: 'buy' | 'sell' | null;
  authStatus: AuthStatus;
  closeTradeModal: () => void;
  createScheduledSellOrder: (input: CreateScheduledSellOrderInput) => Promise<unknown>;
  currentGameSeason?: GameCurrentSeason;
  currentGameSeasonError: unknown;
  logout: () => Promise<void>;
  maxBuyQuantity: number;
  maxScheduledSellQuantity: number;
  maxSellQuantity: number;
  mutateBuyGamePosition: UseHomeGameTradeActionsOptions['mutateBuyGamePosition'];
  mutateSellGamePositions: UseHomeGameTradeActionsOptions['mutateSellGamePositions'];
  onBuySuccess: () => Promise<void> | void;
  onSellSuccess: () => Promise<void> | void;
  onScheduledSellSuccess: () => Promise<void> | void;
  selectedOpenPositionId?: number | null;
  scheduledSellDefaultProfitRatePercent?: number | null;
  selectedSellPositionId: number | null;
  selectedRegionCode: string;
  selectedVideoCurrentChartRank: number | null | undefined;
  selectedVideoId?: string;
  selectedVideoMarketEntry?: GameMarketVideo;
  selectedVideoSellSummary: GameSellSummary;
  selectedVideoUnitPricePoints: number | null;
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

function normalizeScheduledSellDefaultProfitRatePercent(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : FALLBACK_SCHEDULED_SELL_DEFAULT_PROFIT_RATE_PERCENT;
}

export default function useHomeTradeFlow({
  accessToken,
  activeTradeModal,
  authStatus,
  closeTradeModal,
  createScheduledSellOrder,
  currentGameSeason,
  currentGameSeasonError,
  logout,
  maxBuyQuantity,
  maxScheduledSellQuantity,
  maxSellQuantity,
  mutateBuyGamePosition,
  mutateSellGamePositions,
  onBuySuccess,
  onSellSuccess,
  onScheduledSellSuccess,
  selectedOpenPositionId,
  scheduledSellDefaultProfitRatePercent,
  selectedSellPositionId,
  selectedRegionCode,
  selectedVideoCurrentChartRank,
  selectedVideoId,
  selectedVideoMarketEntry,
  selectedVideoSellSummary,
  selectedVideoUnitPricePoints,
  setActiveTradeModal,
  setBuyQuantity,
  setGameActionStatus,
  setSellQuantity,
  totalSelectedVideoBuyPoints,
}: UseHomeTradeFlowOptions) {
  const normalizedScheduledSellDefaultProfitRatePercent =
    normalizeScheduledSellDefaultProfitRatePercent(scheduledSellDefaultProfitRatePercent);
  const [isScheduledSellSubmitting, setIsScheduledSellSubmitting] = useState(false);
  const lastInstantSellDefaultKeyRef = useRef<string | null>(null);
  const lastSellModalSelectionKeyRef = useRef<string | null>(null);
  const [sellOrderMode, setSellOrderMode] = useState<'instant' | 'scheduled'>('instant');
  const [scheduledSellTriggerType, setScheduledSellTriggerType] =
    useState<ScheduledSellTriggerType>('RANK');
  const [scheduledSellTargetRank, setScheduledSellTargetRank] = useState<number | null>(100);
  const [scheduledSellTargetProfitRatePercent, setScheduledSellTargetProfitRatePercent] =
    useState<number | null>(normalizedScheduledSellDefaultProfitRatePercent);
  const scheduledSellDefaultProfitRatePercentRef = useRef(
    normalizedScheduledSellDefaultProfitRatePercent,
  );
  scheduledSellDefaultProfitRatePercentRef.current = normalizedScheduledSellDefaultProfitRatePercent;
  const [scheduledSellTriggerDirection, setScheduledSellTriggerDirection] =
    useState<ScheduledSellTriggerDirection>('RANK_IMPROVES_TO');

  useEffect(() => {
    if (authStatus === 'authenticated') {
      return;
    }

    setSellOrderMode('instant');
    setScheduledSellTriggerType('RANK');
    setScheduledSellTargetRank(100);
    setScheduledSellTargetProfitRatePercent(normalizedScheduledSellDefaultProfitRatePercent);
    setScheduledSellTriggerDirection('RANK_IMPROVES_TO');
  }, [authStatus, normalizedScheduledSellDefaultProfitRatePercent]);

  useEffect(() => {
    if (activeTradeModal === 'sell') {
      return;
    }

    setScheduledSellTargetProfitRatePercent(normalizedScheduledSellDefaultProfitRatePercent);
  }, [activeTradeModal, normalizedScheduledSellDefaultProfitRatePercent]);

  useEffect(() => {
    setScheduledSellTriggerType('RANK');
    setScheduledSellTargetRank(100);
    setScheduledSellTargetProfitRatePercent(scheduledSellDefaultProfitRatePercentRef.current);
    setScheduledSellTriggerDirection('RANK_IMPROVES_TO');
  }, [selectedOpenPositionId, selectedVideoId]);

  useEffect(() => {
    if (activeTradeModal !== 'sell') {
      lastSellModalSelectionKeyRef.current = null;
      return;
    }

    const selectionKey = `${selectedSellPositionId ?? 'video'}:${selectedVideoId ?? ''}`;

    if (lastSellModalSelectionKeyRef.current === selectionKey) {
      return;
    }

    lastSellModalSelectionKeyRef.current = selectionKey;
    setSellOrderMode(
      getDefaultSellOrderMode(maxSellQuantity, maxScheduledSellQuantity),
    );
  }, [
    activeTradeModal,
    maxScheduledSellQuantity,
    maxSellQuantity,
    selectedSellPositionId,
    selectedVideoId,
  ]);

  const canScheduleSellCurrentSelection =
    selectedSellPositionId != null && maxScheduledSellQuantity > 0;
  const fullInstantSellQuantity = normalizeGameOrderCapacity(maxSellQuantity);
  const fullScheduledSellQuantity = normalizeGameOrderCapacity(
    maxScheduledSellQuantity,
  );
  const debouncedSellPreviewQuantity = useDebouncedValue(
    fullInstantSellQuantity,
    SELL_PREVIEW_DEBOUNCE_MS,
  );
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
    debouncedSellPreviewQuantity === fullInstantSellQuantity &&
    sellPreviewQuery.data?.quantity === fullInstantSellQuantity
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
    currentGameSeason,
    currentGameSeasonError,
    logout,
    maxBuyQuantity,
    maxSellQuantity,
    mutateBuyGamePosition,
    mutateSellGamePositions,
    onBuySuccess,
    onSellSuccess,
    selectedOpenPositionId: selectedSellPositionId,
    selectedVideoId,
    selectedVideoMarketEntry,
    selectedRegionCode,
    setActiveTradeModal,
    setBuyQuantity,
    setGameActionStatus,
    setSellQuantity,
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

    if (scheduledSellTriggerType === 'PROFIT_RATE') {
      return typeof scheduledSellTargetProfitRatePercent !== 'number' ||
        !Number.isFinite(scheduledSellTargetProfitRatePercent) ||
        scheduledSellTargetProfitRatePercent < 0
        ? '목표 수익률을 입력해 주세요.'
        : null;
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
    scheduledSellTargetProfitRatePercent,
    scheduledSellTargetRank,
    scheduledSellTriggerDirection,
    scheduledSellTriggerType,
    selectedVideoCurrentChartRank,
    sellOrderMode,
  ]);

  const handleCreateScheduledSellOrder = useCallback(async () => {
    if (!currentGameSeason) {
      setGameActionStatus('지금은 게임 시즌을 불러올 수 없습니다.');
      return;
    }

    if (selectedSellPositionId == null) {
      setGameActionStatus('예약 매도할 영상을 인벤토리에서 선택해 주세요.');
      return;
    }

    if (scheduledSellConditionError) {
      setGameActionStatus(scheduledSellConditionError);
      return;
    }

    if (fullScheduledSellQuantity <= 0) {
      setGameActionStatus('지금 예약 매도할 수 있는 영상이 없습니다.');
      return;
    }

    const inputBase = {
      positionId: selectedSellPositionId,
      quantity: fullScheduledSellQuantity,
      regionCode: selectedRegionCode,
    };
    const scheduledSellOrderInput: CreateScheduledSellOrderInput =
      scheduledSellTriggerType === 'PROFIT_RATE'
        ? {
            ...inputBase,
            triggerType: 'PROFIT_RATE',
            targetProfitRatePercent:
              typeof scheduledSellTargetProfitRatePercent === 'number'
                ? Math.max(0, scheduledSellTargetProfitRatePercent)
                : null,
          }
        : {
            ...inputBase,
            triggerType: 'RANK',
            targetRank:
              typeof scheduledSellTargetRank === 'number' && Number.isFinite(scheduledSellTargetRank)
                ? Math.max(1, Math.floor(scheduledSellTargetRank))
                : null,
            triggerDirection: scheduledSellTriggerDirection,
          };

    try {
      setIsScheduledSellSubmitting(true);
      await createScheduledSellOrder(scheduledSellOrderInput);

      setActiveTradeModal(null);
      setSellOrderMode('instant');
      setScheduledSellTriggerType('RANK');
      setScheduledSellTargetRank(100);
      setScheduledSellTargetProfitRatePercent(normalizedScheduledSellDefaultProfitRatePercent);
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
    fullScheduledSellQuantity,
    onScheduledSellSuccess,
    normalizedScheduledSellDefaultProfitRatePercent,
    scheduledSellConditionError,
    scheduledSellTargetProfitRatePercent,
    scheduledSellTargetRank,
    scheduledSellTriggerDirection,
    scheduledSellTriggerType,
    selectedSellPositionId,
    selectedRegionCode,
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
    activeTradeModal === 'sell' &&
    Boolean(selectedVideoId) &&
    (maxSellQuantity > 0 || maxScheduledSellQuantity > 0);
  const openSellTradeModalForAvailableMode = useCallback(() => {
    const defaultMode = getDefaultSellOrderMode(
      maxSellQuantity,
      maxScheduledSellQuantity,
    );
    const defaultQuantity = getSellOrderCapacity(
      defaultMode,
      maxSellQuantity,
      maxScheduledSellQuantity,
    );

    openSellTradeModal();
    setSellOrderMode(defaultMode);
    if (defaultQuantity > 0) {
      setSellQuantity(defaultQuantity);
    }
  }, [
    maxScheduledSellQuantity,
    maxSellQuantity,
    openSellTradeModal,
    setSellQuantity,
  ]);

  return {
    canScheduleSellCurrentSelection,
    closeTradeModal,
    handleBuyCurrentVideo,
    handleBuyQuantityChange,
    handleCreateScheduledSellOrder,
    handleSellCurrentVideo,
    handleSellQuantityChange,
    isBuySubmitting,
    isBuyTradeModalOpen,
    isScheduledSellSubmitting,
    isSellSubmitting,
    isSellTradeModalOpen,
    openBuyTradeModal,
    openSellTradeModal: openSellTradeModalForAvailableMode,
    projectedWalletBalanceAfterBuy,
    projectedWalletBalanceAfterSell,
    resolvedSellSummary,
    scheduledSellConditionError,
    scheduledSellTargetProfitRatePercent,
    scheduledSellTargetRank,
    scheduledSellTriggerDirection,
    scheduledSellTriggerType,
    sellOrderMode,
    sellTradeUnitPointsLabel: formatPoints(selectedVideoUnitPricePoints ?? resolvedSellSummary.settledPoints ?? 0),
    setScheduledSellTargetProfitRatePercent,
    setScheduledSellTargetRank,
    setScheduledSellTriggerDirection,
    setScheduledSellTriggerType,
    setSellOrderMode,
  };
}
