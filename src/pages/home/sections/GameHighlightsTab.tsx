import type { GameHighlight } from '../../../features/game/types';
import { formatPoints, formatRank, getPointTone } from '../gameHelpers';
import { buildGameStrategyBadges } from '../gameStrategyTags';
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
    case 'ATLAS_SHOT':
      return '아틀라스 샷';
    case 'MOONSHOT':
      return '문샷';
    case 'SMALL_CASHOUT':
      return '스몰 캐시아웃';
    case 'BIG_CASHOUT':
      return '빅 캐시아웃';
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

export default function GameHighlightsTab({ highlights, isLoading, onSelectHighlight }: GameHighlightsTabProps) {
  if (isLoading) {
    return <p className="app-shell__game-empty">하이라이트를 불러오는 중입니다.</p>;
  }

  if (highlights.length === 0) {
    return <p className="app-shell__game-empty">아직 하이라이트가 없습니다. 급상승 영상을 잡으면 여기에 기록됩니다.</p>;
  }

  return (
    <ul className="app-shell__game-highlights">
      {highlights.map((highlight) => {
        const strategyBadges = buildGameStrategyBadges(highlight.strategyTags, highlight.highlightType);

        return (
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
                  <p className="app-shell__game-highlight-title">{highlight.videoTitle}</p>
                </div>
                <p className="app-shell__game-highlight-meta">
                  <span className="app-shell__game-highlight-meta-label">티어 점수</span>{' '}
                  <span className="app-shell__game-highlight-score" title="이 하이라이트로 오른 티어 점수">
                    {formatHighlightScore(highlight.highlightScore)}
                  </span>
                  {' · '}
                  <span className="app-shell__game-highlight-meta-label">순위</span> <span>{formatRank(highlight.buyRank)}</span>
                  {' → '}
                  <span>{formatRank(highlight.highlightRank)}</span>
                  {' · '}
                  <span className="app-shell__game-highlight-meta-label">손익금</span>{' '}
                  <span data-tone={getPointTone(highlight.profitPoints)}>{formatSignedPoints(highlight.profitPoints)}</span>
                  {' · '}
                  <span className="app-shell__game-highlight-meta-label">손익률</span>{' '}
                  <span data-tone={getPointTone(highlight.profitPoints)}>{formatSignedRate(highlight.profitRatePercent)}</span>
                </p>
                <div className="app-shell__game-highlight-detail">
                  <span className="app-shell__game-highlight-detail-badges">
                    {strategyBadges.map((badge) => (
                      <span
                        key={`${highlight.id}-${badge.type}`}
                        className="app-shell__game-highlight-tag"
                        data-tone={badge.tone}
                      >
                        {badge.label}
                      </span>
                    ))}
                    {strategyBadges.length === 0 ? (
                      <span className="app-shell__game-highlight-tag" data-tone="moonshot">
                        {getHighlightTypeLabel(highlight.highlightType)}
                      </span>
                    ) : null}
                  </span>
                  <p className="app-shell__game-highlight-detail-copy">{highlight.description}</p>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
