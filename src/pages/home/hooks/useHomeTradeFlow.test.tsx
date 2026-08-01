import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  GameCurrentSeason,
  SellGamePositionResponse,
} from '../../../features/game/types';
import useHomeTradeFlow from './useHomeTradeFlow';

vi.mock('../../../features/game/queries', () => ({
  useGameSellPreview: () => ({ data: undefined }),
}));

describe('useHomeTradeFlow scheduled sell lock split', () => {
  it('opens scheduled mode and registers the full holding while instant sell is locked', async () => {
    const createScheduledSellOrder = vi.fn().mockResolvedValue({});

    const { result } = renderHook(() =>
      useHomeTradeFlow({
        accessToken: 'token',
        activeTradeModal: 'sell',
        authStatus: 'authenticated',
        closeTradeModal: vi.fn(),
        createScheduledSellOrder,
        currentGameSeason: {
          regionCode: 'GLOBAL',
          wallet: { balancePoints: 100_000 },
        } as GameCurrentSeason,
        currentGameSeasonError: null,
        logout: vi.fn().mockResolvedValue(undefined),
        maxBuyQuantity: 0,
        maxScheduledSellQuantity: 100,
        maxSellQuantity: 0,
        mutateBuyGamePosition: vi.fn().mockResolvedValue({}),
        mutateSellGamePositions: vi
          .fn<(_: unknown) => Promise<SellGamePositionResponse[]>>()
          .mockResolvedValue([]),
        onBuySuccess: vi.fn(),
        onScheduledSellSuccess: vi.fn(),
        onSellSuccess: vi.fn(),
        selectedOpenPositionId: 7,
        selectedRegionCode: 'KR',
        selectedSellPositionId: 7,
        selectedVideoCurrentChartRank: 150,
        selectedVideoId: 'video-1',
        selectedVideoSellSummary: {
          feePoints: 0,
          grossSellPoints: 0,
          pnlPoints: 0,
          quantity: 0,
          settledPoints: 0,
          stakePoints: 0,
        },
        selectedVideoUnitPricePoints: 100_000,
        setActiveTradeModal: vi.fn(),
        setBuyQuantity: vi.fn(),
        setGameActionStatus: vi.fn(),
        setSellQuantity: vi.fn(),
        totalSelectedVideoBuyPoints: null,
      }),
    );

    await waitFor(() => {
      expect(result.current.sellOrderMode).toBe('scheduled');
      expect(result.current.isSellTradeModalOpen).toBe(true);
    });

    await act(async () => {
      await result.current.handleCreateScheduledSellOrder();
    });

    expect(createScheduledSellOrder).toHaveBeenCalledWith({
      positionId: 7,
      quantity: 100,
      regionCode: 'KR',
      targetRank: 100,
      triggerDirection: 'RANK_IMPROVES_TO',
      triggerType: 'RANK',
    });
  });
});
