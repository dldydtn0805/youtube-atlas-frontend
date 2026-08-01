import type { TrendSignalRow } from '../../_shared/game.ts';

export function filterFavoriteTopSignals(
  signals: TrendSignalRow[],
  favoriteChannelIds: ReadonlySet<string>,
) {
  return signals.filter(
    (signal) => Boolean(signal.channel_id) && favoriteChannelIds.has(signal.channel_id as string),
  );
}
