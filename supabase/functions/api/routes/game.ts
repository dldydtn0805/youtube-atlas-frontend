import {
  getOptionalAuth,
  memoizeRequest,
  requireAuth,
  type RequestContext,
} from '../../_shared/context.ts';
import {
  calculateChartOutPricePoints,
  calculatePositionPoints,
  calculateSignalPricePoints,
  calculateSellValues,
  GAME_QUANTITY_SCALE,
  resolveTier,
  toMarketVideo,
  toTrendVideo,
  type PriceAnchor,
  type TrendSignalRow,
} from '../../_shared/game.ts';
import { loadSeasonTiers } from '../../_shared/game-tiers.ts';
import { loadGameSettings } from '../../_shared/game-settings.ts';
import { loadPriceAnchors } from '../../_shared/price-anchors.ts';
import {
  ApiError,
  json,
  noContent,
  parsePositiveInteger,
  readJson,
  requiredSearchParam,
} from '../../_shared/http.ts';
import {
  ensureActiveSeason,
  ensureWallet,
  getPendingOrders,
  getPositionRows,
  getSignalsForPositions,
  getSignalsForRegion,
  isPositionSellLockedUntilNextSync,
  serializePosition,
  signalMap,
  tierProgressResponse,
  tierResponse,
  walletResponse,
  type GamePositionRow,
  type GameWalletRow,
  type ScheduledOrderRow,
} from './game-helpers.ts';
import {
  gamePositionSignalMap,
  getGamePositionSignal,
} from './game-position-signals.ts';

interface BuyBody {
  categoryId?: string;
  quantity?: number;
  regionCode?: string;
  stakePoints?: number;
  videoId?: string;
}

interface SellBody {
  positionId?: number;
  quantity?: number;
  regionCode?: string;
  videoId?: string;
}

interface ScheduledOrderBody {
  positionId?: number;
  quantity?: number;
  regionCode?: string;
  targetProfitRatePercent?: number | null;
  targetRank?: number | null;
  triggerDirection?: string;
  triggerType?: string;
}

const VIDEO_ALREADY_OWNED_MESSAGE =
  '이미 보유 중인 영상입니다. 매도한 뒤 다시 매수할 수 있습니다.';
const NEXT_TREND_SYNC_REQUIRED_MESSAGE =
  '현재 순위 기준으로 매수한 영상입니다. 다음 순위 갱신 후 매도할 수 있습니다.';
const FULL_POSITION_SELL_REQUIRED_MESSAGE =
  '이 영상은 한 번에 매도해 주세요.';

async function listSerializedPositions(
  context: RequestContext,
  options: {
    limit?: number;
    seasonId: number;
    status?: string | null;
    userId: number;
  },
) {
  const positions = await getPositionRows(context.service, {
    limit: options.limit,
    seasonId: options.seasonId,
    status: options.status,
    userId: options.userId,
  });
  const [signals, orders, priceAnchors] = await Promise.all([
    getSignalsForPositions(context.service, positions),
    getPendingOrders(context.service, options.seasonId, options.userId),
    loadPriceAnchors(context.service),
  ]);
  const signalsByPosition = gamePositionSignalMap(signals);
  const ordersByPositionId = new Map(orders.map((order) => [order.position_id, order]));

  return positions.map((position) =>
    serializePosition(
      position,
      getGamePositionSignal(signalsByPosition, position),
      ordersByPositionId.get(position.id),
      priceAnchors,
    ),
  );
}

async function buildGameAccountState(
  context: RequestContext,
  userId: number,
  options: { includeCurrentSeason?: boolean } = {},
) {
  const season = await ensureActiveSeason(context.service);
  const [
    openPositions,
    recentPositions,
    wallet,
    pendingOrders,
    priceAnchors,
    tiers,
    gameSettings,
  ] = await Promise.all([
    getPositionRows(context.service, {
      seasonId: season.id,
      status: 'OPEN',
      userId,
    }),
    getPositionRows(context.service, {
      limit: 30,
      seasonId: season.id,
      userId,
    }),
    ensureWallet(context.service, season, userId),
    getPendingOrders(context.service, season.id, userId),
    loadPriceAnchors(context.service),
    loadSeasonTiers(context.service, season.id),
    options.includeCurrentSeason
      ? loadGameSettings(context.service)
      : Promise.resolve(null),
  ]);
  const positionsById = new Map(
    [...openPositions, ...recentPositions].map((position) => [
      position.id,
      position,
    ]),
  );
  const signals = await getSignalsForPositions(
    context.service,
    [...positionsById.values()],
  );
  const signalsByPosition = gamePositionSignalMap(signals);
  const pendingOrderByPositionId = new Map<number, ScheduledOrderRow>();

  pendingOrders.forEach((order) => {
    if (!pendingOrderByPositionId.has(order.position_id)) {
      pendingOrderByPositionId.set(order.position_id, order);
    }
  });

  const serializeAccountPosition = (position: GamePositionRow) =>
    serializePosition(
      position,
      getGamePositionSignal(signalsByPosition, position),
      pendingOrderByPositionId.get(position.id),
      priceAnchors,
    );
  const walletSummary = walletResponse(
    wallet,
    openPositions,
    (position) => getGamePositionSignal(signalsByPosition, position),
    priceAnchors,
  );
  const tierProgress = tierProgressResponse(
    season,
    walletSummary.totalAssetPoints,
    tiers,
  );
  const currentTier = resolveTier(walletSummary.totalAssetPoints, tiers);
  const nextTier = tiers.find(
    (tier) => walletSummary.totalAssetPoints < tier.minScore,
  ) ?? null;

  return {
    ...(gameSettings
      ? {
          currentSeason: {
            endAt: season.end_at,
            inventorySlots: {
              baseSlots: season.max_open_positions,
              currentTier: tierResponse(currentTier),
              maxSlots:
                tiers.at(-1)?.inventorySlots ?? currentTier.inventorySlots,
              nextTier: nextTier ? tierResponse(nextTier) : null,
              tiers: tiers.map(tierResponse),
              totalSlots: currentTier.inventorySlots,
            },
            maxOpenPositions: currentTier.inventorySlots,
            minHoldSeconds: season.min_hold_seconds,
            notifications: [],
            rankPointMultiplier: season.rank_point_multiplier,
            regionCode: season.region_code,
            seasonId: season.id,
            seasonName: season.name,
            scheduledSellDefaultProfitRatePercent:
              gameSettings.scheduledSellDefaultProfitRatePercent,
            scheduledSellProfitRatePresets:
              gameSettings.scheduledSellProfitRatePresets,
            startAt: season.start_at,
            startingBalancePoints: season.starting_balance_points,
            status: season.status,
            wallet: walletSummary,
          },
        }
      : {}),
    openPositions: openPositions.map(serializeAccountPosition),
    positionHistory: recentPositions.map(serializeAccountPosition),
    tierProgress,
    updatedAt: (wallet as GameWalletRow).updated_at,
    wallet: walletSummary,
  };
}

async function currentGameContext(context: RequestContext, marketRegionCode: string, userId: number) {
  const normalizedRegionCode = marketRegionCode.toUpperCase();

  return memoizeRequest(
    context,
    `game:context:${userId}:${normalizedRegionCode}`,
    async () => {
      const season = await ensureActiveSeason(context.service);
      const wallet = await ensureWallet(context.service, season, userId);
      const positions = await getPositionRows(context.service, {
        seasonId: season.id,
        userId,
      });
      const [signals, positionSignals, priceAnchors, tiers] = await Promise.all([
        getSignalsForRegion(context.service, normalizedRegionCode),
        getSignalsForPositions(context.service, positions),
        loadPriceAnchors(context.service),
        loadSeasonTiers(context.service, season.id),
      ]);
      const signalsByVideoId = signalMap(signals);
      const signalsByPosition = gamePositionSignalMap(positionSignals);
      const walletSummary = walletResponse(
        wallet,
        positions,
        (position) => getGamePositionSignal(signalsByPosition, position),
        priceAnchors,
      );

      return {
        positions,
        priceAnchors,
        season,
        signals,
        signalsByVideoId,
        tiers,
        totalAssetPoints: walletSummary.totalAssetPoints,
        wallet,
        walletSummary,
      };
    },
  );
}

function scheduledOrderResponse(
  order: ScheduledOrderRow,
  position: GamePositionRow,
  signal?: TrendSignalRow,
) {
  return {
    buyRank: position.buy_rank,
    canceledAt: order.canceled_at,
    channelTitle: position.channel_title,
    createdAt: order.created_at,
    currentRank: signal?.current_rank ?? null,
    executedAt: order.executed_at,
    failureReason: order.failure_reason,
    id: order.id,
    pnlPoints: order.pnl_points,
    positionId: order.position_id,
    quantity: order.quantity,
    regionCode: order.region_code,
    seasonId: order.season_id,
    sellPricePoints: order.sell_price_points,
    settledPoints: order.settled_points,
    stakePoints: Math.round((position.stake_points * order.quantity) / position.quantity),
    status: order.status,
    targetProfitRatePercent: order.target_profit_rate_percent,
    targetRank: order.target_rank,
    thumbnailUrl: position.thumbnail_url ?? '',
    triggerDirection: order.trigger_direction,
    triggerType: order.trigger_type,
    triggeredAt: order.triggered_at,
    updatedAt: order.updated_at,
    userId: order.user_id,
    videoId: position.video_id,
    videoTitle: position.title,
  };
}

async function listScheduledOrders(context: RequestContext, userId: number) {
  const season = await ensureActiveSeason(context.service);
  const { data: orders, error } = await context.service
    .from('game_scheduled_sell_orders')
    .select('*')
    .eq('season_id', season.id)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const positionIds = [...new Set((orders ?? []).map((order) => order.position_id))];
  const { data: positions, error: positionError } =
    positionIds.length === 0
      ? { data: [], error: null }
      : await context.service.from('game_positions').select('*').in('id', positionIds);

  if (positionError) throw positionError;

  const positionRows = (positions ?? []) as GamePositionRow[];
  const signalsByPosition = gamePositionSignalMap(
    await getSignalsForPositions(context.service, positionRows),
  );
  const positionsById = new Map(
    positionRows.map((position) => [position.id, position]),
  );

  return (orders ?? [])
    .map((order) => {
      const position = positionsById.get(order.position_id);
      return position
        ? scheduledOrderResponse(
            order as ScheduledOrderRow,
            position,
            getGamePositionSignal(signalsByPosition, position),
          )
        : null;
    })
    .filter(Boolean);
}

async function findSellPositions(
  context: RequestContext,
  userId: number,
  seasonId: number,
  body: SellBody,
) {
  let query = context.service
    .from('game_positions')
    .select('*')
    .eq('season_id', seasonId)
    .eq('user_id', userId)
    .eq('status', 'OPEN')
    .order('created_at', { ascending: true });

  if (body.positionId) {
    query = query.eq('id', body.positionId);
  } else if (body.videoId) {
    query = query.eq('video_id', body.videoId);
  } else {
    throw new ApiError(400, 'validation_error', '매도할 영상을 선택해 주세요.');
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data?.length) {
    throw new ApiError(404, 'position_not_found', '매도할 영상을 찾을 수 없습니다.');
  }

  return data as GamePositionRow[];
}

async function previewSell(
  context: RequestContext,
  userId: number,
  body: SellBody,
  providedPriceAnchors?: ReadonlyArray<PriceAnchor>,
) {
  const quantity = Math.floor(body.quantity ?? 0);

  if (quantity <= 0) {
    throw new ApiError(400, 'validation_error', '매도할 영상을 확인해 주세요.');
  }

  const [season, priceAnchors] = await Promise.all([
    ensureActiveSeason(context.service),
    providedPriceAnchors ?? loadPriceAnchors(context.service),
  ]);
  const positions = await findSellPositions(context, userId, season.id, body);
  const fullPositionQuantity = positions.reduce(
    (total, position) => total + position.quantity,
    0,
  );

  if (quantity !== fullPositionQuantity) {
    throw new ApiError(
      400,
      'partial_position_sell_disabled',
      FULL_POSITION_SELL_REQUIRED_MESSAGE,
    );
  }

  const signalsByPosition = gamePositionSignalMap(
    await getSignalsForPositions(context.service, positions),
  );
  let remainingQuantity = quantity;
  const items = [];

  for (const position of positions) {
    if (remainingQuantity <= 0) break;

    const soldQuantity = Math.min(position.quantity, remainingQuantity);
    const soldStakePoints = Math.round((position.stake_points * soldQuantity) / position.quantity);
    const signal = getGamePositionSignal(signalsByPosition, position);

    if (isPositionSellLockedUntilNextSync(position, signal)) {
      throw new ApiError(
        409,
        'next_trend_sync_required',
        NEXT_TREND_SYNC_REQUIRED_MESSAGE,
      );
    }

    const sellRank = signal?.current_rank ?? 200;
    const unitPricePoints = signal
      ? calculateSignalPricePoints(signal, priceAnchors)
      : calculateChartOutPricePoints(priceAnchors);
    const values = calculateSellValues(soldStakePoints, soldQuantity, unitPricePoints);
    const projectedHighlightScore = Math.max(0, (position.buy_rank - sellRank) * 100);

    items.push({
      appliedHighlightScoreDelta: projectedHighlightScore,
      bestHighlightScore: 0,
      buyRank: position.buy_rank,
      pnlPoints: values.pnlPoints,
      positionId: position.id,
      projectedHighlightScore,
      quantity: soldQuantity,
      sellPricePoints: values.sellPricePoints,
      settledPoints: values.settledPoints,
      stakePoints: soldStakePoints,
      willUpdateRecord: projectedHighlightScore > 0,
    });
    remainingQuantity -= soldQuantity;
  }

  if (remainingQuantity > 0) {
    throw new ApiError(400, 'insufficient_position_quantity', '매도할 보유 영상이 없습니다.');
  }

  const totals = items.reduce(
    (result, item) => ({
      pnlPoints: result.pnlPoints + item.pnlPoints,
      sellPricePoints: result.sellPricePoints + item.sellPricePoints,
      settledPoints: result.settledPoints + item.settledPoints,
      stakePoints: result.stakePoints + item.stakePoints,
    }),
    {
      pnlPoints: 0,
      sellPricePoints: 0,
      settledPoints: 0,
      stakePoints: 0,
    },
  );

  return {
    appliedHighlightScoreDelta: items.reduce(
      (total, item) => total + item.appliedHighlightScoreDelta,
      0,
    ),
    items,
    projectedHighlightScore: items.reduce((total, item) => total + item.projectedHighlightScore, 0),
    quantity,
    recordEligibleCount: items.filter((item) => item.willUpdateRecord).length,
    sellRank: getGamePositionSignal(signalsByPosition, positions[0])?.current_rank ?? 200,
    ...totals,
  };
}

async function executeSell(context: RequestContext, userId: number, body: SellBody) {
  const priceAnchors = await loadPriceAnchors(context.service);
  const preview = await previewSell(context, userId, body, priceAnchors);
  const responses = [];

  for (const item of preview.items) {
    const { data: position, error: positionError } = await context.service
      .from('game_positions')
      .select('*')
      .eq('id', item.positionId)
      .single<GamePositionRow>();

    if (positionError) throw positionError;

    const signal = signalMap(
      await getSignalsForRegion(context.service, position.region_code),
    ).get(position.video_id);
    const sellRank = signal?.current_rank ?? 200;
    const unitPricePoints = signal
      ? calculateSignalPricePoints(signal, priceAnchors)
      : calculateChartOutPricePoints(priceAnchors);
    const { data, error } = await context.service.rpc('atlas_sell_position', {
      target_position_id: position.id,
      target_quantity: item.quantity,
      target_sell_rank: sellRank,
      target_unit_price_points: unitPricePoints,
      target_user_id: userId,
    });

    if (error) {
      if (error.message.includes('next_trend_sync_required')) {
        throw new ApiError(
          409,
          'next_trend_sync_required',
          NEXT_TREND_SYNC_REQUIRED_MESSAGE,
        );
      }
      if (error.message.includes('partial_position_sell_disabled')) {
        throw new ApiError(
          400,
          'partial_position_sell_disabled',
          FULL_POSITION_SELL_REQUIRED_MESSAGE,
        );
      }
      throw error;
    }
    responses.push(data);

    if ((data?.highlightScore ?? 0) > 0) {
      await context.service.from('game_highlights').insert({
        description: `${position.buy_rank}위에서 ${sellRank}위까지 상승한 영상입니다.`,
        highlight_rank: sellRank,
        highlight_score: data.highlightScore,
        highlight_type: 'RANK_RISE',
        position_id: position.id,
        profit_points: data.pnlPoints,
        profit_rate_percent:
          data.stakePoints > 0 ? (data.pnlPoints * 100) / data.stakePoints : null,
        region_code: position.region_code,
        season_id: position.season_id,
        strategy_tags: [],
        title: '순위 상승 기록',
        user_id: userId,
      });
    }
  }

  return responses;
}

async function positionHistory(context: RequestContext, position: GamePositionRow) {
  const { data: runs, error: runError } = await context.service
    .from('video_trend_runs')
    .select('id, captured_at')
    .eq('region_code', position.region_code)
    .in('category_id', ['all', '0', position.category_id])
    .gte('captured_at', position.buy_captured_at)
    .order('captured_at', { ascending: true })
    .limit(200);

  if (runError) throw runError;

  const runIds = (runs ?? []).map((run) => run.id);
  const { data: snapshots, error: snapshotError } =
    runIds.length === 0
      ? { data: [], error: null }
      : await context.service
          .from('video_trend_snapshots')
          .select('run_id, rank, view_count')
          .eq('video_id', position.video_id)
          .in('run_id', runIds);

  if (snapshotError) throw snapshotError;

  const snapshotByRunId = new Map((snapshots ?? []).map((snapshot) => [snapshot.run_id, snapshot]));
  const points = (runs ?? []).map((run) => {
    const snapshot = snapshotByRunId.get(run.id);
    const capturedAt = new Date(run.captured_at).getTime();
    const buyAt = new Date(position.buy_captured_at).getTime();
    const closedAt = position.closed_at ? new Date(position.closed_at).getTime() : null;

    return {
      buyPoint: Math.abs(capturedAt - buyAt) < 60 * 60 * 1000,
      capturedAt: run.captured_at,
      chartOut: !snapshot,
      rank: snapshot?.rank ?? null,
      runId: run.id,
      sellPoint: closedAt !== null && Math.abs(capturedAt - closedAt) < 60 * 60 * 1000,
      viewCount: snapshot?.view_count ?? null,
    };
  });
  const latestPoint = points.at(-1);

  return {
    buyCapturedAt: position.buy_captured_at,
    buyRank: position.buy_rank,
    channelTitle: position.channel_title,
    closedAt: position.closed_at,
    latestCapturedAt: latestPoint?.capturedAt ?? position.buy_captured_at,
    latestChartOut: latestPoint?.chartOut ?? true,
    latestRank: latestPoint?.rank ?? null,
    points,
    positionId: position.id,
    sellRank: position.sell_rank,
    status: position.status,
    thumbnailUrl: position.thumbnail_url ?? '',
    title: position.title,
    videoId: position.video_id,
  };
}

async function achievementTitleCollection(context: RequestContext, userId: number) {
  const { data: earnedRows, error: earnedError } = await context.service
    .from('user_achievement_titles')
    .select('title_code, earned_at')
    .eq('user_id', userId);

  if (earnedError) throw earnedError;

  if (!(earnedRows ?? []).some((row) => row.title_code === 'bronze-investor')) {
    await context.service.from('user_achievement_titles').insert({
      title_code: 'bronze-investor',
      user_id: userId,
    });
  }

  const [{ data: titles, error: titleError }, { data: setting, error: settingError }] =
    await Promise.all([
      context.service
        .from('achievement_titles')
        .select('*')
        .order('sort_order', { ascending: true }),
      context.service
        .from('user_achievement_title_settings')
        .select('selected_title_code')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

  if (titleError) throw titleError;
  if (settingError) throw settingError;

  const earnedByCode = new Map((earnedRows ?? []).map((row) => [row.title_code, row.earned_at]));
  if (!earnedByCode.has('bronze-investor')) {
    earnedByCode.set('bronze-investor', new Date().toISOString());
  }

  const titleResponses = (titles ?? []).map((title) => ({
    code: title.code,
    description: title.description,
    displayName: title.display_name,
    earned: earnedByCode.has(title.code),
    earnedAt: earnedByCode.get(title.code) ?? null,
    grade: title.grade,
    selected: setting?.selected_title_code === title.code,
    shortName: title.short_name,
  }));
  const selectedTitle = titleResponses.find((title) => title.selected && title.earned) ?? null;

  return {
    selectedTitle: selectedTitle
      ? {
          code: selectedTitle.code,
          description: selectedTitle.description,
          displayName: selectedTitle.displayName,
          grade: selectedTitle.grade,
          shortName: selectedTitle.shortName,
        }
      : null,
    titles: titleResponses,
  };
}

async function readGameRouteData(
  context: RequestContext,
  route: string,
): Promise<unknown> {
  const url = new URL(route, 'https://atlas.internal');
  const response = await handleGameRoute(
    {
      ...context,
      url,
    },
    'GET',
    url.pathname,
  );

  if (!response) {
    throw new ApiError(500, 'bootstrap_route_missing', `Bootstrap route missing: ${url.pathname}`);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as {
      code?: string;
      message?: string;
    } | null;
    throw new ApiError(
      response.status,
      body?.code ?? 'bootstrap_route_failed',
      body?.message ?? `Bootstrap route failed: ${url.pathname}`,
    );
  }

  return response.status === 204 ? null : response.json();
}

export async function handleGameRoute(context: RequestContext, method: string, path: string) {
  if (path === '/api/game/bootstrap' && method === 'GET') {
    const startedAt = performance.now();
    const { profile } = await requireAuth(context);
    const regionCode = requiredSearchParam(context.url, 'regionCode').toUpperCase();

    await currentGameContext(context, regionCode, profile.id);

    const params = new URLSearchParams({ regionCode });
    const query = params.toString();
    const [
      achievementTitles,
      buyableMarketChart,
      currentSeason,
      highlights,
      leaderboard,
      market,
      notifications,
      openPositions,
      positionHistory,
      scheduledSellOrders,
      seasonResults,
      tierProgress,
    ] = await Promise.all([
      readGameRouteData(context, '/api/game/achievement-titles/me'),
      readGameRouteData(context, `/api/game/market/buyable-chart?${query}`),
      readGameRouteData(context, `/api/game/seasons/current?${query}`),
      readGameRouteData(context, `/api/game/highlights?${query}`),
      readGameRouteData(context, `/api/game/leaderboard?${query}`),
      readGameRouteData(context, `/api/game/market?${query}`),
      readGameRouteData(context, `/api/game/notifications?${query}`),
      readGameRouteData(context, `/api/game/positions/me?${query}&status=OPEN`),
      readGameRouteData(context, `/api/game/positions/me?${query}&limit=30`),
      readGameRouteData(context, `/api/game/scheduled-sell-orders?${query}`),
      readGameRouteData(context, `/api/game/season-results/me?${query}`),
      readGameRouteData(context, `/api/game/tiers/current?${query}`),
    ]);
    const durationMs = performance.now() - startedAt;

    return json(
      {
        achievementTitles,
        buyableMarketChart,
        currentSeason,
        highlights,
        leaderboard,
        market,
        notifications,
        openPositions,
        positionHistory,
        regionCode,
        scheduledSellOrders,
        seasonResults,
        tierProgress,
      },
      200,
      {
        'Cache-Control': 'private, no-store',
        'Server-Timing': `bootstrap;dur=${durationMs.toFixed(1)}`,
      },
    );
  }

  if (path === '/api/game/market' && method === 'GET') {
    const regionCode = requiredSearchParam(context.url, 'regionCode').toUpperCase();
    const auth = await getOptionalAuth(context);
    const [signals, priceAnchors] = await Promise.all([
      getSignalsForRegion(context.service, regionCode),
      loadPriceAnchors(context.service),
    ]);
    let blockedReason: string | null = null;
    const ownedVideoIds = new Set<string>();

    if (auth) {
      const game = await currentGameContext(context, regionCode, auth.profile.id);
      const openPositions = game.positions.filter((position) => position.status === 'OPEN');
      openPositions.forEach((position) => ownedVideoIds.add(position.video_id));
      const openPositionCount = ownedVideoIds.size;
      if (openPositionCount >= game.season.max_open_positions) blockedReason = 'inventory_full';
    }

    return json(
      signals.map((signal) => {
        const signalBlockedReason = ownedVideoIds.has(signal.video_id)
          ? VIDEO_ALREADY_OWNED_MESSAGE
          : blockedReason;
        return toMarketVideo(
          signal,
          signalBlockedReason === null,
          signalBlockedReason,
          priceAnchors,
        );
      }),
    );
  }

  if (path === '/api/game/account-state' && method === 'GET') {
    const startedAt = performance.now();
    const { profile } = await requireAuth(context);
    const state = await buildGameAccountState(context, profile.id, {
      includeCurrentSeason: true,
    });

    return json(state, 200, {
      'Cache-Control': 'private, no-store',
      'Server-Timing': `account-state;dur=${(performance.now() - startedAt).toFixed(1)}`,
    });
  }

  if (path === '/api/game/market/buyable-chart' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const regionCode = requiredSearchParam(context.url, 'regionCode').toUpperCase();
    const game = await currentGameContext(context, regionCode, profile.id);
    const openPositions = game.positions.filter((position) => position.status === 'OPEN');
    const ownedVideoIds = new Set(openPositions.map((position) => position.video_id));
    const buyableSignals =
      ownedVideoIds.size >= game.season.max_open_positions
        ? []
        : game.signals.filter((signal) => {
            if (ownedVideoIds.has(signal.video_id)) {
              return false;
            }

            const unitPricePoints = calculateSignalPricePoints(signal, game.priceAnchors);
            return calculatePositionPoints(unitPricePoints, GAME_QUANTITY_SCALE) <= game.wallet.balance_points;
          });
    const offset = Math.max(
      0,
      Number.parseInt(context.url.searchParams.get('pageToken') ?? '0', 10) || 0,
    );
    const items = buyableSignals.slice(offset, offset + 50).map(toTrendVideo);

    return json({
      availableCategories: [],
      categoryId: 'buyable-market',
      description: '현재 지갑과 보유 상태 기준으로 바로 매수 가능한 영상만 모았습니다.',
      items,
      label: '매수 가능',
      nextPageToken: offset + 50 < buyableSignals.length ? String(offset + 50) : null,
    });
  }

  if (path === '/api/game/seasons/current' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const regionCode = requiredSearchParam(context.url, 'regionCode').toUpperCase();
    const [game, gameSettings] = await Promise.all([
      currentGameContext(context, regionCode, profile.id),
      loadGameSettings(context.service),
    ]);
    const currentTier = resolveTier(game.totalAssetPoints, game.tiers);
    const nextTier = game.tiers.find(
      (tier) => game.totalAssetPoints < tier.minScore,
    ) ?? null;

    return json({
      endAt: game.season.end_at,
      inventorySlots: {
        baseSlots: game.season.max_open_positions,
        currentTier: tierResponse(currentTier),
        maxSlots: game.tiers.at(-1)?.inventorySlots ?? currentTier.inventorySlots,
        nextTier: nextTier ? tierResponse(nextTier) : null,
        tiers: game.tiers.map(tierResponse),
        totalSlots: currentTier.inventorySlots,
      },
      maxOpenPositions: currentTier.inventorySlots,
      minHoldSeconds: game.season.min_hold_seconds,
      notifications: [],
      rankPointMultiplier: game.season.rank_point_multiplier,
      regionCode: game.season.region_code,
      seasonId: game.season.id,
      seasonName: game.season.name,
      scheduledSellDefaultProfitRatePercent:
        gameSettings.scheduledSellDefaultProfitRatePercent,
      scheduledSellProfitRatePresets:
        gameSettings.scheduledSellProfitRatePresets,
      startAt: game.season.start_at,
      startingBalancePoints: game.season.starting_balance_points,
      status: game.season.status,
      wallet: game.walletSummary,
    });
  }

  if (path === '/api/game/wallet' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const regionCode = requiredSearchParam(context.url, 'regionCode').toUpperCase();
    const game = await currentGameContext(context, regionCode, profile.id);
    return json(game.walletSummary);
  }

  if (path === '/api/game/inventory-slots' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const regionCode = requiredSearchParam(context.url, 'regionCode').toUpperCase();
    const game = await currentGameContext(context, regionCode, profile.id);
    const progress = tierProgressResponse(game.season, game.totalAssetPoints, game.tiers);

    return json({
      baseSlots: game.season.max_open_positions,
      currentTier: progress.currentTier,
      maxSlots: game.tiers.at(-1)?.inventorySlots ?? game.season.max_open_positions,
      nextTier: progress.nextTier,
      tiers: progress.tiers,
      totalSlots: progress.currentTier.inventorySlots,
    });
  }

  if (path === '/api/game/tiers/current' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const regionCode = requiredSearchParam(context.url, 'regionCode').toUpperCase();
    const game = await currentGameContext(context, regionCode, profile.id);
    return json(tierProgressResponse(game.season, game.totalAssetPoints, game.tiers));
  }

  if (path === '/api/game/positions/me' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const season = await ensureActiveSeason(context.service);
    return json(
      await listSerializedPositions(context, {
        limit: context.url.searchParams.has('limit')
          ? parsePositiveInteger(context.url.searchParams.get('limit'))
          : undefined,
        seasonId: season.id,
        status: context.url.searchParams.get('status'),
        userId: profile.id,
      }),
    );
  }

  if (path === '/api/game/positions' && method === 'POST') {
    const { profile } = await requireAuth(context);
    const body = await readJson<BuyBody>(context.request);
    const regionCode = body.regionCode?.trim().toUpperCase();
    const categoryId = body.categoryId?.trim() || 'all';
    const videoId = body.videoId?.trim();
    const requestedQuantity = Math.floor(body.quantity ?? GAME_QUANTITY_SCALE);
    const quantity = GAME_QUANTITY_SCALE;

    if (!regionCode || !videoId) {
      throw new ApiError(400, 'validation_error', '매수 정보가 올바르지 않습니다.');
    }

    if (requestedQuantity !== GAME_QUANTITY_SCALE) {
      throw new ApiError(
        400,
        'invalid_buy_quantity',
        '같은 영상은 중복 구매할 수 없습니다.',
      );
    }

    const game = await currentGameContext(context, regionCode, profile.id);
    const alreadyOwned = game.positions.some(
      (position) =>
        position.status === 'OPEN' && position.video_id === videoId,
    );

    if (alreadyOwned) {
      throw new ApiError(409, 'video_already_owned', VIDEO_ALREADY_OWNED_MESSAGE);
    }

    const signal = game.signals.find((item) => item.video_id === videoId);

    if (!signal) {
      throw new ApiError(404, 'market_video_not_found', '현재 차트에서 영상을 찾을 수 없습니다.');
    }

    const currentPricePoints = calculateSignalPricePoints(signal, game.priceAnchors);
    const stakePoints = calculatePositionPoints(currentPricePoints, quantity);

    if (stakePoints <= 0) {
      throw new ApiError(409, 'market_price_unavailable', '현재 매수 가격을 계산할 수 없습니다.');
    }

    const { data: positionId, error } = await context.service.rpc('atlas_buy_position', {
      target_buy_captured_at: signal.captured_at,
      target_buy_rank: signal.current_rank,
      target_category_id: categoryId,
      target_channel_title: signal.channel_title,
      target_quantity: quantity,
      target_region_code: regionCode,
      target_season_id: game.season.id,
      target_stake_points: stakePoints,
      target_thumbnail_url: signal.thumbnail_url,
      target_title: signal.title,
      target_user_id: profile.id,
      target_video_id: videoId,
    });

    if (error) {
      if (error.message.includes('video_already_owned')) {
        throw new ApiError(409, 'video_already_owned', VIDEO_ALREADY_OWNED_MESSAGE);
      }
      throw error;
    }

    return json({
      positionId,
      state: await buildGameAccountState(context, profile.id),
    }, 201);
  }

  if (path === '/api/game/positions/sell-preview' && method === 'POST') {
    const { profile } = await requireAuth(context);
    return json(await previewSell(context, profile.id, await readJson<SellBody>(context.request)));
  }

  if (path === '/api/game/positions/sell' && method === 'POST') {
    const { profile } = await requireAuth(context);
    const sales = await executeSell(
      context,
      profile.id,
      await readJson<SellBody>(context.request),
    );
    return json({
      sales,
      state: await buildGameAccountState(context, profile.id),
    });
  }

  const singleSellMatch = path.match(/^\/api\/game\/positions\/(\d+)\/sell$/);
  if (singleSellMatch && method === 'POST') {
    const { profile } = await requireAuth(context);
    const positionId = Number(singleSellMatch[1]);
    const { data: position, error } = await context.service
      .from('game_positions')
      .select('*')
      .eq('id', positionId)
      .eq('user_id', profile.id)
      .single<GamePositionRow>();

    if (error) throw error;

    const responses = await executeSell(context, profile.id, {
      positionId,
      quantity: position.quantity,
    });
    return json({
      sale: responses[0],
      state: await buildGameAccountState(context, profile.id),
    });
  }

  const myHistoryMatch = path.match(/^\/api\/game\/positions\/(\d+)\/rank-history$/);
  if (myHistoryMatch && method === 'GET') {
    const { profile } = await requireAuth(context);
    const { data: position, error } = await context.service
      .from('game_positions')
      .select('*')
      .eq('id', Number(myHistoryMatch[1]))
      .eq('user_id', profile.id)
      .single<GamePositionRow>();

    if (error) throw error;
    return json(await positionHistory(context, position));
  }

  if (path === '/api/game/scheduled-sell-orders' && method === 'GET') {
    const { profile } = await requireAuth(context);
    return json(await listScheduledOrders(context, profile.id));
  }

  if (path === '/api/game/scheduled-sell-orders' && method === 'POST') {
    const { profile } = await requireAuth(context);
    const body = await readJson<ScheduledOrderBody>(context.request);
    const positionId = Math.floor(body.positionId ?? 0);
    const quantity = Math.floor(body.quantity ?? 0);
    const triggerType = body.triggerType ?? 'RANK';

    if (positionId <= 0 || quantity <= 0) {
      throw new ApiError(400, 'validation_error', '예약 매도 정보가 올바르지 않습니다.');
    }

    if (
      triggerType === 'RANK' &&
      (!body.targetRank || body.targetRank < 1 || body.targetRank > 200)
    ) {
      throw new ApiError(400, 'validation_error', '목표 순위는 1에서 200 사이여야 합니다.');
    }

    if (triggerType === 'PROFIT_RATE' && typeof body.targetProfitRatePercent !== 'number') {
      throw new ApiError(400, 'validation_error', '목표 수익률이 필요합니다.');
    }

    const { data: position, error: positionError } = await context.service
      .from('game_positions')
      .select('*')
      .eq('id', positionId)
      .eq('user_id', profile.id)
      .eq('status', 'OPEN')
      .single<GamePositionRow>();

    if (positionError) throw positionError;
    if (quantity !== position.quantity) {
      throw new ApiError(
        400,
        'partial_position_sell_disabled',
        FULL_POSITION_SELL_REQUIRED_MESSAGE,
      );
    }

    // 예약은 매수 직후에도 등록할 수 있다. 실제 체결은 settle-game과
    // atlas_sell_position이 다음 순위 갱신 전까지 계속 보류한다.

    const { data: order, error } = await context.service
      .from('game_scheduled_sell_orders')
      .insert({
        position_id: position.id,
        quantity,
        region_code: position.region_code,
        season_id: position.season_id,
        target_profit_rate_percent: body.targetProfitRatePercent ?? null,
        target_rank: body.targetRank ?? null,
        trigger_direction: body.triggerDirection ?? 'RANK_IMPROVES_TO',
        trigger_type: triggerType,
        user_id: profile.id,
      })
      .select('*')
      .single<ScheduledOrderRow>();

    if (error) throw error;

    const signal = signalMap(
      await getSignalsForRegion(context.service, position.region_code),
    ).get(position.video_id);
    return json(scheduledOrderResponse(order, position, signal), 201);
  }

  const cancelOrderMatch = path.match(/^\/api\/game\/scheduled-sell-orders\/(\d+)$/);
  if (cancelOrderMatch && method === 'DELETE') {
    const { profile } = await requireAuth(context);
    const { data: order, error: orderError } = await context.service
      .from('game_scheduled_sell_orders')
      .select('*')
      .eq('id', Number(cancelOrderMatch[1]))
      .eq('user_id', profile.id)
      .single<ScheduledOrderRow>();

    if (orderError) throw orderError;
    if (order.status !== 'PENDING') {
      throw new ApiError(409, 'order_not_pending', '이미 처리된 예약 주문입니다.');
    }

    const { data: updatedOrder, error } = await context.service
      .from('game_scheduled_sell_orders')
      .update({
        canceled_at: new Date().toISOString(),
        status: 'CANCELED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select('*')
      .single<ScheduledOrderRow>();

    if (error) throw error;

    const { data: position, error: positionError } = await context.service
      .from('game_positions')
      .select('*')
      .eq('id', order.position_id)
      .single<GamePositionRow>();

    if (positionError) throw positionError;
    return json(scheduledOrderResponse(updatedOrder, position));
  }

  if (path === '/api/game/highlights' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const season = await ensureActiveSeason(context.service);
    const { data, error } = await context.service
      .from('game_highlights')
      .select('*, game_positions(*)')
      .eq('season_id', season.id)
      .eq('user_id', profile.id)
      .order('highlight_score', { ascending: false });

    if (error) throw error;

    return json(
      (data ?? []).map((highlight) => {
        const position = highlight.game_positions as GamePositionRow;
        return {
          buyRank: position.buy_rank,
          channelTitle: position.channel_title,
          createdAt: highlight.created_at,
          currentPricePoints: null,
          description: highlight.description,
          highlightRank: highlight.highlight_rank,
          highlightScore: highlight.highlight_score,
          highlightType: highlight.highlight_type,
          id: String(highlight.id),
          positionId: position.id,
          profitPoints: highlight.profit_points,
          profitRatePercent: highlight.profit_rate_percent,
          quantity: position.quantity,
          scoreBreakdown: null,
          sellRank: position.sell_rank,
          stakePoints: position.stake_points,
          status: highlight.status,
          strategyTags: highlight.strategy_tags ?? [],
          thumbnailUrl: position.thumbnail_url ?? '',
          title: highlight.title,
          videoId: position.video_id,
          videoTitle: position.title,
        };
      }),
    );
  }

  if (path === '/api/game/notifications' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const season = await ensureActiveSeason(context.service);
    const { data, error } = await context.service
      .from('game_notifications')
      .select('*')
      .eq('user_id', profile.id)
      .eq('season_id', season.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return json(
      (data ?? []).map((notification) => ({
        channelTitle: notification.channel_title,
        createdAt: notification.created_at,
        highlightScore: notification.highlight_score,
        id: String(notification.id),
        message: notification.message,
        notificationEventType: notification.event_type,
        notificationType: notification.notification_type,
        positionId: notification.position_id,
        readAt: notification.read_at,
        showModal: notification.show_modal,
        strategyTags: notification.strategy_tags ?? [],
        thumbnailUrl: notification.thumbnail_url,
        title: notification.title,
        titleCode: notification.title_code,
        titleDisplayName: notification.title_display_name,
        titleGrade: notification.title_grade,
        videoId: notification.video_id,
        videoTitle: notification.video_title,
      })),
    );
  }

  if (path === '/api/game/notifications/read' && method === 'PATCH') {
    const { profile } = await requireAuth(context);
    const season = await ensureActiveSeason(context.service);
    const { error } = await context.service
      .from('game_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', profile.id)
      .eq('season_id', season.id)
      .is('read_at', null);

    if (error) throw error;
    return noContent();
  }

  if (path === '/api/game/notifications' && method === 'DELETE') {
    const { profile } = await requireAuth(context);
    const season = await ensureActiveSeason(context.service);
    const { error } = await context.service
      .from('game_notifications')
      .delete()
      .eq('user_id', profile.id)
      .eq('season_id', season.id);

    if (error) throw error;
    return noContent();
  }

  const notificationDeleteMatch = path.match(/^\/api\/game\/notifications\/(\d+)$/);
  if (notificationDeleteMatch && method === 'DELETE') {
    const { profile } = await requireAuth(context);
    const { error } = await context.service
      .from('game_notifications')
      .delete()
      .eq('id', Number(notificationDeleteMatch[1]))
      .eq('user_id', profile.id);

    if (error) throw error;
    return noContent();
  }

  if (path === '/api/game/achievement-titles/me' && method === 'GET') {
    const { profile } = await requireAuth(context);
    return json(await achievementTitleCollection(context, profile.id));
  }

  if (path === '/api/game/achievement-titles/me/selected' && method === 'PATCH') {
    const { profile } = await requireAuth(context);
    const body = await readJson<{ titleCode?: string | null }>(context.request);
    const titleCode = body?.titleCode?.trim() || null;

    if (titleCode) {
      const { data: earned } = await context.service
        .from('user_achievement_titles')
        .select('title_code')
        .eq('user_id', profile.id)
        .eq('title_code', titleCode)
        .maybeSingle();

      if (!earned) {
        throw new ApiError(403, 'title_not_earned', '획득하지 않은 칭호입니다.');
      }
    }

    const { error } = await context.service.from('user_achievement_title_settings').upsert(
      {
        selected_title_code: titleCode,
        updated_at: new Date().toISOString(),
        user_id: profile.id,
      },
      {
        onConflict: 'user_id',
      },
    );

    if (error) throw error;
    return json(await achievementTitleCollection(context, profile.id));
  }

  if (path === '/api/game/leaderboard' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const season = await ensureActiveSeason(context.service);
    const positionsResult = await context.service
      .from('game_positions')
      .select('*')
      .eq('season_id', season.id);

    if (positionsResult.error) throw positionsResult.error;

    const allPositions = (positionsResult.data ?? []) as GamePositionRow[];
    const [walletResult, profilesResult, highlightsResult, signals, priceAnchors, tiers] =
      await Promise.all([
        context.service.from('game_wallets').select('*').eq('season_id', season.id),
        context.service.from('profiles').select('*'),
        context.service.from('game_highlights').select('*').eq('season_id', season.id),
        getSignalsForPositions(context.service, allPositions),
        loadPriceAnchors(context.service),
        loadSeasonTiers(context.service, season.id),
      ]);

    if (walletResult.error) throw walletResult.error;
    if (profilesResult.error) throw profilesResult.error;
    if (highlightsResult.error) throw highlightsResult.error;

    const profilesById = new Map((profilesResult.data ?? []).map((item) => [item.id, item]));
    const signalsByPosition = gamePositionSignalMap(signals);
    const rows = (walletResult.data ?? []).map((wallet) => {
      const positions = allPositions.filter(
        (position) => position.user_id === wallet.user_id,
      );
      const openPositions = positions.filter((position) => position.status === 'OPEN');
      const totalStakePoints = openPositions.reduce(
        (total, position) => total + position.stake_points,
        0,
      );
      const totalEvaluationPoints = openPositions.reduce((total, position) => {
        const signal = getGamePositionSignal(signalsByPosition, position);
        const unitPrice = signal
          ? calculateSignalPricePoints(signal, priceAnchors)
          : calculateChartOutPricePoints(priceAnchors);
        return total + calculatePositionPoints(unitPrice, position.quantity);
      }, 0);
      const highlightRows = (highlightsResult.data ?? []).filter(
        (highlight) => highlight.user_id === wallet.user_id,
      );
      const highlightScore =
        highlightRows.reduce(
          (total, highlight) => total + Number(highlight.highlight_score ?? 0),
          0,
        ) + Number(wallet.manual_tier_score_adjustment ?? 0);
      const profileRow = profilesById.get(wallet.user_id);
      const totalAssetPoints =
        wallet.balance_points + wallet.reserved_points + totalEvaluationPoints;

      return {
        balancePoints: wallet.balance_points,
        currentTier: tierResponse(resolveTier(totalAssetPoints, tiers)),
        displayName: profileRow?.display_name ?? '사용자',
        highlightCount: highlightRows.length,
        highlightScore,
        me: wallet.user_id === profile.id,
        openPositionCount: openPositions.length,
        pictureUrl: profileRow?.picture_url ?? null,
        profitRatePercent:
          season.starting_balance_points > 0
            ? ((totalAssetPoints - season.starting_balance_points) * 100) /
              season.starting_balance_points
            : null,
        rank: 0,
        realizedPnlPoints: wallet.realized_pnl_points,
        reservedPoints: wallet.reserved_points,
        selectedAchievementTitle: null,
        topHighlightType: highlightRows[0]?.highlight_type ?? null,
        totalAssetPoints,
        totalEvaluationPoints,
        totalStakePoints,
        unrealizedPnlPoints: totalEvaluationPoints - totalStakePoints,
        userId: wallet.user_id,
      };
    });

    rows.sort((left, right) => right.totalAssetPoints - left.totalAssetPoints);
    return json(rows.map((row, index) => ({ ...row, rank: index + 1 })));
  }

  const leaderboardPositionsMatch = path.match(/^\/api\/game\/leaderboard\/(\d+)\/positions$/);
  if (leaderboardPositionsMatch && method === 'GET') {
    await requireAuth(context);
    const season = await ensureActiveSeason(context.service);
    return json(
      await listSerializedPositions(context, {
        seasonId: season.id,
        status: 'OPEN',
        userId: Number(leaderboardPositionsMatch[1]),
      }),
    );
  }

  const leaderboardHighlightsMatch = path.match(/^\/api\/game\/leaderboard\/(\d+)\/highlights$/);
  if (leaderboardHighlightsMatch && method === 'GET') {
    await requireAuth(context);
    const season = await ensureActiveSeason(context.service);
    const { data, error } = await context.service
      .from('game_highlights')
      .select('*, game_positions(*)')
      .eq('season_id', season.id)
      .eq('user_id', Number(leaderboardHighlightsMatch[1]))
      .order('highlight_score', { ascending: false });

    if (error) throw error;
    return json(
      (data ?? []).map((highlight) => {
        const position = highlight.game_positions as GamePositionRow;
        return {
          buyRank: position.buy_rank,
          channelTitle: position.channel_title,
          createdAt: highlight.created_at,
          currentPricePoints: null,
          description: highlight.description,
          highlightRank: highlight.highlight_rank,
          highlightScore: highlight.highlight_score,
          highlightType: highlight.highlight_type,
          id: String(highlight.id),
          positionId: position.id,
          profitPoints: highlight.profit_points,
          profitRatePercent: highlight.profit_rate_percent,
          quantity: position.quantity,
          scoreBreakdown: null,
          sellRank: position.sell_rank,
          stakePoints: position.stake_points,
          status: highlight.status,
          strategyTags: highlight.strategy_tags ?? [],
          thumbnailUrl: position.thumbnail_url ?? '',
          title: highlight.title,
          videoId: position.video_id,
          videoTitle: position.title,
        };
      }),
    );
  }

  const leaderboardHistoryMatch = path.match(
    /^\/api\/game\/leaderboard\/(\d+)\/positions\/(\d+)\/rank-history$/,
  );
  if (leaderboardHistoryMatch && method === 'GET') {
    await requireAuth(context);
    const { data: position, error } = await context.service
      .from('game_positions')
      .select('*')
      .eq('id', Number(leaderboardHistoryMatch[2]))
      .eq('user_id', Number(leaderboardHistoryMatch[1]))
      .single<GamePositionRow>();

    if (error) throw error;
    return json(await positionHistory(context, position));
  }

  if (path === '/api/game/season-results/me' && method === 'GET') {
    const { profile } = await requireAuth(context);
    const limit = context.url.searchParams.has('limit')
      ? parsePositiveInteger(context.url.searchParams.get('limit'))
      : 10;
    const { data, error } = await context.service
      .from('game_season_results')
      .select('*, game_seasons(*)')
      .eq('user_id', profile.id)
      .eq('game_seasons.region_code', 'GLOBAL')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return json(
      (data ?? []).map((result) => ({
        bestPositionBuyRank: result.summary?.bestPositionBuyRank ?? null,
        bestPositionChannelTitle: result.summary?.bestPositionChannelTitle ?? null,
        bestPositionId: result.summary?.bestPositionId ?? null,
        bestPositionProfitPoints: result.summary?.bestPositionProfitPoints ?? null,
        bestPositionProfitRatePercent: result.summary?.bestPositionProfitRatePercent ?? null,
        bestPositionRankDiff: result.summary?.bestPositionRankDiff ?? null,
        bestPositionSellRank: result.summary?.bestPositionSellRank ?? null,
        bestPositionThumbnailUrl: result.summary?.bestPositionThumbnailUrl ?? null,
        bestPositionTitle: result.summary?.bestPositionTitle ?? null,
        bestPositionVideoId: result.summary?.bestPositionVideoId ?? null,
        createdAt: result.created_at,
        finalAssetPoints: result.final_asset_points,
        finalBalancePoints: result.final_balance_points,
        finalHighlightScore: result.final_highlight_score,
        finalRank: result.final_rank,
        finalTierBadgeCode: result.final_tier_badge_code,
        finalTierCode: result.final_tier_code,
        finalTierName: result.final_tier_name,
        finalTierTitleCode: result.final_tier_title_code,
        highlights: result.summary?.highlights ?? null,
        id: result.id,
        positionCount: result.position_count,
        profitRatePercent:
          result.game_seasons?.starting_balance_points > 0
            ? ((result.final_asset_points - result.game_seasons.starting_balance_points) * 100) /
              result.game_seasons.starting_balance_points
            : null,
        realizedPnlPoints: result.realized_pnl_points,
        regionCode: 'GLOBAL',
        seasonEndAt: result.game_seasons?.end_at,
        seasonId: result.season_id,
        seasonName: result.game_seasons?.name ?? '',
        seasonStartAt: result.game_seasons?.start_at,
        startingBalancePoints: result.game_seasons?.starting_balance_points ?? 0,
        titleCode: result.title_code,
      })),
    );
  }

  return null;
}
