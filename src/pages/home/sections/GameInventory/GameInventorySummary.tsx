import './GameInventorySummary.css';
import type { OpenGameHolding } from '../../gameHelpers';
import { formatPercent, formatPoints, getPointTone } from '../../gameHelpers';
import type { GameInventorySortKey } from '../../gameInventorySorting';
import { buildGameInventorySummary } from './summaryMetrics';

const SORT_OPTIONS: ReadonlyArray<{ id: GameInventorySortKey; label: string }> = [
  { id: 'profit', label: '수익률순' },
  { id: 'rank', label: '순위순' },
  { id: 'value', label: '평가액순' },
];

interface GameInventorySummaryProps {
  holdings: OpenGameHolding[];
  maxOpenPositions: number | null;
  onSortKeyChange: (sortKey: GameInventorySortKey) => void;
  openDistinctVideoCount: number;
  sortKey: GameInventorySortKey;
}

function formatSignedPercent(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '집계 중';
  }

  if (value > 0) return `+${formatPercent(value)}`;
  if (value < 0) return `-${formatPercent(Math.abs(value))}`;
  return '0%';
}

export default function GameInventorySummary({
  holdings,
  maxOpenPositions,
  onSortKeyChange,
  openDistinctVideoCount,
  sortKey,
}: GameInventorySummaryProps) {
  const summary = buildGameInventorySummary(holdings);
  const profitTone = getPointTone(summary.totalProfitPoints);
  const gainShare = holdings.length > 0 ? Math.round((summary.gainCount / holdings.length) * 100) : 0;

  return (
    <section className="app-shell__game-inventory-summary" aria-label="보유 포지션 요약">
      <div className="app-shell__game-inventory-stats">
        <span className="app-shell__game-inventory-stat">
          <span>총 평가금액</span>
          <strong>{formatPoints(summary.totalEvaluationPoints)}</strong>
        </span>
        <span className="app-shell__game-inventory-stat">
          <span>전체 수익률</span>
          <strong data-tone={profitTone}>{formatSignedPercent(summary.profitRatePercent)}</strong>
        </span>
        <span className="app-shell__game-inventory-stat">
          <span>보유 영상</span>
          <strong>{`${openDistinctVideoCount} / ${maxOpenPositions ?? '-'}`}</strong>
        </span>
        <span className="app-shell__game-inventory-stat">
          <span>수익 / 손실</span>
          <strong>
            <span data-tone="gain">{summary.gainCount}</span>
            <span className="app-shell__game-inventory-stat-separator"> / </span>
            <span data-tone="loss">{summary.lossCount}</span>
          </strong>
        </span>
      </div>
      <div className="app-shell__game-inventory-mix">
        <div className="app-shell__game-inventory-mix-label">
          <span>포트폴리오 구성</span>
          <span data-tone="gain">{`수익 ${gainShare}%`}</span>
        </div>
        <div className="app-shell__game-inventory-bar" aria-hidden="true">
          {summary.segments.length > 0 ? (
            summary.segments.map((segment) => (
              <span
                key={segment.id}
                data-tone={segment.tone}
                style={{ width: `${segment.widthPercent}%` }}
              />
            ))
          ) : (
            <span data-tone="flat" style={{ width: '100%' }} />
          )}
        </div>
      </div>
      {holdings.length > 0 ? (
        <div className="app-shell__game-inventory-sort">
          <span>{`${holdings.length.toLocaleString('ko-KR')}개 보유 중`}</span>
          <div aria-label="인벤토리 정렬" className="app-shell__game-inventory-sort-buttons">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                aria-pressed={sortKey === option.id}
                data-active={sortKey === option.id}
                onClick={() => onSortKeyChange(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
