import type { SellGamePreviewResponse } from '../../../features/game/types';
import { formatPoints } from '../gameHelpers';

interface GameSellPreviewDetailProps {
  isLoading: boolean;
  preview?: SellGamePreviewResponse;
}

function formatHighlightScore(score: number) {
  return formatPoints(score).replace(/P$/, '점');
}

export default function GameSellPreviewDetail({ isLoading, preview }: GameSellPreviewDetailProps) {
  if (isLoading) {
    return <p className="app-shell__game-trade-modal-detail-copy">하이라이트 점수 기록을 계산하고 있습니다.</p>;
  }

  if (!preview) {
    return null;
  }

  const bestHighlightScore = Math.max(0, ...preview.items.map((item) => item.bestHighlightScore));

  return (
    <div className="app-shell__game-trade-modal-detail-stack">
      <p className="app-shell__game-trade-modal-detail-copy">
        기존 최고 하이라이트 점수 {formatHighlightScore(bestHighlightScore)}보다 높아야 기록이 갱신됩니다. 갱신된 하이라이트 점수는 티어에 반영됩니다.
      </p>
    </div>
  );
}
