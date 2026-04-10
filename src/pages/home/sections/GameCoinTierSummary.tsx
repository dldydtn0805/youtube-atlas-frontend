import type { GameCoinTierProgress } from '../../../features/game/types';
import { formatCoins } from '../gameHelpers';

interface GameCoinTierSummaryProps {
  progress?: GameCoinTierProgress;
  title?: string;
  showLadder?: boolean;
}

function getTierProgressPercent(progress: GameCoinTierProgress) {
  if (!progress.nextTier) {
    return 100;
  }

  const currentFloor = progress.currentTier.minCoinBalance;
  const nextFloor = progress.nextTier.minCoinBalance;
  const range = Math.max(nextFloor - currentFloor, 1);
  const progressed = Math.max(progress.coinBalance - currentFloor, 0);

  return Math.max(0, Math.min(100, (progressed / range) * 100));
}

export default function GameCoinTierSummary({
  progress,
  title = '현재 티어',
  showLadder = true,
}: GameCoinTierSummaryProps) {
  if (!progress) {
    return null;
  }

  const progressPercent = getTierProgressPercent(progress);
  const remainingToNextTier = progress.nextTier
    ? Math.max(progress.nextTier.minCoinBalance - progress.coinBalance, 0)
    : 0;

  return (
    <section
      aria-label="시즌 코인 티어 진행도"
      className="app-shell__game-tier"
      data-current-tier={progress.currentTier.tierCode}
    >
      <div className="app-shell__game-tier-copy">
        <p className="app-shell__game-tier-eyebrow">티어</p>
        <h5 className="app-shell__game-tier-title">{title}</h5>
      </div>

      <div className="app-shell__game-tier-card" data-tier-code={progress.currentTier.tierCode}>
        <div className="app-shell__game-tier-head">
          <div className="app-shell__game-tier-head-copy">
            <span className="app-shell__game-leaderboard-tier" data-tier-code={progress.currentTier.tierCode}>
              {progress.currentTier.displayName}
            </span>
            <p className="app-shell__game-tier-description">
              {progress.nextTier
                ? `${progress.nextTier.displayName}까지 ${formatCoins(remainingToNextTier)} 남음`
                : '이번 시즌 최고 티어를 달성했어요.'}
            </p>
          </div>
          <strong className="app-shell__game-tier-balance" title={formatCoins(progress.coinBalance)}>
            {formatCoins(progress.coinBalance)}
          </strong>
        </div>

        <div className="app-shell__game-tier-progress" aria-hidden="true">
          <div className="app-shell__game-tier-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="app-shell__game-tier-progress-scale">
          <span>{formatCoins(progress.currentTier.minCoinBalance)}</span>
          <span>
            {progress.nextTier ? formatCoins(progress.nextTier.minCoinBalance) : 'MAX'}
          </span>
        </div>
      </div>

      {showLadder ? (
        <ul className="app-shell__game-tier-ladder">
          {progress.tiers.map((tier) => {
            const isCurrent = tier.tierCode === progress.currentTier.tierCode;
            const isReached = progress.coinBalance >= tier.minCoinBalance;

            return (
              <li
                key={tier.tierCode}
                className="app-shell__game-tier-step"
                data-current={isCurrent}
                data-reached={isReached}
                data-tier-code={tier.tierCode}
              >
                <span className="app-shell__game-tier-step-name">{tier.displayName}</span>
                <span className="app-shell__game-tier-step-value">{formatCoins(tier.minCoinBalance)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
