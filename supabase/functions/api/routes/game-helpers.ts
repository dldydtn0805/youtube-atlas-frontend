import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';
import {
  calculateChartOutPricePoints,
  calculatePositionPoints,
  calculateSignalPricePoints,
  resolveNextTier,
  resolveStrategyTags,
  resolveTier,
  TIER_DEFINITIONS,
  type GameTierDefinition,
  type PriceAnchor,
  type TrendSignalRow,
} from '../../_shared/game.ts';
import { getCalendarGameSeason } from './calendar-season.ts';
import { getGamePositionRegionCodes } from './game-position-signals.ts';

export const GAME_SCOPE_REGION_CODE = 'GLOBAL';

export interface GameSeasonRow {
  created_at: string;
  end_at: string;
  id: number;
  max_open_positions: number;
  min_hold_seconds: number;
  name: string;
  rank_point_multiplier: number;
  region_code: string;
  start_at: string;
  starting_balance_points: number;
  status: string;
}

export interface GameWalletRow {
  balance_points: number;
  id: number;
  manual_tier_score_adjustment: number;
  realized_pnl_points: number;
  reserved_points: number;
  season_id: number;
  updated_at: string;
  user_id: number;
}

export interface GamePositionRow {
  buy_captured_at: string;
  buy_rank: number;
  category_id: string;
  channel_title: string;
  closed_at: string | null;
  created_at: string;
  id: number;
  quantity: number;
  region_code: string;
  season_id: number;
  sell_rank: number | null;
  stake_points: number;
  status: string;
  thumbnail_url: string | null;
  title: string;
  user_id: number;
  video_id: string;
}

export interface ScheduledOrderRow {
  canceled_at: string | null;
  created_at: string;
  executed_at: string | null;
  failure_reason: string | null;
  id: number;
  pnl_points: number | null;
  position_id: number;
  quantity: number;
  region_code: string;
  season_id: number;
  sell_price_points: number | null;
  settled_points: number | null;
  status: string;
  target_profit_rate_percent: number | null;
  target_rank: number | null;
  trigger_direction: string;
  trigger_type: string;
  triggered_at: string | null;
  updated_at: string;
  user_id: number;
}

const activeSeasonPromises = new WeakMap<
  SupabaseClient,
  Promise<GameSeasonRow>
>();

async function resolveActiveSeason(service: SupabaseClient) {
  const { data: existingSeason, error: existingError } = await service
    .from('game_seasons')
    .select('*')
    .eq('region_code', GAME_SCOPE_REGION_CODE)
    .eq('status', 'ACTIVE')
    .maybeSingle<GameSeasonRow>();

  if (existingError) throw existingError;
  if (existingSeason) {
    return existingSeason;
  }

  const calendarSeason = getCalendarGameSeason();
  const { data: createdSeason, error: createError } = await service
    .from('game_seasons')
    .insert({
      end_at: calendarSeason.endAt,
      name: calendarSeason.name,
      region_code: GAME_SCOPE_REGION_CODE,
      start_at: calendarSeason.startAt,
    })
    .select('*')
    .single<GameSeasonRow>();

  if (createError) {
    const { data: racedSeason, error: racedError } = await service
      .from('game_seasons')
      .select('*')
      .eq('region_code', GAME_SCOPE_REGION_CODE)
      .eq('status', 'ACTIVE')
      .single<GameSeasonRow>();

    if (racedError) throw createError;
    await service.rpc('seed_game_tiers', { target_season_id: racedSeason.id });
    return racedSeason;
  }

  await service.rpc('seed_game_tiers', { target_season_id: createdSeason.id });
  return createdSeason;
}

export function ensureActiveSeason(service: SupabaseClient) {
  const cached = activeSeasonPromises.get(service);

  if (cached) {
    return cached;
  }

  const pending = resolveActiveSeason(service);
  activeSeasonPromises.set(service, pending);
  void pending.catch(() => {
    if (activeSeasonPromises.get(service) === pending) {
      activeSeasonPromises.delete(service);
    }
  });

  return pending;
}

export async function ensureWallet(service: SupabaseClient, season: GameSeasonRow, userId: number) {
  await service.from('game_wallets').upsert(
    {
      balance_points: season.starting_balance_points,
      season_id: season.id,
      user_id: userId,
    },
    {
      ignoreDuplicates: true,
      onConflict: 'season_id,user_id',
    },
  );

  const { data, error } = await service
    .from('game_wallets')
    .select('*')
    .eq('season_id', season.id)
    .eq('user_id', userId)
    .single<GameWalletRow>();

  if (error) throw error;
  return data;
}

export async function getSignalsForRegion(service: SupabaseClient, regionCode: string) {
  const { data, error } = await service
    .from('video_trend_signals')
    .select('*')
    .eq('region_code', regionCode.toUpperCase())
    .in('category_id', ['all', '0'])
    .order('current_rank', { ascending: true })
    .limit(250);

  if (error) throw error;

  if ((data ?? []).length > 0) {
    return (data ?? []) as TrendSignalRow[];
  }

  const { data: fallback, error: fallbackError } = await service
    .from('video_trend_signals')
    .select('*')
    .eq('region_code', regionCode.toUpperCase())
    .order('current_rank', { ascending: true })
    .limit(250);

  if (fallbackError) throw fallbackError;
  return (fallback ?? []) as TrendSignalRow[];
}

export async function getSignalsForPositions(
  service: SupabaseClient,
  positions: ReadonlyArray<GamePositionRow>,
) {
  const signalGroups = await Promise.all(
    getGamePositionRegionCodes(positions).map((regionCode) =>
      getSignalsForRegion(service, regionCode),
    ),
  );

  return signalGroups.flat();
}

export function signalMap(signals: TrendSignalRow[]) {
  return new Map(signals.map((signal) => [signal.video_id, signal]));
}

export function isPositionSellLockedUntilNextSync(
  position: GamePositionRow,
  signal: TrendSignalRow | undefined,
) {
  if (!signal) {
    return false;
  }

  return new Date(signal.captured_at).getTime() <= new Date(position.buy_captured_at).getTime();
}

export function tierResponse(tier: GameTierDefinition) {
  return { ...tier };
}

export async function getHighlightScore(
  service: SupabaseClient,
  seasonId: number,
  userId: number,
  manualAdjustment = 0,
) {
  const { data, error } = await service
    .from('game_highlights')
    .select('highlight_score')
    .eq('season_id', seasonId)
    .eq('user_id', userId);

  if (error) throw error;

  return (
    (data ?? []).reduce((total, highlight) => total + Number(highlight.highlight_score ?? 0), 0) +
    manualAdjustment
  );
}

export async function getPositionRows(
  service: SupabaseClient,
  options: {
    limit?: number;
    seasonId: number;
    status?: string | null;
    userId: number;
  },
) {
  let query = service
    .from('game_positions')
    .select('*')
    .eq('season_id', options.seasonId)
    .eq('user_id', options.userId)
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status.toUpperCase());
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as GamePositionRow[];
}

export async function getPendingOrders(service: SupabaseClient, seasonId: number, userId: number) {
  const { data, error } = await service
    .from('game_scheduled_sell_orders')
    .select('*')
    .eq('season_id', seasonId)
    .eq('user_id', userId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ScheduledOrderRow[];
}

export function serializePosition(
  position: GamePositionRow,
  signal: TrendSignalRow | undefined,
  order?: ScheduledOrderRow,
  priceAnchors?: ReadonlyArray<PriceAnchor>,
) {
  const currentRank = signal?.current_rank ?? null;
  const chartOut = currentRank === null;
  const unitPricePoints = signal
    ? calculateSignalPricePoints(signal, priceAnchors)
    : calculateChartOutPricePoints(priceAnchors);
  const currentPricePoints = calculatePositionPoints(unitPricePoints, position.quantity);
  const profitPoints = currentPricePoints - position.stake_points;
  const profitRatePercent =
    position.stake_points > 0 ? (profitPoints * 100) / position.stake_points : null;
  const strategyTags = resolveStrategyTags(position.buy_rank, currentRank, profitRatePercent);

  return {
    achievedStrategyTags: strategyTags,
    buyCapturedAt: position.buy_captured_at,
    buyRank: position.buy_rank,
    channelTitle: position.channel_title,
    chartOut,
    closedAt: position.closed_at,
    createdAt: position.created_at,
    currentPricePoints,
    currentRank,
    id: position.id,
    profitPoints,
    projectedHighlightScore: Math.max(0, (position.buy_rank - (currentRank ?? 200)) * 100),
    quantity: position.quantity,
    regionCode: position.region_code,
    rankDiff: currentRank === null ? null : position.buy_rank - currentRank,
    reservedForSell: Boolean(order),
    scheduledSellOrderId: order?.id ?? null,
    scheduledSellQuantity: order?.quantity ?? null,
    scheduledSellTargetProfitRatePercent: order?.target_profit_rate_percent ?? null,
    scheduledSellTargetRank: order?.target_rank ?? null,
    scheduledSellTriggerDirection: order?.trigger_direction ?? null,
    scheduledSellTriggerType: order?.trigger_type ?? null,
    sellLockedUntilNextSync: isPositionSellLockedUntilNextSync(position, signal),
    stakePoints: position.stake_points,
    status: position.status,
    strategyTags,
    targetStrategyTags: [],
    thumbnailUrl: position.thumbnail_url ?? '',
    title: position.title,
    videoId: position.video_id,
  };
}

export function walletResponse(
  wallet: GameWalletRow,
  positions: GamePositionRow[],
  getSignal: (position: GamePositionRow) => TrendSignalRow | undefined,
  priceAnchors?: ReadonlyArray<PriceAnchor>,
) {
  const totalEvaluationPoints = positions
    .filter((position) => position.status === 'OPEN')
    .reduce((total, position) => {
      const signal = getSignal(position);
      const unitPricePoints = signal
        ? calculateSignalPricePoints(signal, priceAnchors)
        : calculateChartOutPricePoints(priceAnchors);
      return total + calculatePositionPoints(unitPricePoints, position.quantity);
    }, 0);

  return {
    balancePoints: wallet.balance_points,
    realizedPnlPoints: wallet.realized_pnl_points,
    reservedPoints: wallet.reserved_points,
    seasonId: wallet.season_id,
    totalAssetPoints: wallet.balance_points + wallet.reserved_points + totalEvaluationPoints,
  };
}

export function tierProgressResponse(
  season: GameSeasonRow,
  totalAssetPoints: number,
  tiers: ReadonlyArray<GameTierDefinition> = TIER_DEFINITIONS,
) {
  const currentTier = resolveTier(totalAssetPoints, tiers);
  const nextTier = resolveNextTier(totalAssetPoints, tiers);

  return {
    currentTier: tierResponse(currentTier),
    highlightScore: totalAssetPoints,
    nextTier: nextTier ? tierResponse(nextTier) : null,
    regionCode: season.region_code,
    seasonId: season.id,
    seasonName: season.name,
    tierBasis: 'TOTAL_ASSET_POINTS',
    tiers: tiers.map(tierResponse),
    totalAssetPoints,
  };
}
