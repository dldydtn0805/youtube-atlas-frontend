import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateScheduledSellOrderInput,
  GamePosition,
  GameScheduledSellOrder,
  SellGamePositionsInput,
} from './types';
import {
  gameQueryKeys,
  useCancelScheduledSellOrder,
  useCreateScheduledSellOrder,
  useSellGamePositions,
} from './queries';

const {
  cancelScheduledSellOrderMock,
  createScheduledSellOrderMock,
  sellGamePositionsMock,
} = vi.hoisted(() => ({
  cancelScheduledSellOrderMock: vi.fn(),
  createScheduledSellOrderMock: vi.fn(),
  sellGamePositionsMock: vi.fn(),
}));

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');

  return {
    ...actual,
    buyGamePosition: vi.fn(),
    cancelScheduledSellOrder: cancelScheduledSellOrderMock,
    createScheduledSellOrder: createScheduledSellOrderMock,
    deleteGameNotification: vi.fn(),
    deleteGameNotifications: vi.fn(),
    fetchAchievementTitles: vi.fn(),
    fetchBuyableMarketChart: vi.fn(),
    fetchCurrentGameSeason: vi.fn(),
    fetchGameHighlights: vi.fn(),
    fetchGameLeaderboard: vi.fn(),
    fetchGameLeaderboardHighlights: vi.fn(),
    fetchGameLeaderboardPositionRankHistory: vi.fn(),
    fetchGameLeaderboardPositions: vi.fn(),
    fetchGameMarket: vi.fn(),
    fetchGameNotifications: vi.fn(),
    fetchGamePositionRankHistory: vi.fn(),
    fetchGameTierProgress: vi.fn(),
    fetchMyGamePositions: vi.fn(),
    fetchScheduledSellOrders: vi.fn(),
    fetchSellGamePreview: vi.fn(),
    markGameNotificationsRead: vi.fn(),
    sellGamePosition: vi.fn(),
    sellGamePositions: sellGamePositionsMock,
    updateSelectedAchievementTitle: vi.fn(),
  };
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, reject, resolve };
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });
}

function createOpenPosition(overrides: Partial<GamePosition> = {}): GamePosition {
  return {
    id: 1,
    videoId: 'video-1',
    title: '테스트 영상',
    channelTitle: '테스트 채널',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    buyRank: 12,
    currentRank: 5,
    rankDiff: 7,
    quantity: 10,
    stakePoints: 10000,
    currentPricePoints: 15000,
    profitPoints: 5000,
    strategyTags: [],
    achievedStrategyTags: [],
    targetStrategyTags: [],
    projectedHighlightScore: 10,
    chartOut: false,
    status: 'OPEN',
    buyCapturedAt: '2026-04-26T00:00:00.000Z',
    createdAt: '2026-04-26T00:00:00.000Z',
    closedAt: null,
    reservedForSell: false,
    scheduledSellOrderId: null,
    scheduledSellQuantity: 0,
    scheduledSellTargetRank: null,
    scheduledSellTriggerDirection: null,
    ...overrides,
  };
}

function createHistoryPosition(overrides: Partial<GamePosition> = {}): GamePosition {
  return {
    ...createOpenPosition({
      id: 101,
      status: 'CLOSED',
      closedAt: '2026-04-25T00:00:00.000Z',
      quantity: 3,
      stakePoints: 3000,
      currentPricePoints: 4200,
      profitPoints: 1200,
    }),
    ...overrides,
  };
}

function createScheduledOrder(overrides: Partial<GameScheduledSellOrder> = {}): GameScheduledSellOrder {
  return {
    id: 11,
    userId: 7,
    seasonId: 3,
    positionId: 1,
    videoId: 'video-1',
    videoTitle: '테스트 영상',
    channelTitle: '테스트 채널',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    regionCode: 'KR',
    targetRank: 3,
    triggerDirection: 'RANK_IMPROVES_TO',
    status: 'PENDING',
    currentRank: 5,
    buyRank: 12,
    quantity: 4,
    stakePoints: 4000,
    sellPricePoints: null,
    settledPoints: null,
    pnlPoints: null,
    failureReason: null,
    triggeredAt: null,
    executedAt: null,
    canceledAt: null,
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z',
    ...overrides,
  };
}

describe('game queries optimistic mutations', () => {
  afterEach(() => {
    sellGamePositionsMock.mockReset();
    createScheduledSellOrderMock.mockReset();
    cancelScheduledSellOrderMock.mockReset();
  });

  it('updates inventory and history optimistically while selling', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const input: SellGamePositionsInput = {
      positionId: 1,
      quantity: 4,
      regionCode: 'KR',
    };
    const deferred = createDeferred<{
      balancePoints: number;
      buyRank: number;
      highlightScore: number;
      pnlPoints: number;
      positionId: number;
      quantity: number;
      rankDiff: number;
      sellPricePoints: number;
      sellRank: number;
      settledPoints: number;
      soldAt: string;
      stakePoints: number;
      videoId: string;
    }[]>();
    sellGamePositionsMock.mockReturnValue(deferred.promise);

    queryClient.setQueryData([...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null], [createOpenPosition()]);
    queryClient.setQueryData([...gameQueryKeys.positions('token-1', 'KR', ''), 30], [createHistoryPosition()]);

    const { result } = renderHook(() => useSellGamePositions('token-1'), { wrapper });

    act(() => {
      result.current.mutate(input);
    });

    await waitFor(() => {
      expect(queryClient.getQueryData<GamePosition[]>([...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null])).toEqual([
        expect.objectContaining({
          id: 1,
          quantity: 6,
          stakePoints: 6000,
          currentPricePoints: 9000,
          profitPoints: 3000,
        }),
      ]);
      expect(queryClient.getQueryData<GamePosition[]>([...gameQueryKeys.positions('token-1', 'KR', ''), 30])).toEqual([
        expect.objectContaining({
          id: expect.any(Number),
          status: 'CLOSED',
          quantity: 4,
          stakePoints: 4000,
          currentPricePoints: 6000,
          profitPoints: 2000,
        }),
        expect.objectContaining({ id: 101 }),
      ]);
    });

    deferred.resolve([
      {
        balancePoints: 12000,
        buyRank: 12,
        highlightScore: 40,
        pnlPoints: 2000,
        positionId: 1,
        quantity: 4,
        rankDiff: 6,
        sellPricePoints: 6000,
        sellRank: 6,
        settledPoints: 5982,
        soldAt: '2026-04-26T01:00:00.000Z',
        stakePoints: 4000,
        videoId: 'video-1',
      },
    ]);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('adds a scheduled sell order optimistically and rolls back on failure', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const input: CreateScheduledSellOrderInput = {
      positionId: 1,
      quantity: 4,
      regionCode: 'KR',
      targetRank: 3,
      triggerDirection: 'RANK_IMPROVES_TO',
    };
    const deferred = createDeferred<GameScheduledSellOrder>();
    createScheduledSellOrderMock.mockReturnValue(deferred.promise);

    queryClient.setQueryData(gameQueryKeys.scheduledSellOrders('token-1', 'KR'), []);
    queryClient.setQueryData([...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null], [createOpenPosition()]);

    const { result } = renderHook(() => useCreateScheduledSellOrder('token-1'), { wrapper });

    act(() => {
      result.current.mutate(input);
    });

    await waitFor(() => {
      expect(queryClient.getQueryData<GameScheduledSellOrder[]>(gameQueryKeys.scheduledSellOrders('token-1', 'KR'))).toEqual([
        expect.objectContaining({
          id: expect.any(Number),
          positionId: 1,
          quantity: 4,
          status: 'PENDING',
          targetRank: 3,
        }),
      ]);
      expect(queryClient.getQueryData<GamePosition[]>([...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null])).toEqual([
        expect.objectContaining({
          id: 1,
          reservedForSell: true,
          scheduledSellQuantity: 4,
          scheduledSellTargetRank: 3,
          scheduledSellTriggerDirection: 'RANK_IMPROVES_TO',
        }),
      ]);
    });

    deferred.reject(new Error('예약 실패'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(queryClient.getQueryData<GameScheduledSellOrder[]>(gameQueryKeys.scheduledSellOrders('token-1', 'KR'))).toEqual([]);
    expect(queryClient.getQueryData<GamePosition[]>([...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null])).toEqual([
      expect.objectContaining({
        id: 1,
        reservedForSell: false,
        scheduledSellQuantity: 0,
      }),
    ]);
  });

  it('marks a scheduled order canceled optimistically and restores it on failure', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const deferred = createDeferred<GameScheduledSellOrder>();
    cancelScheduledSellOrderMock.mockReturnValue(deferred.promise);

    queryClient.setQueryData(gameQueryKeys.scheduledSellOrders('token-1', 'KR'), [createScheduledOrder()]);
    queryClient.setQueryData(
      [...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null],
      [
        createOpenPosition({
          reservedForSell: true,
          scheduledSellOrderId: 11,
          scheduledSellQuantity: 4,
          scheduledSellTargetRank: 3,
          scheduledSellTriggerDirection: 'RANK_IMPROVES_TO',
        }),
      ],
    );

    const { result } = renderHook(() => useCancelScheduledSellOrder('token-1', 'KR'), { wrapper });

    act(() => {
      result.current.mutate(11);
    });

    await waitFor(() => {
      expect(queryClient.getQueryData<GameScheduledSellOrder[]>(gameQueryKeys.scheduledSellOrders('token-1', 'KR'))).toEqual([
        expect.objectContaining({
          id: 11,
          status: 'CANCELED',
          canceledAt: expect.any(String),
        }),
      ]);
      expect(queryClient.getQueryData<GamePosition[]>([...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null])).toEqual([
        expect.objectContaining({
          id: 1,
          reservedForSell: false,
          scheduledSellOrderId: null,
          scheduledSellQuantity: 0,
          scheduledSellTargetRank: null,
          scheduledSellTriggerDirection: null,
        }),
      ]);
    });

    deferred.reject(new Error('취소 실패'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(queryClient.getQueryData<GameScheduledSellOrder[]>(gameQueryKeys.scheduledSellOrders('token-1', 'KR'))).toEqual([
      expect.objectContaining({
        id: 11,
        status: 'PENDING',
        canceledAt: null,
      }),
    ]);
    expect(queryClient.getQueryData<GamePosition[]>([...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null])).toEqual([
      expect.objectContaining({
        id: 1,
        reservedForSell: true,
        scheduledSellOrderId: 11,
        scheduledSellQuantity: 4,
      }),
    ]);
  });
});
