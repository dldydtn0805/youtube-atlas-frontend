import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';
import { requireCronSecret } from '../_shared/cron.ts';
import {
  calculateChartOutPricePoints,
  calculateSignalPricePoints,
  type TrendSignalRow,
} from '../_shared/game.ts';
import { loadPriceAnchors } from '../_shared/price-anchors.ts';
import { corsHeaders, errorResponse, json } from '../_shared/http.ts';

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  try {
    requireCronSecret(request);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase function secrets are missing.');
    }

    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { data: orders, error: ordersError } = await service
      .from('game_scheduled_sell_orders')
      .select('*, game_positions(*)')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(100);

    if (ordersError) throw ordersError;
    const priceAnchors = await loadPriceAnchors(service);

    let executedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const order of orders ?? []) {
      const position = order.game_positions;

      if (!position || position.status !== 'OPEN') {
        await service
          .from('game_scheduled_sell_orders')
          .update({
            failure_reason: 'position_not_open',
            status: 'FAILED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
        failedCount += 1;
        continue;
      }

      const { data: signal, error: signalError } = await service
        .from('video_trend_signals')
        .select('*')
        .eq('region_code', order.region_code)
        .eq('video_id', position.video_id)
        .in('category_id', ['all', '0'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle<TrendSignalRow>();

      if (signalError) throw signalError;

      if (
        signal &&
        new Date(signal.captured_at).getTime() <= new Date(position.buy_captured_at).getTime()
      ) {
        skippedCount += 1;
        continue;
      }

      const currentRank = signal?.current_rank ?? 200;
      const unitPricePoints = signal
        ? calculateSignalPricePoints(signal, priceAnchors)
        : calculateChartOutPricePoints(priceAnchors);
      const currentPositionPoints = Math.round((unitPricePoints * order.quantity) / 100);
      const orderStakePoints = Math.round(
        (position.stake_points * order.quantity) / position.quantity,
      );
      const profitRatePercent =
        orderStakePoints > 0
          ? ((currentPositionPoints - orderStakePoints) * 100) / orderStakePoints
          : null;
      const rankTriggered =
        order.trigger_type === 'RANK' &&
        order.target_rank !== null &&
        (order.trigger_direction === 'RANK_DROPS_TO'
          ? currentRank >= order.target_rank
          : currentRank <= order.target_rank);
      const profitTriggered =
        order.trigger_type === 'PROFIT_RATE' &&
        order.target_profit_rate_percent !== null &&
        profitRatePercent !== null &&
        profitRatePercent >= order.target_profit_rate_percent;

      if (!rankTriggered && !profitTriggered) {
        skippedCount += 1;
        continue;
      }

      const triggeredAt = new Date().toISOString();
      const { data: sellResult, error: sellError } = await service.rpc('atlas_sell_position', {
        target_position_id: position.id,
        target_quantity: order.quantity,
        target_sell_rank: currentRank,
        target_unit_price_points: unitPricePoints,
        target_user_id: order.user_id,
      });

      if (sellError) {
        if (sellError.message.includes('next_trend_sync_required')) {
          skippedCount += 1;
          continue;
        }

        await service
          .from('game_scheduled_sell_orders')
          .update({
            failure_reason: sellError.message,
            status: 'FAILED',
            triggered_at: triggeredAt,
            updated_at: triggeredAt,
          })
          .eq('id', order.id);
        failedCount += 1;
        continue;
      }

      await service
        .from('game_scheduled_sell_orders')
        .update({
          executed_at: triggeredAt,
          pnl_points: sellResult.pnlPoints,
          sell_price_points: sellResult.sellPricePoints,
          settled_points: sellResult.settledPoints,
          status: 'EXECUTED',
          triggered_at: triggeredAt,
          updated_at: triggeredAt,
        })
        .eq('id', order.id);
      await service.from('game_notifications').insert({
        event_type: 'SCHEDULED_SELL_EXECUTED',
        message: `${position.title} 예약 매도가 실행되었습니다.`,
        notification_type: 'SMALL_CASHOUT',
        position_id: position.id,
        region_code: order.region_code,
        season_id: order.season_id,
        show_modal: true,
        title: '예약 매도 체결',
        user_id: order.user_id,
        video_id: position.video_id,
        video_title: position.title,
      });
      executedCount += 1;
    }

    return json({
      executedCount,
      failedCount,
      processedCount: orders?.length ?? 0,
      skippedCount,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
