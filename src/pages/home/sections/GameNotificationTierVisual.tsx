import type { GameNotification } from '../../../features/game/types';
import { getTierPromotionMeta } from './gameNotificationTierVisualUtils';
import './GameNotificationTierVisual.css';

interface GameNotificationTierVisualProps {
  notification: GameNotification;
  compact?: boolean;
  variant?: 'default' | 'toast';
}

function formatScore(score: number | null) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return '승급 완료';
  }

  return `+${score.toLocaleString('ko-KR')}점`;
}

function GameNotificationTierVisual({
  notification,
  compact = false,
  variant = 'default',
}: GameNotificationTierVisualProps) {
  const tierMeta = getTierPromotionMeta(notification);

  if (!tierMeta) {
    return <img alt="" className="game-notification-tier-visual__fallback" src={notification.thumbnailUrl} />;
  }

  return (
    <div
      className="game-notification-tier-visual app-shell__game-tier"
      data-compact={compact ? 'true' : 'false'}
      data-current-tier={tierMeta.tierCode}
      data-variant={variant}
    >
      <div className="app-shell__game-tier-card-frame">
        <div className="app-shell__game-tier-card" data-tier-code={tierMeta.tierCode}>
          <div className="app-shell__game-tier-card-top">
            <span className="app-shell__game-tier-issuer">YOUTUBE ATLAS</span>
            <span className="app-shell__game-tier-network">Tier Promotion</span>
          </div>
          <div className="app-shell__game-tier-card-tech" aria-hidden="true">
            <span className="app-shell__game-tier-chip" />
            <span className="app-shell__game-tier-contactless" />
          </div>
          <div className="app-shell__game-tier-head">
            <span className="app-shell__game-tier-name">{tierMeta.displayName}</span>
            <span className="app-shell__game-tier-coin-side">
              <strong className="app-shell__game-tier-balance">{formatScore(notification.highlightScore)}</strong>
            </span>
          </div>
          <p className="app-shell__game-tier-description">{notification.message}</p>
        </div>
      </div>
    </div>
  );
}

export default GameNotificationTierVisual;
