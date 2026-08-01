import type { TrendSignalRow } from '../../_shared/game.ts';

interface RegionVideoIdentity {
  region_code: string;
  video_id: string;
}

export function gamePositionSignalKey(regionCode: string, videoId: string) {
  return `${regionCode.toUpperCase()}:${videoId}`;
}

export function gamePositionSignalMap(signals: ReadonlyArray<TrendSignalRow>) {
  return new Map(signals.map((signal) => [gamePositionSignalKey(signal.region_code, signal.video_id), signal]));
}

export function getGamePositionSignal(
  signalsByPosition: ReadonlyMap<string, TrendSignalRow>,
  position: RegionVideoIdentity,
) {
  return signalsByPosition.get(gamePositionSignalKey(position.region_code, position.video_id));
}

export function getGamePositionRegionCodes(positions: ReadonlyArray<Pick<RegionVideoIdentity, 'region_code'>>) {
  return [...new Set(positions.map((position) => position.region_code.toUpperCase()))];
}
