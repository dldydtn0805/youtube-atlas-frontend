import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { AuthStatus } from '../../../features/auth/types';
import type {
  CreateGamePositionInput,
  GameCurrentSeason,
  GameMarketVideo,
  SellGamePositionResponse,
  SellGamePositionsInput,
} from '../../../features/game/types';
import { ApiRequestError } from '../../../lib/api';
import {
  DEFAULT_GAME_QUANTITY,
  formatGameOrderQuantity,
  formatPoints,
  getBuyShortfallPointsText,
  normalizeGameOrderCapacity,
  normalizeGameOrderQuantity,
} from '../gameHelpers';
import { formatSignedProfitRate } from '../utils';

interface UseHomeGameTradeActionsOptions {
  authStatus: AuthStatus;
  buyQuantity: number;
  currentGameSeason?: GameCurrentSeason;
  currentGameSeasonError: unknown;
  gameSeasonRegionMismatch: boolean;
  logout: () => Promise<void>;
  maxBuyQuantity: number;
  maxSellQuantity: number;
  mutateBuyGamePosition: (input: CreateGamePositionInput) => Promise<unknown>;
  mutateSellGamePositions: (input: SellGamePositionsInput) => Promise<SellGamePositionResponse[]>;
  selectedOpenPositionId?: number | null;
  selectedGameActionTitle: string;
  selectedVideoId?: string;
  selectedVideoMarketEntry?: GameMarketVideo;
  selectedRegionCode: string;
  sellQuantity: number;
  setActiveTradeModal: Dispatch<SetStateAction<'buy' | 'sell' | null>>;
  setBuyQuantity: Dispatch<SetStateAction<number>>;
  setGameActionStatus: Dispatch<SetStateAction<string | null>>;
  setSellQuantity: Dispatch<SetStateAction<number>>;
  totalSelectedVideoBuyPoints: number | null;
}

interface UseHomeGameTradeActionsResult {
  handleBuyCurrentVideo: () => Promise<void>;
  handleSellCurrentVideo: () => Promise<void>;
  isBuySubmitting: boolean;
  isSellSubmitting: boolean;
  openBuyTradeModal: () => void;
  openSellTradeModal: () => void;
}

export default function useHomeGameTradeActions({
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
  selectedOpenPositionId,
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
}: UseHomeGameTradeActionsOptions): UseHomeGameTradeActionsResult {
  const [activeTradeRequest, setActiveTradeRequest] = useState<'buy' | 'sell' | null>(null);
  const tradeRequestLockRef = useRef<'buy' | 'sell' | null>(null);

  useEffect(() => {
    setBuyQuantity((currentQuantity) => {
      if (maxBuyQuantity <= 0) {
        return DEFAULT_GAME_QUANTITY;
      }

      return Math.min(normalizeGameOrderQuantity(currentQuantity), normalizeGameOrderCapacity(maxBuyQuantity));
    });
  }, [maxBuyQuantity, setBuyQuantity]);

  useEffect(() => {
    setSellQuantity((currentQuantity) => {
      if (maxSellQuantity <= 0) {
        return DEFAULT_GAME_QUANTITY;
      }

      return Math.min(normalizeGameOrderQuantity(currentQuantity), normalizeGameOrderCapacity(maxSellQuantity));
    });
  }, [maxSellQuantity, setSellQuantity]);

  const handleBuyCurrentVideo = useCallback(async () => {
    if (tradeRequestLockRef.current) {
      return;
    }

    if (authStatus !== 'authenticated' || !selectedVideoId) {
      setGameActionStatus('로그인 후 지금 보는 영상을 매수할 수 있습니다.');
      return;
    }

    if (!currentGameSeason) {
      setGameActionStatus(
        currentGameSeasonError instanceof Error
          ? currentGameSeasonError.message
          : '지금은 게임 시즌을 불러올 수 없습니다.',
      );
      return;
    }

    if (!selectedVideoMarketEntry) {
      setGameActionStatus(
        gameSeasonRegionMismatch
          ? `현재 게임은 ${currentGameSeason.regionCode} 시즌 기준으로 진행 중입니다.`
          : '현재 영상은 아직 게임 거래 대상이 아닙니다.',
      );
      return;
    }

    const clampedBuyQuantity = normalizeGameOrderQuantity(buyQuantity);
    const maxOrderBuyQuantity = normalizeGameOrderCapacity(maxBuyQuantity);
    const buyShortfallMessage = getBuyShortfallPointsText(
      currentGameSeason,
      selectedVideoMarketEntry,
      clampedBuyQuantity,
    );

    if (!selectedVideoMarketEntry.canBuy) {
      setGameActionStatus(
        buyShortfallMessage ?? selectedVideoMarketEntry.buyBlockedReason ?? '지금은 매수할 수 없습니다.',
      );
      return;
    }

    if (maxOrderBuyQuantity <= 0 || clampedBuyQuantity > maxOrderBuyQuantity) {
      setGameActionStatus(
        maxOrderBuyQuantity > 0
          ? `지금은 최대 ${formatGameOrderQuantity(maxOrderBuyQuantity)}까지 한 번에 매수할 수 있습니다.`
          : buyShortfallMessage ?? '지금은 매수할 수 없습니다.',
      );
      return;
    }

    try {
      tradeRequestLockRef.current = 'buy';
      setActiveTradeRequest('buy');
      await mutateBuyGamePosition({
        categoryId: '0',
        quantity: clampedBuyQuantity,
        regionCode: currentGameSeason.regionCode,
        stakePoints: selectedVideoMarketEntry.currentPricePoints,
        videoId: selectedVideoId,
      });
      setActiveTradeModal(null);
      setBuyQuantity(DEFAULT_GAME_QUANTITY);
      setGameActionStatus(
        `${formatPoints(totalSelectedVideoBuyPoints ?? selectedVideoMarketEntry.currentPricePoints)}로 ${
          selectedVideoMarketEntry.currentRank
        }위 영상을 ${formatGameOrderQuantity(clampedBuyQuantity)} 매수했어요.`,
      );
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.code === 'unauthorized' || error.code === 'session_expired')
      ) {
        void logout();
        return;
      }

      setGameActionStatus(
        error instanceof Error ? error.message : '매수에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      tradeRequestLockRef.current = null;
      setActiveTradeRequest(null);
    }
  }, [
    authStatus,
    buyQuantity,
    currentGameSeason,
    currentGameSeasonError,
    gameSeasonRegionMismatch,
    logout,
    maxBuyQuantity,
    mutateBuyGamePosition,
    selectedVideoId,
    selectedVideoMarketEntry,
    setActiveTradeModal,
    setBuyQuantity,
    setGameActionStatus,
    totalSelectedVideoBuyPoints,
  ]);

  const handleSellCurrentVideo = useCallback(async () => {
    if (tradeRequestLockRef.current) {
      return;
    }

    if (authStatus !== 'authenticated' || !selectedVideoId) {
      setGameActionStatus('로그인 후 보유 포지션을 매도할 수 있습니다.');
      return;
    }

    const clampedSellQuantity = normalizeGameOrderQuantity(sellQuantity);
    const maxOrderSellQuantity = normalizeGameOrderCapacity(maxSellQuantity);

    if (maxOrderSellQuantity <= 0 || clampedSellQuantity > maxOrderSellQuantity) {
      setGameActionStatus(
        maxOrderSellQuantity > 0
          ? `지금은 최대 ${formatGameOrderQuantity(maxOrderSellQuantity)}까지 매도할 수 있습니다.`
          : '지금 바로 매도 가능한 포지션이 없습니다.',
      );
      return;
    }

    try {
      tradeRequestLockRef.current = 'sell';
      setActiveTradeRequest('sell');
      const soldPositions = await mutateSellGamePositions({
        positionId: selectedOpenPositionId ?? undefined,
        quantity: clampedSellQuantity,
        regionCode: selectedRegionCode,
        videoId: selectedOpenPositionId == null ? selectedVideoId : undefined,
      });
      const totalSettledPoints = soldPositions.reduce((sum, response) => sum + response.settledPoints, 0);
      const totalSellPricePoints = soldPositions.reduce((sum, response) => sum + response.sellPricePoints, 0);
      const totalPnlPoints = soldPositions.reduce((sum, response) => sum + response.pnlPoints, 0);
      const totalStakePoints = soldPositions.reduce((sum, response) => sum + response.stakePoints, 0);
      const totalSoldQuantity = soldPositions.reduce((sum, response) => sum + response.quantity, 0);
      const totalFeePoints = totalSellPricePoints - totalSettledPoints;

      setActiveTradeModal(null);
      setSellQuantity(DEFAULT_GAME_QUANTITY);
      setGameActionStatus(
        `${selectedGameActionTitle} 포지션 ${formatGameOrderQuantity(totalSoldQuantity)}를 정산 ${formatPoints(totalSettledPoints)} / 수수료 ${formatPoints(totalFeePoints)} / 손익률 ${formatSignedProfitRate(
          totalPnlPoints,
          totalStakePoints,
        )} 기준으로 정리했어요.`,
      );
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.code === 'unauthorized' || error.code === 'session_expired')
      ) {
        void logout();
        return;
      }

      setGameActionStatus(
        error instanceof Error ? error.message : '일괄 매도에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      tradeRequestLockRef.current = null;
      setActiveTradeRequest(null);
    }
  }, [
    authStatus,
    logout,
    maxSellQuantity,
    mutateSellGamePositions,
    selectedOpenPositionId,
    selectedGameActionTitle,
    selectedRegionCode,
    selectedVideoId,
    sellQuantity,
    setActiveTradeModal,
    setGameActionStatus,
    setSellQuantity,
  ]);

  const openBuyTradeModal = useCallback(() => {
    setBuyQuantity((currentQuantity) => {
      if (maxBuyQuantity <= 0) {
        return DEFAULT_GAME_QUANTITY;
      }

      return Math.min(normalizeGameOrderQuantity(currentQuantity), normalizeGameOrderCapacity(maxBuyQuantity));
    });
    setActiveTradeModal('buy');
  }, [maxBuyQuantity, setActiveTradeModal, setBuyQuantity]);

  const openSellTradeModal = useCallback(() => {
    setSellQuantity((currentQuantity) => {
      if (maxSellQuantity <= 0) {
        return DEFAULT_GAME_QUANTITY;
      }

      return Math.min(normalizeGameOrderQuantity(currentQuantity), normalizeGameOrderCapacity(maxSellQuantity));
    });
    setActiveTradeModal('sell');
  }, [maxSellQuantity, setActiveTradeModal, setSellQuantity]);

  return {
    handleBuyCurrentVideo,
    handleSellCurrentVideo,
    isBuySubmitting: activeTradeRequest === 'buy',
    isSellSubmitting: activeTradeRequest === 'sell',
    openBuyTradeModal,
    openSellTradeModal,
  };
}
