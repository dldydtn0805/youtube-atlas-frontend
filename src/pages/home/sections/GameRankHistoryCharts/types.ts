import type { GamePositionRankHistoryPoint } from '../../../../features/game/types';
import type { VideoRankHistory } from '../../../../features/trending/types';

export type RankHistoryPoint = GamePositionRankHistoryPoint | VideoRankHistory['points'][number];
export type RankLineType = 'active' | 'faded';

export interface ChartPoint {
  chartOut: boolean;
  eventLabel: string | null;
  isFaded: boolean;
  rank: number | null;
  timestamp: string;
  viewDelta: number | null;
}

export interface GameRankHistoryChartsProps {
  focusMode?: 'full' | 'trade';
  points: RankHistoryPoint[];
}
