import type { GameSeasonResult } from '../../../../features/game/types';
import { formatSeasonDateTime } from '../../gameHelpers';

interface Props {
  label: string;
  onOpenRecords?: () => void;
  recordCount?: number;
  result: GameSeasonResult;
}

export default function SeasonResultHeader({ label, onOpenRecords, recordCount = 0, result }: Props) {
  return (
    <div className="game-season-result__head">
      <div className="game-season-result__headline">
        <p className="game-season-result__eyebrow">ANALYST REPORT</p>
        <h4 className="game-season-result__title">{result.seasonName}</h4>
        <p className="game-season-result__season-meta">
          {label} · {result.regionCode === 'GLOBAL' ? '' : `${result.regionCode} · `}
          {formatSeasonDateTime(result.seasonEndAt)} 종료
        </p>
      </div>
      <div className="game-season-result__head-actions">
        <span className="game-season-result__rank-label">최종 순위</span>
        <strong className="game-season-result__rank">{result.finalRank}위</strong>
        {onOpenRecords && recordCount > 0 ? (
          <button className="game-season-result__records-button" onClick={onOpenRecords} type="button">
            전체 기록
          </button>
        ) : null}
      </div>
    </div>
  );
}
