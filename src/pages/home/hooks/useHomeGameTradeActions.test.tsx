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
        currentGameSeason: {
          regionCode: 'GLOBAL',
          wallet: {
            balancePoints: 100000,
          },
        } as GameCurrentSeason,
        currentGameSeasonError: null,
        logout: vi.fn().mockResolvedValue(undefined),
        maxBuyQuantity: 500,
        maxSellQuantity: 0,
        mutateBuyGamePosition,
        mutateSellGamePositions: vi.fn<(_: unknown) => Promise<SellGamePositionResponse[]>>().mockResolvedValue([]),
        onBuySuccess,
        selectedVideoId: 'video-1',
        selectedVideoMarketEntry: {
          buyBlockedReason: null,
          canBuy: true,
          currentPricePoints: 1000,
          currentRank: 1,
        } as GameMarketVideo,
        selectedRegionCode: 'KR',
        setActiveTradeModal: vi.fn(),
        setBuyQuantity: vi.fn(),
        setGameActionStatus: vi.fn(),
        setSellQuantity: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleBuyCurrentVideo();
    });

    await waitFor(() => {
      expect(mutateBuyGamePosition).toHaveBeenCalledTimes(1);
      expect(mutateBuyGamePosition).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 100, regionCode: 'KR' }),
      );
      expect(onBuySuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('refetches inventory data after a successful sell', async () => {
    const mutateSellGamePositions = vi.fn<(_: unknown) => Promise<SellGamePositionResponse[]>>().mockResolvedValue([]);
    const onSellSuccess = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useHomeGameTradeActions({
        authStatus: 'authenticated',
        currentGameSeason: {
          regionCode: 'KR',
          wallet: {
            balancePoints: 100000,
          },
        } as GameCurrentSeason,
        currentGameSeasonError: null,
        logout: vi.fn().mockResolvedValue(undefined),
        maxBuyQuantity: 100,
        maxSellQuantity: 100,
        mutateBuyGamePosition: vi.fn().mockResolvedValue({}),
        mutateSellGamePositions,
        onSellSuccess,
        selectedOpenPositionId: 1,
        selectedVideoId: 'video-1',
        selectedVideoMarketEntry: {
          buyBlockedReason: null,
          canBuy: true,
          currentPricePoints: 1000,
          currentRank: 1,
        } as GameMarketVideo,
        selectedRegionCode: 'KR',
        setActiveTradeModal: vi.fn(),
        setBuyQuantity: vi.fn(),
        setGameActionStatus: vi.fn(),
        setSellQuantity: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleSellCurrentVideo();
    });

    await waitFor(() => {
      expect(mutateSellGamePositions).toHaveBeenCalledTimes(1);
      expect(mutateSellGamePositions).toHaveBeenCalledWith(
        expect.objectContaining({ positionId: 1, quantity: 100 }),
      );
      expect(onSellSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('selects the full sellable quantity when opening the sell modal', () => {
    const setActiveTradeModal = vi.fn();
    const setSellQuantity = vi.fn();

    const { result } = renderHook(() =>
      useHomeGameTradeActions({
        authStatus: 'authenticated',
        currentGameSeason: {
          regionCode: 'KR',
          wallet: {
            balancePoints: 100000,
          },
        } as GameCurrentSeason,
        currentGameSeasonError: null,
        logout: vi.fn().mockResolvedValue(undefined),
        maxBuyQuantity: 100,
        maxSellQuantity: 100,
        mutateBuyGamePosition: vi.fn().mockResolvedValue({}),
        mutateSellGamePositions: vi.fn<(_: unknown) => Promise<SellGamePositionResponse[]>>().mockResolvedValue([]),
        selectedOpenPositionId: 1,
        selectedVideoId: 'video-1',
        selectedVideoMarketEntry: {
          buyBlockedReason: null,
          canBuy: true,
          currentPricePoints: 1000,
          currentRank: 1,
        } as GameMarketVideo,
        selectedRegionCode: 'KR',
        setActiveTradeModal,
        setBuyQuantity: vi.fn(),
        setGameActionStatus: vi.fn(),
        setSellQuantity,
      }),
    );

    setActiveTradeModal.mockClear();
    setSellQuantity.mockClear();

    act(() => {
      result.current.openSellTradeModal();
    });

    expect(setSellQuantity).toHaveBeenCalledWith(100);
    expect(setActiveTradeModal).toHaveBeenCalledWith('sell');
  });
});
