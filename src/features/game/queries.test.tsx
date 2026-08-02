import { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateScheduledSellOrderInput,
  GameAccountState,
  GameCurrentSeason,
  GamePosition,
  GameScheduledSellOrder,
  SellGamePositionsInput,
  SellGamePositionsResponse,
} from './types';
import type { GameBootstrap } from './api';
import {
  gameQueryKeys,
  useBuyGamePosition,
  useCancelScheduledSellOrder,
  useCreateScheduledSellOrder,
  useGameAccountState,
  useGameBootstrap,
  useSellGamePositions,
} from './queries';

const {
  buyGamePositionMock,
  cancelScheduledSellOrderMock,
  createScheduledSellOrderMock,
  fetchGameAccountStateMock,
  fetchGameBootstrapMock,
  sellGamePositionsMock,
} = vi.hoisted(() => ({
  buyGamePositionMock: vi.fn(),
  cancelScheduledSellOrderMock: vi.fn(),
  createScheduledSellOrderMock: vi.fn(),
  fetchGameAccountStateMock: vi.fn(),
  fetchGameBootstrapMock: vi.fn(),
  sellGamePositionsMock: vi.fn(),
}));

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');

  return {
    ...actual,
    buyGamePosition: buyGamePositionMock,
    cancelScheduledSellOrder: cancelScheduledSellOrderMock,
    createScheduledSellOrder: createScheduledSellOrderMock,
    deleteGameNotification: vi.fn(),
    deleteGameNotifications: vi.fn(),
    fetchAchievementTitles: vi.fn(),
    fetchBuyableMarketChart: vi.fn(),
    fetchCurrentGameSeason: vi.fn(),
    fetchGameAccountState: fetchGameAccountStateMock,
    fetchGameHighlights: vi.fn(),
    fetchGameBootstrap: fetchGameBootstrapMock,
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
    scheduledSellTriggerType: null,
    scheduledSellTargetRank: null,
    scheduledSellTargetProfitRatePercent: null,
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
    triggerType: 'RANK',
    targetRank: 3,
    targetProfitRatePercent: null,
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

function createAccountState(overrides: Partial<GameAccountState> = {}): GameAccountState {
  return {
    openPositions: [createOpenPosition()],
    positionHistory: [createHistoryPosition()],
    tierProgress: {
      highlightScore: 40,
      totalAssetPoints: 15000,
    },
    updatedAt: '2026-04-26T01:00:00.000Z',
    wallet: {
      balancePoints: 12000,
      realizedPnlPoints: 2000,
      reservedPoints: 0,
      seasonId: 3,
      totalAssetPoints: 15000,
    },
    ...overrides,
  } as unknown as GameAccountState;
}

describe('game query scope', () => {
  it('shares season and portfolio caches across countries', () => {
    expect(gameQueryKeys.currentSeason('token', 'KR')).toEqual(
      gameQueryKeys.currentSeason('token', 'US'),
    );
    expect(gameQueryKeys.positions('token', 'KR')).toEqual(
      gameQueryKeys.positions('token', 'JP'),
    );
    expect(gameQueryKeys.leaderboard('token', 'US')).toEqual(
      gameQueryKeys.leaderboard('token', 'KR'),
    );
  });

  it('keeps each country market cache separate', () => {
    expect(gameQueryKeys.market('token', 'KR')).not.toEqual(
      gameQueryKeys.market('token', 'US'),
    );
  });
});

describe('useGameBootstrap', () => {
  afterEach(() => {
    buyGamePositionMock.mockReset();
    fetchGameBootstrapMock.mockReset();
  });

  it('hydrates authenticated game caches from one request', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const bootstrap = {
      achievementTitles: { selectedTitle: null, titles: [] },
      buyableMarketChart: {
        availableCategories: [],
        categoryId: '0',
        description: '구매 가능 영상',
        items: [],
        label: '전체',
        nextPageToken: undefined,
      },
      currentSeason: { id: 1 },
      highlights: [],
      leaderboard: [],
      market: [],
      notifications: [],
      openPositions: [createOpenPosition()],
      positionHistory: [createHistoryPosition()],
      regionCode: 'KR',
      scheduledSellOrders: [],
      seasonResults: [],
      tierProgress: { highlightScore: 0 },
    } as unknown as GameBootstrap;
    fetchGameBootstrapMock.mockResolvedValue(bootstrap);

    const { result } = renderHook(
      () => useGameBootstrap('token-1', 'KR'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    expect(fetchGameBootstrapMock).toHaveBeenCalledTimes(1);
    expect(fetchGameBootstrapMock).toHaveBeenCalledWith('token-1', 'KR');
    expect(
      queryClient.getQueryData([
        ...gameQueryKeys.positions('token-1', 'KR', 'OPEN'),
        null,
      ]),
    ).toEqual(bootstrap.openPositions);
    expect(
      queryClient.getQueryData([
        ...gameQueryKeys.positions('token-1', 'KR', ''),
        30,
      ]),
    ).toEqual(bootstrap.positionHistory);
    expect(
      queryClient.getQueryData(
        gameQueryKeys.currentSeason('token-1', 'KR'),
      ),
    ).toEqual(bootstrap.currentSeason);
  });
});

describe('useGameAccountState', () => {
  afterEach(() => {
    fetchGameAccountStateMock.mockReset();
  });

  it('hydrates the wallet, tier, and position counts before the full bootstrap', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const currentSeason = {
      endAt: '2026-05-01T00:00:00.000Z',
      inventorySlots: {
        baseSlots: 5,
        currentTier: null,
        maxSlots: 10,
        nextTier: null,
        tiers: [],
        totalSlots: 5,
      },
      maxOpenPositions: 5,
      minHoldSeconds: 60,
      rankPointMultiplier: 100,
      regionCode: 'KR',
      scheduledSellDefaultProfitRatePercent: 10,
      scheduledSellProfitRatePresets: [5, 10, 20],
      seasonId: 3,
      seasonName: '시즌 3',
      startAt: '2026-04-01T00:00:00.000Z',
      startingBalancePoints: 10000,
      status: 'ACTIVE',
      wallet: createAccountState().wallet,
    } as GameCurrentSeason;
    const accountState = createAccountState({ currentSeason });
    fetchGameAccountStateMock.mockResolvedValue(accountState);

    const { result } = renderHook(
      () => useGameAccountState('token-1'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchGameAccountStateMock).toHaveBeenCalledTimes(1);
    expect(fetchGameAccountStateMock).toHaveBeenCalledWith('token-1');
    expect(
      queryClient.getQueryData(
        gameQueryKeys.currentSeason('token-1', 'KR'),
      ),
    ).toEqual(currentSeason);
    expect(
      queryClient.getQueryData(
        gameQueryKeys.tierProgress('token-1', 'KR'),
      ),
    ).toEqual(accountState.tierProgress);
    expect(
      queryClient.getQueryData([
        ...gameQueryKeys.positions('token-1', 'KR', 'OPEN'),
        null,
      ]),
    ).toEqual(accountState.openPositions);
    expect(
      queryClient.getQueryData([
        ...gameQueryKeys.positions('token-1', 'KR', ''),
        30,
      ]),
    ).toEqual(accountState.positionHistory);
  });
});

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
    const deferred = createDeferred<SellGamePositionsResponse>();
    sellGamePositionsMock.mockReturnValue(deferred.promise);

    queryClient.setQueryData([...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null], [createOpenPosition()]);
    queryClient.setQueryData([...gameQueryKeys.positions('token-1', 'KR', ''), 30], [createHistoryPosition()]);
    queryClient.setQueryData(
      gameQueryKeys.currentSeason('token-1', 'KR'),
      { wallet: createAccountState().wallet } as GameCurrentSeason,
    );

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

    const confirmedState = createAccountState({
      openPositions: [createOpenPosition({ quantity: 6, stakePoints: 6000 })],
      positionHistory: [createHistoryPosition({ id: 102, quantity: 4 })],
    });
    deferred.resolve({
      sales: [{
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
      }],
      state: confirmedState,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(
      queryClient.getQueryData([...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null]),
    ).toEqual(confirmedState.openPositions);
    expect(
      queryClient.getQueryData([...gameQueryKeys.positions('token-1', 'KR', ''), 30]),
    ).toEqual(confirmedState.positionHistory);
    expect(
      queryClient.getQueryData<GameCurrentSeason>(
        gameQueryKeys.currentSeason('token-1', 'KR'),
      )?.wallet,
    ).toEqual(confirmedState.wallet);
  });

  it('applies the confirmed wallet and portfolio from a buy response immediately', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const confirmedState = createAccountState({
      openPositions: [createOpenPosition({ id: 22, quantity: 1, stakePoints: 1000 })],
      wallet: {
        ...createAccountState().wallet,
        balancePoints: 9000,
      },
    });
    buyGamePositionMock.mockResolvedValue({ positionId: 22, state: confirmedState });
    queryClient.setQueryData(
      gameQueryKeys.currentSeason('token-1', 'KR'),
      { wallet: { ...confirmedState.wallet, balancePoints: 10000 } } as GameCurrentSeason,
    );
    queryClient.setQueryData(
      [...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null],
      [],
    );

    const { result } = renderHook(() => useBuyGamePosition('token-1'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        categoryId: '0',
        quantity: 1,
        regionCode: 'KR',
        stakePoints: 1000,
        videoId: 'video-1',
      });
    });

    expect(
      queryClient.getQueryData<GameCurrentSeason>(
        gameQueryKeys.currentSeason('token-1', 'KR'),
      )?.wallet.balancePoints,
    ).toBe(9000);
    expect(
      queryClient.getQueryData([...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null]),
    ).toEqual(confirmedState.openPositions);
  });

  it('adds a scheduled sell order optimistically and rolls back on failure', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const input: CreateScheduledSellOrderInput = {
      positionId: 1,
      quantity: 4,
      regionCode: 'KR',
      triggerType: 'RANK',
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
          triggerType: 'RANK',
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
          scheduledSellTriggerType: null,
          scheduledSellTargetRank: null,
          scheduledSellTargetProfitRatePercent: null,
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

  it('keeps the remaining split reservation after canceling one scheduled order', async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const deferred = createDeferred<GameScheduledSellOrder>();
    cancelScheduledSellOrderMock.mockReturnValue(deferred.promise);

    queryClient.setQueryData(gameQueryKeys.scheduledSellOrders('token-1', 'KR'), [
      createScheduledOrder({ id: 11, quantity: 4, targetRank: 3 }),
      createScheduledOrder({ id: 12, quantity: 3, targetRank: 5 }),
    ]);
    queryClient.setQueryData(
      [...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null],
      [
        createOpenPosition({
          reservedForSell: true,
          scheduledSellOrderId: 11,
          scheduledSellQuantity: 7,
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
        }),
        expect.objectContaining({
          id: 12,
          status: 'PENDING',
        }),
      ]);
      expect(queryClient.getQueryData<GamePosition[]>([...gameQueryKeys.positions('token-1', 'KR', 'OPEN'), null])).toEqual([
        expect.objectContaining({
          id: 1,
          reservedForSell: true,
          scheduledSellOrderId: 12,
          scheduledSellQuantity: 3,
          scheduledSellTargetRank: 5,
          scheduledSellTriggerDirection: 'RANK_IMPROVES_TO',
        }),
      ]);
    });

    deferred.resolve(createScheduledOrder({ id: 11, status: 'CANCELED' }));
  });
});
