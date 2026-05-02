import type { GameNotification } from '../../features/game/types';
import type { OpenGameHolding } from './gameHelpers';

type GameNotificationSellTargetResult =
  | { status: 'ready'; holding: OpenGameHolding }
  | { status: 'noSellableQuantity' }
  | { status: 'notFound' };

export function getGameNotificationSellTargetHolding(
  notification: GameNotification,
  holdings: OpenGameHolding[],
): GameNotificationSellTargetResult {
  const positionHolding =
    notification.positionId != null
      ? holdings.find((holding) => holding.positionId === notification.positionId)
      : undefined;

  if (positionHolding) {
    return positionHolding.sellableQuantity > 0
      ? { status: 'ready', holding: positionHolding }
      : { status: 'noSellableQuantity' };
  }

  const videoHoldings =
    notification.videoId != null
      ? holdings.filter((holding) => holding.videoId === notification.videoId)
      : [];
  const sellableVideoHolding = videoHoldings.find((holding) => holding.sellableQuantity > 0);

  if (sellableVideoHolding) {
    return { status: 'ready', holding: sellableVideoHolding };
  }

  return videoHoldings.length > 0
    ? { status: 'noSellableQuantity' }
    : { status: 'notFound' };
}
