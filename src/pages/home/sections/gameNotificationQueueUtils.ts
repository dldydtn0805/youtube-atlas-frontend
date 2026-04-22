import type { GameNotification } from '../../../features/game/types';

export function enqueueGameNotification(
  queue: GameNotification[],
  notification: GameNotification,
) {
  if (queue.some((queuedNotification) => queuedNotification.id === notification.id)) {
    return queue;
  }

  return [...queue, notification];
}

export function removeGameNotification(
  queue: GameNotification[],
  notificationId: string,
) {
  return queue.filter((notification) => notification.id !== notificationId);
}
