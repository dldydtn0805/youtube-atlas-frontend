import './GameInventorySummary.css';
import { useState } from 'react';
import type { OpenGameHolding } from '../../gameHelpers';
import { formatPoints, getPointTone } from '../../gameHelpers';
import type { GameInventorySortKey } from '../../gameInventorySorting';
import { formatSignedPercent, formatSignedScore } from './summaryFormatters';
import { buildGameInventorySummary } from './summaryMetrics';

const SORT_OPTIONS: ReadonlyArray<{ id: GameInventorySortKey; label: string }> = [
  { id: 'profit', label: '수익률순' },
  { id: 'rank', label: '순위순' },
  { id: 'value', label: '평가액순' },
];

interface GameInventorySummaryProps {
  holdings: OpenGameHolding[];
  onSortKeyChange: (sortKey: GameInventorySortKey) => void;
  sortKey: GameInventorySortKey;
}

export default function GameInventorySummary({
  holdings,
  onSortKeyChange,
  sortKey,
}: GameInventorySummaryProps) {
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);
  const summary = buildGameInventorySummary(holdings);
  const profitTone = getPointTone(summary.totalProfitPoints);
  const gainShare = holdings.length > 0 ? Math.round((summary.gainCount / holdings.length) * 100) : 0;
  const activeSegment = summary.segments.find((segment) => segment.id === activeSegmentId);

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
          <span>획득 티어점수</span>
          <strong data-tone={summary.totalProjectedHighlightScore > 0 ? 'tier' : 'flat'}>
            {formatSignedScore(summary.totalProjectedHighlightScore)}
          </strong>
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
        <div className="app-shell__game-inventory-bar" aria-label="포트폴리오 구성 상세">
          {summary.segments.length > 0 ? (
            summary.segments.map((segment) => (
              <button
                key={segment.id}
                aria-label={segment.tooltipLabel}
                aria-pressed={activeSegmentId === segment.id}
                data-tone={segment.tone}
                onClick={() => setActiveSegmentId((currentId) => (currentId === segment.id ? null : segment.id))}
                style={{ width: `${segment.widthPercent}%` }}
                type="button"
              />
            ))
          ) : (
            <span data-tone="flat" style={{ width: '100%' }} />
          )}
        </div>
        {activeSegment ? (
          <p className="app-shell__game-inventory-bar-tooltip" role="status">
            {activeSegment.tooltipLabel}
          </p>
        ) : null}
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
