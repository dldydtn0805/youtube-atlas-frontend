import type { AchievementTitle } from '../../../features/game/types';

const gradePriority: Record<AchievementTitle['grade'], number> = {
  ULTIMATE: 4,
  SUPER: 3,
  RARE: 2,
  NORMAL: 1,
};

export function sortAchievementTitlesByGrade(titles: readonly AchievementTitle[]) {
  return titles
    .map((title, index) => ({ index, title }))
    .sort((left, right) => {
      const gradeDiff = gradePriority[right.title.grade] - gradePriority[left.title.grade];
      return gradeDiff !== 0 ? gradeDiff : left.index - right.index;
    })
    .map(({ title }) => title);
}
