import {
  requireAdmin,
  type RequestContext,
} from '../../_shared/context.ts';
import {
  ApiError,
  json,
  noContent,
  parsePositiveInteger,
  readJson,
} from '../../_shared/http.ts';
import {
  ensureWallet,
  getHighlightScore,
  getPositionRows,
  type GamePositionRow,
} from './game-helpers.ts';
import {
  resolveNextTier,
  resolveTier,
} from '../../_shared/game.ts';

function toSeasonSummary(season: Record<string, unknown>) {
  return {
    createdAt: season.created_at,
    endAt: season.end_at,
    id: season.id,
    name: season.name,
    regionCode: season.region_code,
    startAt: season.start_at,
    startingBalancePoints: season.starting_balance_points,
    status: season.status,
  };
}

function toUserSummary(profile: Record<string, unknown>) {
  return {
    admin: profile.is_admin,
    createdAt: profile.created_at,
    displayName: profile.display_name,
    email: profile.email,
    id: profile.id,
    lastLoginAt: profile.last_login_at,
    pictureUrl: profile.picture_url,
  };
}

function toAdminPosition(position: GamePositionRow, seasonName: string) {
  return {
    buyCapturedAt: position.buy_captured_at,
    buyRank: position.buy_rank,
    categoryId: position.category_id,
    channelTitle: position.channel_title,
    closedAt: position.closed_at,
    createdAt: position.created_at,
    id: position.id,
    quantity: position.quantity,
    regionCode: position.region_code,
    seasonId: position.season_id,
    seasonName,
    stakePoints: position.stake_points,
    status: position.status,
    thumbnailUrl: position.thumbnail_url,
    title: position.title,
    videoId: position.video_id,
  };
}

async function buildUserDetail(context: RequestContext, userId: number) {
  const { data: profile, error: profileError } = await context.service
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) throw profileError;

  const [{ count: favoriteCount }, { data: playbackRows }, { data: seasons }] =
    await Promise.all([
      context.service
        .from('favorite_streamers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      context.service
        .from('playback_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1),
      context.service
        .from('game_seasons')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('region_code', { ascending: true }),
    ]);

  const activeSeasonGames = [];
  for (const season of seasons ?? []) {
    const wallet = await ensureWallet(context.service, season, userId);
    const positions = await getPositionRows(context.service, {
      seasonId: season.id,
      userId,
    });
    const score = await getHighlightScore(
      context.service,
      season.id,
      userId,
      wallet.manual_tier_score_adjustment,
    );
    const currentTier = resolveTier(score);
    const nextTier = resolveNextTier(score);

    activeSeasonGames.push({
      balancePoints: wallet.balance_points,
      calculatedTierScore: score - wallet.manual_tier_score_adjustment,
      closedPositionCount: positions.filter((position) => position.status === 'CLOSED').length,
      currentTier: { ...currentTier },
      manualTierScoreAdjustment: wallet.manual_tier_score_adjustment,
      nextTier: nextTier ? { ...nextTier } : null,
      openPositionCount: positions.filter((position) => position.status === 'OPEN').length,
      participating: true,
      realizedPnlPoints: wallet.realized_pnl_points,
      regionCode: season.region_code,
      reservedPoints: wallet.reserved_points,
      seasonId: season.id,
      seasonName: season.name,
      tierScore: score,
      totalAssetPoints: wallet.balance_points + wallet.reserved_points,
    });
  }

  const playback = playbackRows?.[0];

  return {
    ...toUserSummary(profile),
    activeSeasonGame: activeSeasonGames[0] ?? null,
    activeSeasonGames,
    favoriteCount: favoriteCount ?? 0,
    lastPlaybackProgress: playback
      ? {
          channelTitle: playback.channel_title,
          positionSeconds: playback.position_seconds,
          thumbnailUrl: playback.thumbnail_url,
          updatedAt: playback.updated_at,
          videoId: playback.video_id,
          videoTitle: playback.video_title,
        }
      : null,
  };
}

export async function handleAdminRoute(
  context: RequestContext,
  method: string,
  path: string,
) {
  if (!path.startsWith('/api/admin')) {
    return null;
  }

  await requireAdmin(context);

  if (path === '/api/admin/dashboard' && method === 'GET') {
    const [
      userCount,
      commentCount,
      favoriteCount,
      trendRunCount,
      tradeCount,
      seasonsResult,
      latestRunResult,
      recentUsersResult,
      recentCommentsResult,
      recentFavoritesResult,
    ] = await Promise.all([
      context.service.from('profiles').select('id', { count: 'exact', head: true }),
      context.service.from('comments').select('id', { count: 'exact', head: true }),
      context.service.from('favorite_streamers').select('id', { count: 'exact', head: true }),
      context.service.from('video_trend_runs').select('id', { count: 'exact', head: true }),
      context.service.from('game_ledger').select('id', { count: 'exact', head: true }),
      context.service
        .from('game_seasons')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('region_code', { ascending: true }),
      context.service
        .from('video_trend_runs')
        .select('*')
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      context.service
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
      context.service
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
      context.service
        .from('favorite_streamers')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const latestRun = latestRunResult.data;
    const { data: latestSnapshots, error: snapshotError } = latestRun
      ? await context.service
          .from('video_trend_snapshots')
          .select('*')
          .eq('run_id', latestRun.id)
          .order('rank', { ascending: true })
          .limit(10)
      : { data: [], error: null };

    if (snapshotError) throw snapshotError;

    const activeSeasons = (seasonsResult.data ?? []).map(toSeasonSummary);

    return json({
      activeSeason: activeSeasons[0] ?? null,
      activeSeasons,
      latestTrendRun: latestRun
        ? {
            capturedAt: latestRun.captured_at,
            categoryId: latestRun.category_id,
            categoryLabel: latestRun.category_label,
            id: latestRun.id,
            regionCode: latestRun.region_code,
            source: latestRun.source,
            topVideos: (latestSnapshots ?? []).map((snapshot) => ({
              channelTitle: snapshot.channel_title,
              rank: snapshot.rank,
              thumbnailUrl: snapshot.thumbnail_url,
              title: snapshot.title,
              videoId: snapshot.video_id,
              viewCount: snapshot.view_count,
            })),
          }
        : null,
      metrics: {
        totalComments: commentCount.count ?? 0,
        totalFavorites: favoriteCount.count ?? 0,
        totalTradeHistories: tradeCount.count ?? 0,
        totalTrendRuns: trendRunCount.count ?? 0,
        totalUsers: userCount.count ?? 0,
      },
      recentComments: (recentCommentsResult.data ?? []).map((comment) => ({
        author: comment.author,
        clientId: comment.client_id,
        content: comment.content,
        createdAt: comment.created_at,
        id: comment.id,
        videoId: comment.video_id,
      })),
      recentFavorites: (recentFavoritesResult.data ?? []).map((favorite) => ({
        channelId: favorite.channel_id,
        channelTitle: favorite.channel_title,
        createdAt: favorite.created_at,
        id: favorite.id,
        thumbnailUrl: favorite.thumbnail_url,
        userEmail: favorite.profiles?.email ?? '',
        userId: favorite.user_id,
      })),
      recentUsers: (recentUsersResult.data ?? []).map(toUserSummary),
    });
  }

  if (path === '/api/admin/trend-snapshots' && method === 'GET') {
    const startAt = context.url.searchParams.get('startAt');
    const endAt = context.url.searchParams.get('endAt');
    const regionCode = context.url.searchParams.get('regionCode')?.trim().toUpperCase();

    if (!startAt || !endAt) {
      throw new ApiError(400, 'validation_error', '조회 시작일과 종료일이 필요합니다.');
    }

    let query = context.service
      .from('video_trend_snapshots')
      .select('*, video_trend_runs!inner(*)')
      .gte('created_at', startAt)
      .lte('created_at', endAt)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (regionCode) {
      query = query.eq('region_code', regionCode);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = (data ?? []).map((snapshot) => ({
      capturedAt: snapshot.video_trend_runs.captured_at,
      categoryId: snapshot.category_id,
      categoryLabel: snapshot.video_trend_runs.category_label,
      channelTitle: snapshot.channel_title,
      id: snapshot.id,
      rank: snapshot.rank,
      regionCode: snapshot.region_code,
      runId: snapshot.run_id,
      savedAt: snapshot.created_at,
      source: snapshot.video_trend_runs.source,
      thumbnailUrl: snapshot.thumbnail_url,
      title: snapshot.title,
      videoCategoryId: snapshot.video_category_id,
      videoCategoryLabel: snapshot.video_category_label,
      videoId: snapshot.video_id,
      viewCount: snapshot.view_count,
    }));

    return json({
      count: items.length,
      endAt,
      items,
      startAt,
    });
  }

  if (path === '/api/admin/comments/purge' && method === 'POST') {
    const body = await readJson<{ deleteBefore?: string; userId?: number }>(context.request);
    if (!body.deleteBefore) {
      throw new ApiError(400, 'validation_error', '삭제 기준일이 필요합니다.');
    }

    let query = context.service.from('comments').delete({ count: 'exact' }).lt('created_at', body.deleteBefore);
    if (body.userId) query = query.eq('user_id', body.userId);
    const { count, error } = await query;
    if (error) throw error;
    return json({
      deleteBefore: body.deleteBefore,
      deletedAt: new Date().toISOString(),
      deletedCount: count ?? 0,
    });
  }

  if (path === '/api/admin/highlights/purge' && method === 'POST') {
    const body = await readJson<{ deleteBefore?: string; userId?: number }>(context.request);
    if (!body.deleteBefore) throw new ApiError(400, 'validation_error', '삭제 기준일이 필요합니다.');
    let query = context.service.from('game_highlights').delete({ count: 'exact' }).lt('created_at', body.deleteBefore);
    if (body.userId) query = query.eq('user_id', body.userId);
    const { count, error } = await query;
    if (error) throw error;
    return json({
      deleteBefore: body.deleteBefore,
      deletedAt: new Date().toISOString(),
      deletedCount: count ?? 0,
    });
  }

  if (path === '/api/admin/trade-history/purge' && method === 'POST') {
    const body = await readJson<{ deleteBefore?: string; userId?: number }>(context.request);
    if (!body.deleteBefore) throw new ApiError(400, 'validation_error', '삭제 기준일이 필요합니다.');

    let positionsQuery = context.service
      .from('game_positions')
      .delete({ count: 'exact' })
      .eq('status', 'CLOSED')
      .lt('closed_at', body.deleteBefore);
    if (body.userId) positionsQuery = positionsQuery.eq('user_id', body.userId);
    const positionsResult = await positionsQuery;
    if (positionsResult.error) throw positionsResult.error;

    return json({
      deleteBefore: body.deleteBefore,
      deletedAt: new Date().toISOString(),
      deletedDividendPayoutCount: 0,
      deletedLedgerCount: 0,
      deletedPositionCount: positionsResult.count ?? 0,
      deletedScheduledSellOrderCount: 0,
    });
  }

  const seasonMatch = path.match(/^\/api\/admin\/seasons\/(\d+)$/);
  if (seasonMatch && method === 'PATCH') {
    const body = await readJson<{ endAt?: string; startAt?: string }>(context.request);
    const { data, error } = await context.service
      .from('game_seasons')
      .update({
        ...(body.endAt ? { end_at: body.endAt } : {}),
        ...(body.startAt ? { start_at: body.startAt } : {}),
      })
      .eq('id', Number(seasonMatch[1]))
      .select('*')
      .single();
    if (error) throw error;
    return json(toSeasonSummary(data));
  }

  const startingBalanceMatch = path.match(
    /^\/api\/admin\/seasons\/(\d+)\/starting-balance$/,
  );
  if (startingBalanceMatch && method === 'PATCH') {
    const body = await readJson<{ startingBalancePoints?: number }>(context.request);
    const points = Math.floor(body.startingBalancePoints ?? -1);
    if (points < 0) throw new ApiError(400, 'validation_error', '시작 자산이 올바르지 않습니다.');
    const { data, error } = await context.service
      .from('game_seasons')
      .update({ starting_balance_points: points })
      .eq('id', Number(startingBalanceMatch[1]))
      .select('*')
      .single();
    if (error) throw error;
    return json(toSeasonSummary(data));
  }

  const closeSeasonMatch = path.match(/^\/api\/admin\/seasons\/(\d+)\/close$/);
  if (closeSeasonMatch && method === 'POST') {
    const { error } = await context.service
      .from('game_seasons')
      .update({
        end_at: new Date().toISOString(),
        status: 'CLOSED',
      })
      .eq('id', Number(closeSeasonMatch[1]));
    if (error) throw error;
    return noContent();
  }

  if (path === '/api/admin/users' && method === 'GET') {
    const limit = context.url.searchParams.has('limit')
      ? Math.min(100, parsePositiveInteger(context.url.searchParams.get('limit')))
      : 40;
    const queryText = context.url.searchParams.get('q')?.trim();
    let query = context.service
      .from('profiles')
      .select('*')
      .order('last_login_at', { ascending: false })
      .limit(limit);
    if (queryText) {
      query = query.or(`email.ilike.%${queryText}%,display_name.ilike.%${queryText}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return json({
      count: data?.length ?? 0,
      limit,
      query: queryText ?? null,
      users: (data ?? []).map(toUserSummary),
    });
  }

  const userHighlightsMatch = path.match(/^\/api\/admin\/users\/(\d+)\/highlights$/);
  if (userHighlightsMatch && method === 'GET') {
    const userId = Number(userHighlightsMatch[1]);
    const seasonId = parsePositiveInteger(context.url.searchParams.get('seasonId'));
    const { data: season, error: seasonError } = await context.service
      .from('game_seasons')
      .select('*')
      .eq('id', seasonId)
      .single();
    if (seasonError) throw seasonError;
    const { data: wallet } = await context.service
      .from('game_wallets')
      .select('*')
      .eq('season_id', seasonId)
      .eq('user_id', userId)
      .maybeSingle();
    const { data: highlights, error } = await context.service
      .from('game_highlights')
      .select('*, game_positions(*)')
      .eq('season_id', seasonId)
      .eq('user_id', userId)
      .order('highlight_score', { ascending: false });
    if (error) throw error;
    const calculatedHighlightScore = (highlights ?? []).reduce(
      (total, highlight) => total + Number(highlight.highlight_score ?? 0),
      0,
    );
    return json({
      calculatedHighlightScore,
      highlightCount: highlights?.length ?? 0,
      highlights: (highlights ?? []).map((highlight) => {
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
      manualTierScoreAdjustment: wallet?.manual_tier_score_adjustment ?? 0,
      regionCode: season.region_code,
      seasonId,
      seasonName: season.name,
      tierScore: calculatedHighlightScore + (wallet?.manual_tier_score_adjustment ?? 0),
      userId,
    });
  }

  const userPositionsMatch = path.match(/^\/api\/admin\/users\/(\d+)\/positions$/);
  if (userPositionsMatch && method === 'GET') {
    const userId = Number(userPositionsMatch[1]);
    const seasonId = parsePositiveInteger(context.url.searchParams.get('seasonId'));
    const { data: season, error: seasonError } = await context.service
      .from('game_seasons')
      .select('name')
      .eq('id', seasonId)
      .single();
    if (seasonError) throw seasonError;
    const positions = await getPositionRows(context.service, {
      seasonId,
      status: 'OPEN',
      userId,
    });
    return json(positions.map((position) => toAdminPosition(position, season.name)));
  }

  const walletMatch = path.match(/^\/api\/admin\/users\/(\d+)\/wallet$/);
  if (walletMatch && method === 'PATCH') {
    const userId = Number(walletMatch[1]);
    const body = await readJson<{
      balancePoints?: number;
      manualTierScoreAdjustment?: number;
      realizedPnlPoints?: number;
      reservedPoints?: number;
      seasonId?: number;
    }>(context.request);
    if (!body.seasonId) throw new ApiError(400, 'validation_error', 'seasonId가 필요합니다.');
    const { error } = await context.service
      .from('game_wallets')
      .update({
        balance_points: Math.floor(body.balancePoints ?? 0),
        manual_tier_score_adjustment: Math.floor(body.manualTierScoreAdjustment ?? 0),
        realized_pnl_points: Math.floor(body.realizedPnlPoints ?? 0),
        reserved_points: Math.floor(body.reservedPoints ?? 0),
        updated_at: new Date().toISOString(),
      })
      .eq('season_id', body.seasonId)
      .eq('user_id', userId);
    if (error) throw error;
    return json(await buildUserDetail(context, userId));
  }

  const positionUpdateMatch = path.match(
    /^\/api\/admin\/users\/(\d+)\/positions\/(\d+)$/,
  );
  if (positionUpdateMatch && method === 'PATCH') {
    const userId = Number(positionUpdateMatch[1]);
    const positionId = Number(positionUpdateMatch[2]);
    const body = await readJson<{
      createdAt?: string;
      quantity?: number;
      stakePoints?: number;
    }>(context.request);
    const { data, error } = await context.service
      .from('game_positions')
      .update({
        ...(body.createdAt ? { created_at: body.createdAt } : {}),
        quantity: Math.floor(body.quantity ?? 0),
        stake_points: Math.floor(body.stakePoints ?? 0),
      })
      .eq('id', positionId)
      .eq('user_id', userId)
      .select('*, game_seasons(name)')
      .single();
    if (error) throw error;
    return json(toAdminPosition(data as GamePositionRow, data.game_seasons?.name ?? ''));
  }

  const userMatch = path.match(/^\/api\/admin\/users\/(\d+)$/);
  if (userMatch && method === 'GET') {
    return json(await buildUserDetail(context, Number(userMatch[1])));
  }

  if (userMatch && method === 'DELETE') {
    const userId = Number(userMatch[1]);
    const { data: profile, error: profileError } = await context.service
      .from('profiles')
      .select('auth_user_id')
      .eq('id', userId)
      .single();
    if (profileError) throw profileError;
    const { error } = await context.service.auth.admin.deleteUser(profile.auth_user_id);
    if (error) throw error;
    return noContent();
  }

  throw new ApiError(404, 'not_found', '관리자 API를 찾을 수 없습니다.');
}
