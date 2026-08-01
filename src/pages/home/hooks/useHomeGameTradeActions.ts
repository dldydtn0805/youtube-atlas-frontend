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
  getBuyShortfallPointsText,
  normalizeGameOrderCapacity,
  normalizeGameOrderQuantity,
} from '../gameHelpers';

interface UseHomeGameTradeActionsOptions {
  authStatus: AuthStatus;
  currentGameSeason?: GameCurrentSeason;
  currentGameSeasonError: unknown;
  logout: () => Promise<void>;
  maxBuyQuantity: number;
  maxSellQuantity: number;
  mutateBuyGamePosition: (input: CreateGamePositionInput) => Promise<unknown>;
  mutateSellGamePositions: (input: SellGamePositionsInput) => Promise<SellGamePositionResponse[]>;
  onBuySuccess?: () => Promise<void> | void;
  onSellSuccess?: () => Promise<void> | void;
  selectedOpenPositionId?: number | null;
  selectedVideoId?: string;
  selectedVideoMarketEntry?: GameMarketVideo;
  selectedRegionCode: string;
  setActiveTradeModal: Dispatch<SetStateAction<'buy' | 'sell' | null>>;
  setBuyQuantity: Dispatch<SetStateAction<number>>;
  setGameActionStatus: Dispatch<SetStateAction<string | null>>;
  setSellQuantity: Dispatch<SetStateAction<number>>;
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
  currentGameSeason,
  currentGameSeasonError,
  logout,
  maxBuyQuantity,
  maxSellQuantity,
  mutateBuyGamePosition,
  mutateSellGamePositions,
  onBuySuccess,
  onSellSuccess,
  selectedOpenPositionId,
  selectedVideoId,
  selectedVideoMarketEntry,
  selectedRegionCode,
  setActiveTradeModal,
  setBuyQuantity,
  setGameActionStatus,
  setSellQuantity,
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
      setGameActionStatus('현재 영상은 아직 게임 거래 대상이 아닙니다.');
      return;
    }

    const clampedBuyQuantity = DEFAULT_GAME_QUANTITY;
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
        buyShortfallMessage ?? '지금은 이 영상을 매수할 수 없습니다.',
      );
      return;
    }

    try {
      tradeRequestLockRef.current = 'buy';
      setActiveTradeRequest('buy');
      await mutateBuyGamePosition({
        categoryId: '0',
        quantity: clampedBuyQuantity,
        regionCode: selectedRegionCode,
        stakePoints: selectedVideoMarketEntry.currentPricePoints,
        videoId: selectedVideoId,
      });
      void onBuySuccess?.();
      setActiveTradeModal(null);
      setBuyQuantity(DEFAULT_GAME_QUANTITY);
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
    currentGameSeason,
    currentGameSeasonError,
    logout,
    maxBuyQuantity,
    mutateBuyGamePosition,
    onBuySuccess,
    selectedVideoId,
    selectedVideoMarketEntry,
    selectedRegionCode,
    setActiveTradeModal,
    setBuyQuantity,
    setGameActionStatus,
  ]);

  const handleSellCurrentVideo = useCallback(async () => {
    if (tradeRequestLockRef.current) {
      return;
    }

    if (authStatus !== 'authenticated' || !selectedVideoId) {
      setGameActionStatus('로그인 후 보유 영상을 매도할 수 있습니다.');
      return;
    }

    const maxOrderSellQuantity = normalizeGameOrderCapacity(maxSellQuantity);

    if (maxOrderSellQuantity <= 0) {
      setGameActionStatus('지금 바로 매도 가능한 영상이 없습니다.');
      return;
    }

    try {
      tradeRequestLockRef.current = 'sell';
      setActiveTradeRequest('sell');
      await mutateSellGamePositions({
        positionId: selectedOpenPositionId ?? undefined,
        quantity: maxOrderSellQuantity,
        regionCode: selectedRegionCode,
        videoId: selectedOpenPositionId == null ? selectedVideoId : undefined,
      });
      setActiveTradeModal(null);
      setSellQuantity(DEFAULT_GAME_QUANTITY);
      void onSellSuccess?.();
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
    onSellSuccess,
    selectedOpenPositionId,
    selectedRegionCode,
    selectedVideoId,
    setActiveTradeModal,
    setGameActionStatus,
    setSellQuantity,
  ]);

  const openBuyTradeModal = useCallback(() => {
    setBuyQuantity(DEFAULT_GAME_QUANTITY);
    setActiveTradeModal('buy');
  }, [setActiveTradeModal, setBuyQuantity]);

  const openSellTradeModal = useCallback(() => {
    const normalizedMaxSellQuantity = normalizeGameOrderCapacity(maxSellQuantity);
    setSellQuantity(normalizedMaxSellQuantity > 0 ? normalizedMaxSellQuantity : DEFAULT_GAME_QUANTITY);
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
