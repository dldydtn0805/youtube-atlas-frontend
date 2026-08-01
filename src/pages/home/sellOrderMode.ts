import { normalizeGameOrderCapacity } from './gameHelpers';

export type SellOrderMode = 'instant' | 'scheduled';

export function getDefaultSellOrderMode(
  maxInstantSellQuantity: number,
  maxScheduledSellQuantity: number,
): SellOrderMode {
  return normalizeGameOrderCapacity(maxInstantSellQuantity) > 0 ||
    normalizeGameOrderCapacity(maxScheduledSellQuantity) <= 0
    ? 'instant'
    : 'scheduled';
}

export function getSellOrderCapacity(
  mode: SellOrderMode,
  maxInstantSellQuantity: number,
  maxScheduledSellQuantity: number,
) {
  return normalizeGameOrderCapacity(
    mode === 'scheduled' ? maxScheduledSellQuantity : maxInstantSellQuantity,
  );
}
