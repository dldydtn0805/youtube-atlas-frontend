import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useHomeGameTradeActions from './useHomeGameTradeActions';
import type { GameCurrentSeason, GameMarketVideo, SellGamePositionResponse } from '../../../features/game/types';

describe('useHomeGameTradeActions', () => {
  it('refetches the current chart after a successful buy', async () => {
    const mutateBuyGamePosition = vi.fn().mockResolvedValue({});
    const onBuySuccess = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useHomeGameTradeActions({
        authStatus: 'authenticated',
        buyQuantity: 100,
        currentGameSeason: {
          regionCode: 'KR',
          wallet: {
            balancePoints: 100000,
          },
        } as GameCurrentSeason,
        currentGameSeasonError: null,
        gameSeasonRegionMismatch: false,
        logout: vi.fn().mockResolvedValue(undefined),
        maxBuyQuantity: 100,
        maxSellQuantity: 0,
        mutateBuyGamePosition,
        mutateSellGamePositions: vi.fn<(_: unknown) => Promise<SellGamePositionResponse[]>>().mockResolvedValue([]),
        onBuySuccess,
        selectedGameActionTitle: '테스트 영상',
        selectedVideoId: 'video-1',
        selectedVideoMarketEntry: {
          buyBlockedReason: null,
          canBuy: true,
          currentPricePoints: 1000,
          currentRank: 1,
        } as GameMarketVideo,
        selectedRegionCode: 'KR',
        sellQuantity: 100,
        setActiveTradeModal: vi.fn(),
        setBuyQuantity: vi.fn(),
        setGameActionStatus: vi.fn(),
        setSellQuantity: vi.fn(),
        totalSelectedVideoBuyPoints: 1000,
      }),
    );

    await act(async () => {
      await result.current.handleBuyCurrentVideo();
    });

    await waitFor(() => {
      expect(mutateBuyGamePosition).toHaveBeenCalledTimes(1);
      expect(onBuySuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('refetches inventory data after a successful sell', async () => {
    const mutateSellGamePositions = vi.fn<(_: unknown) => Promise<SellGamePositionResponse[]>>().mockResolvedValue([]);
    const onSellSuccess = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useHomeGameTradeActions({
        authStatus: 'authenticated',
        buyQuantity: 100,
        currentGameSeason: {
          regionCode: 'KR',
          wallet: {
            balancePoints: 100000,
          },
        } as GameCurrentSeason,
        currentGameSeasonError: null,
        gameSeasonRegionMismatch: false,
        logout: vi.fn().mockResolvedValue(undefined),
        maxBuyQuantity: 100,
        maxSellQuantity: 100,
        mutateBuyGamePosition: vi.fn().mockResolvedValue({}),
        mutateSellGamePositions,
        onSellSuccess,
        selectedGameActionTitle: '테스트 영상',
        selectedOpenPositionId: 1,
        selectedVideoId: 'video-1',
        selectedVideoMarketEntry: {
          buyBlockedReason: null,
          canBuy: true,
          currentPricePoints: 1000,
          currentRank: 1,
        } as GameMarketVideo,
        selectedRegionCode: 'KR',
        sellQuantity: 100,
        setActiveTradeModal: vi.fn(),
        setBuyQuantity: vi.fn(),
        setGameActionStatus: vi.fn(),
        setSellQuantity: vi.fn(),
        totalSelectedVideoBuyPoints: 1000,
      }),
    );

    await act(async () => {
      await result.current.handleSellCurrentVideo();
    });

    await waitFor(() => {
      expect(mutateSellGamePositions).toHaveBeenCalledTimes(1);
      expect(onSellSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
