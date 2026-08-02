import type { GameRealtimeEvent } from '../game/types';

const SUPPORTED_MAIN_CATEGORY_IDS = new Set(['0', 'all']);

export function createGameMarketSyncEvent(
  payload: Record<string, unknown>,
): GameRealtimeEvent | null {
  const capturedAt =
    typeof payload.captured_at === 'string' ? payload.captured_at : null;
  const categoryId =
    typeof payload.category_id === 'string' ? payload.category_id : null;
  const completedAt =
    typeof payload.completed_at === 'string' ? payload.completed_at : null;
  const regionCode =
    typeof payload.region_code === 'string'
      ? payload.region_code.toUpperCase()
      : null;

  if (
    !capturedAt ||
    !categoryId ||
    !completedAt ||
    !regionCode ||
    !SUPPORTED_MAIN_CATEGORY_IDS.has(categoryId)
  ) {
    return null;
  }

  return {
    capturedAt,
    eventType: 'market-updated',
    occurredAt: completedAt,
    regionCode,
    seasonId: null,
  };
}
