import type { GameHighlight } from '../../../features/game/types';

export type GameHighlightSortMode = 'latest' | 'tierScore';

const getHighlightTime = (highlight: GameHighlight) => {
  const timestamp = new Date(highlight.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const compareLatest = (left: GameHighlight, right: GameHighlight) =>
  getHighlightTime(right) - getHighlightTime(left);
const compareTierScore = (left: GameHighlight, right: GameHighlight) =>
  right.highlightScore - left.highlightScore;

export function sortGameHighlights(
  highlights: ReadonlyArray<GameHighlight>,
  sortMode: GameHighlightSortMode,
) {
  return highlights.slice().sort((left, right) => {
    if (sortMode === 'tierScore') {
      return compareTierScore(left, right) || compareLatest(left, right);
    }

    return compareLatest(left, right) || compareTierScore(left, right);
  });
}
