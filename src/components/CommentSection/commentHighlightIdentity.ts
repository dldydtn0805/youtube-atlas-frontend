import type { CommentHighlightMessage } from '../../features/comments/highlightTypes';
import type { SelectedAchievementTitle } from '../../features/game/types';

const TIER_CODES = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'LEGEND'] as const;

function hashText(value: string) {
  return [...value].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function pick<T>(items: readonly T[], seed: number, offset = 0) {
  return items[(seed + offset) % items.length] ?? items[0];
}

export function getCommentHighlightIdentity(
  highlight: CommentHighlightMessage,
  titles: readonly SelectedAchievementTitle[] = [],
) {
  const seed = hashText(`${highlight.id}:${highlight.content}:${highlight.created_at}`);
  const payloadTitle = highlight.selectedAchievementTitle ?? highlight.selected_achievement_title;

  return {
    tierCode: pick(TIER_CODES, seed),
    title: payloadTitle ?? (titles.length > 0 ? pick(titles, seed, 5) : null),
  };
}
