import type { GameHighlight } from '../../../features/game/types';
import { formatGameTimestamp, formatMaybePoints, formatPoints, formatRank, getPointTone } from '../gameHelpers';
import './GameHighlightsTab.css';

interface GameHighlightsTabProps {
  highlights: GameHighlight[];
  isLoading: boolean;
  onSelectHighlight: (highlight: GameHighlight) => void;
}

function formatSignedPoints(points?: number | null) {
  if (typeof points !== 'number' || !Number.isFinite(points)) {
    return '집계 중';
  }

  return points > 0 ? `+${formatPoints(points)}` : points < 0 ? `-${formatPoints(Math.abs(points))}` : '0P';
}

function formatSignedRate(rate?: number | null) {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    return '집계 중';
  }

  return `${rate > 0 ? '+' : ''}${rate.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`;
}

function getHighlightTypeLabel(type: string) {
  switch (type) {
    case 'MOONSHOT':
      return '문샷';
    case 'CASHOUT':
      return '수익 실현';
    case 'SNIPE':
      return '스나이프';
    default:
      return '하이라이트';
  }
}

function formatHighlightScore(score?: number | null) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return '집계 중';
  }

  return `+${score.toLocaleString('ko-KR')}점`;
}

function getHighlightGradeLabel(grade: string) {
  switch (grade) {
    case 'S':
      return '전설급';
    case 'A':
      return '대박';
    default:
      return '기록';
  }
}

export default function GameHighlightsTab({ highlights, isLoading, onSelectHighlight }: GameHighlightsTabProps) {
  if (isLoading) {
    return <p className="app-shell__game-empty">하이라이트를 불러오는 중입니다.</p>;
  }

  if (highlights.length === 0) {
    return <p className="app-shell__game-empty">아직 하이라이트가 없습니다. 급상승 영상을 잡으면 여기에 기록됩니다.</p>;
  }

  return (
    <ul className="app-shell__game-highlights">
      {highlights.map((highlight) => (
        <li key={highlight.id} className="app-shell__game-highlight">
          <button
            className="app-shell__game-highlight-select"
            onClick={() => onSelectHighlight(highlight)}
            title="순위 추이 차트를 봅니다."
            type="button"
          >
            <img alt="" className="app-shell__game-highlight-thumb" loading="lazy" src={highlight.thumbnailUrl} />
            <div className="app-shell__game-highlight-copy">
              <div className="app-shell__game-highlight-heading">
                <span
                  className="app-shell__game-highlight-grade"
                  title={`${highlight.grade} 등급 · ${getHighlightGradeLabel(highlight.grade)}`}
                >
                  {highlight.grade}
                </span>
                <span className="app-shell__game-highlight-type">
                  {getHighlightTypeLabel(highlight.highlightType)}
                </span>
                <p className="app-shell__game-highlight-title">{highlight.title}</p>
              </div>
              <p className="app-shell__game-highlight-video">{highlight.videoTitle}</p>
              <p className="app-shell__game-highlight-meta">
                <span>{formatRank(highlight.buyRank)}</span>
                {' → '}
                <span>{formatRank(highlight.highlightRank)}</span>
                {' · '}
                <span data-tone={getPointTone(highlight.profitPoints)}>{formatSignedPoints(highlight.profitPoints)}</span>
                {' · '}
                <span data-tone={getPointTone(highlight.profitPoints)}>{formatSignedRate(highlight.profitRatePercent)}</span>
              </p>
              <p className="app-shell__game-highlight-detail">{highlight.description}</p>
            </div>
            <div className="app-shell__game-highlight-side">
              <span title="이 하이라이트로 오른 티어 점수">{formatHighlightScore(highlight.highlightScore)}</span>
              <span>{formatMaybePoints(highlight.currentPricePoints)}</span>
              <span>{formatGameTimestamp(highlight.createdAt)}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
