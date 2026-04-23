import type { SelectedAchievementTitle } from '../../../features/game/types';
import './AchievementTitleBadge.css';

interface AchievementTitleBadgeProps {
  compact?: boolean;
  title: SelectedAchievementTitle;
}

const gradeLabels: Record<SelectedAchievementTitle['grade'], string> = {
  NORMAL: '노말',
  RARE: '레어',
  SUPER: '슈퍼',
  ULTIMATE: '얼티밋',
};

export default function AchievementTitleBadge({ compact = false, title }: AchievementTitleBadgeProps) {
  const label = compact ? title.shortName : title.displayName;

  return (
    <span
      className="app-shell__achievement-title-badge"
      data-grade={title.grade}
      title={`${gradeLabels[title.grade]} ${title.displayName}: ${title.description}`}
    >
      <span className="app-shell__achievement-title-badge-name">{label}</span>
    </span>
  );
}
