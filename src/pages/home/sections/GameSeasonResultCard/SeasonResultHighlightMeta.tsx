import type { GameSeasonResultHighlightItem as Item } from '../../../../features/game/types';
import { formatRank } from '../../gameHelpers';
import SeasonResultHighlightProfitMeta from './SeasonResultHighlightProfitMeta';
import { formatHighlightMove, formatHighlightScore } from './seasonResultHighlightFormat';

export default function SeasonResultHighlightMeta({ item }: { item: Item }) {
  return (
    <p className="game-season-result-highlight-card__meta">
      <span>티어 점수</span> {formatHighlightScore(item.highlightScore)}
      {' · '}
      <span>순위</span> {formatRank(item.buyRank)}{' -> '}
      {formatRank(item.sellRank, { unavailableAsChartOut: true })}
      {' · '}
      <span>상승</span> {formatHighlightMove(item)}
      {' · '}
      <SeasonResultHighlightProfitMeta item={item} />
    </p>
  );
}
