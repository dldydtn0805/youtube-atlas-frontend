import type { SellGamePreviewResponse } from '../../../features/game/types';
import { formatGameOrderQuantity, formatPoints } from '../gameHelpers';

interface GameSellPreviewDetailProps {
  isLoading: boolean;
  preview?: SellGamePreviewResponse;
}

function formatTierScore(score: number) {
  return formatPoints(score).replace(/P$/, '점');
}

export default function GameSellPreviewDetail({ isLoading, preview }: GameSellPreviewDetailProps) {
  if (isLoading) {
    return <p className="app-shell__game-trade-modal-detail-copy">티어 점수 기록을 계산하고 있습니다.</p>;
  }

  if (!preview) {
    return null;
  }

  return (
    <div className="app-shell__game-trade-modal-detail-stack">
      <p className="app-shell__game-trade-modal-detail-copy">
        기존 최고 티어 점수보다 높아야 기록이 갱신됩니다. 이번 매도는 {preview.recordEligibleCount}건 갱신 예정이고,
        실제 누적 반영은 {formatTierScore(preview.appliedHighlightScoreDelta)}입니다.
      </p>
      <ul className="app-shell__game-trade-modal-preview-list">
        {preview.items.map((item) => (
          <li key={`${item.positionId}-${item.quantity}`} className="app-shell__game-trade-modal-preview-item">
            <div>
              <strong>#{item.buyRank} 매수분 · {formatGameOrderQuantity(item.quantity)}</strong>
              <p>
                예상 티어 점수 {formatTierScore(item.projectedHighlightScore)} / 현재 최고 {formatTierScore(item.bestHighlightScore)}
              </p>
            </div>
            <span data-tone={item.willUpdateRecord ? 'gain' : 'flat'}>
              {item.willUpdateRecord ? `+${formatTierScore(item.appliedHighlightScoreDelta)}` : '미갱신'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
