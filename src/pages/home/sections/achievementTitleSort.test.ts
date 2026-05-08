import { describe, expect, it } from 'vitest';
import type { AchievementTitle } from '../../../features/game/types';
import { sortAchievementTitlesByGrade } from './achievementTitleSort';

function title(code: string, grade: AchievementTitle['grade']): AchievementTitle {
  return {
    code,
    displayName: code,
    shortName: code,
    grade,
    description: code,
    earned: false,
    selected: false,
    earnedAt: null,
  };
}

describe('sortAchievementTitlesByGrade', () => {
  it('sorts titles by rarity while keeping server order inside the same grade', () => {
    const titles = [
      title('NORMAL_1', 'NORMAL'),
      title('RARE_1', 'RARE'),
      title('ULTIMATE_1', 'ULTIMATE'),
      title('SUPER_1', 'SUPER'),
      title('ULTIMATE_2', 'ULTIMATE'),
      title('RARE_2', 'RARE'),
    ];

    expect(sortAchievementTitlesByGrade(titles).map((item) => item.code)).toEqual([
      'ULTIMATE_1',
      'ULTIMATE_2',
      'SUPER_1',
      'RARE_1',
      'RARE_2',
      'NORMAL_1',
    ]);
  });
});
