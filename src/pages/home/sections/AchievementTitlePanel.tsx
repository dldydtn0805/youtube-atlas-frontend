import type { AchievementTitleCollection } from '../../../features/game/types';
import AchievementTitleBadge from './AchievementTitleBadge';
import './AchievementTitlePanel.css';

interface AchievementTitlePanelProps {
  collection?: AchievementTitleCollection;
  isSaving?: boolean;
  onSelectTitle: (titleCode: string | null) => void;
}

export default function AchievementTitlePanel({ collection, isSaving = false, onSelectTitle }: AchievementTitlePanelProps) {
  const titles = collection?.titles ?? [];
  const earnedTitles = titles.filter((title) => title.earned);

  return (
    <section className="app-shell__achievement-title-panel" data-saving={isSaving}>
      <div className="app-shell__achievement-title-summary">
        <div className="app-shell__section-heading">
          <p className="app-shell__section-eyebrow">칭호</p>
          <h3 className="app-shell__modal-field-title">대표 칭호</h3>
        </div>
        <div className="app-shell__achievement-title-current">
          {collection?.selectedTitle ? (
            <AchievementTitleBadge title={collection.selectedTitle} />
          ) : (
            <p className="app-shell__achievement-title-empty">대표 칭호가 없습니다.</p>
          )}
        </div>
      </div>
      <div className="app-shell__achievement-title-grid" aria-label="획득 칭호">
        {titles.map((title) => (
          <button
            className="app-shell__achievement-title-option"
            data-earned={title.earned}
            data-selected={title.selected}
            data-saving={isSaving}
            disabled={!title.earned || isSaving}
            key={title.code}
            onClick={() => onSelectTitle(title.code)}
            type="button"
          >
            <AchievementTitleBadge title={title} />
            <span className="app-shell__achievement-title-description">{title.description}</span>
            {isSaving && title.selected ? (
              <span className="app-shell__achievement-title-status" role="status">
                저장 중...
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {earnedTitles.length > 0 ? (
        <button
          className="app-shell__achievement-title-clear"
          disabled={isSaving || !collection?.selectedTitle}
          onClick={() => onSelectTitle(null)}
          type="button"
        >
          대표 칭호 해제
        </button>
      ) : null}
    </section>
  );
}
