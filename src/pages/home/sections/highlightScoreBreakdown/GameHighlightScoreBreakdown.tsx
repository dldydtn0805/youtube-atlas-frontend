import type { GameHighlightScoreBreakdown as Breakdown } from '../../../../features/game/types';
import ScoreBreakdownRow from './ScoreBreakdownRow';
import { formatScorePart } from './scoreBreakdownFormat';
import './GameHighlightScoreBreakdown.css';

interface GameHighlightScoreBreakdownProps { breakdown?: Breakdown | null }

export default function GameHighlightScoreBreakdown({
  breakdown,
}: GameHighlightScoreBreakdownProps) {
  if (!breakdown?.strategyScores.length) {
    return null;
  }

  return (
    <div className="game-highlight-score-breakdown" aria-label="하이라이트 점수 산식">
      <p className="game-highlight-score-breakdown__total">
        <span>점수 산식</span>
        <strong>{formatScorePart(breakdown.totalScore)}</strong>
      </p>
      <div className="game-highlight-score-breakdown__list">
        {breakdown.strategyScores.map((score) => (
          <ScoreBreakdownRow key={score.strategyType} score={score} />
        ))}
      </div>
    </div>
  );
}
