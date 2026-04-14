import { type PointerEvent } from 'react';

import type { GameCoinTierProgress } from '../../../features/game/types';
import { formatCoins } from '../gameHelpers';

interface GameCoinTierSummaryProps {
  progress?: GameCoinTierProgress;
  surfaceVariant?: 'default' | 'season-coin';
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

function getTierCardNumber(progress: GameCoinTierProgress) {
  const tierCode = progress.currentTier.tierCode.slice(0, 4).padEnd(4, '0');
  const currentFloor = String(progress.currentTier.minCoinBalance).padEnd(4, '0').slice(0, 4);
  const nextFloor = progress.nextTier
    ? String(progress.nextTier.minCoinBalance).padEnd(4, '0').slice(0, 4)
    : '9999';
  const coinBalance = String(progress.coinBalance).padStart(4, '0').slice(-4);

  return `YTAT ${tierCode} ${currentFloor} ${nextFloor} ${coinBalance}`;
}

function handleTierCardPointerMove(event: PointerEvent<HTMLDivElement>) {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  const dx = (x - 50) / 50;
  const dy = (y - 50) / 50;

  card.style.setProperty('--game-tier-card-rotate-x', `${-dy * 16}deg`);
  card.style.setProperty('--game-tier-card-rotate-y', `${dx * 16}deg`);
  card.style.setProperty('--game-tier-card-glare-x', `${x}%`);
  card.style.setProperty('--game-tier-card-glare-y', `${y}%`);
  card.style.setProperty('--game-tier-card-scale', '1.02');
  card.dataset.interacting = 'true';
}

function handleTierCardPointerEnd(event: PointerEvent<HTMLDivElement>) {
  const card = event.currentTarget;

  card.style.setProperty('--game-tier-card-rotate-x', '0deg');
  card.style.setProperty('--game-tier-card-rotate-y', '0deg');
  card.style.setProperty('--game-tier-card-glare-x', '22%');
  card.style.setProperty('--game-tier-card-glare-y', '18%');
  card.style.setProperty('--game-tier-card-scale', '1');
  delete card.dataset.interacting;
}

export default function GameCoinTierSummary({
  progress,
  surfaceVariant = 'default',
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
  const tierCardNumber = getTierCardNumber(progress);
  const progressLabel = `${Math.round(progressPercent)}%`;

  return (
    <section
      aria-label="시즌 코인 티어 진행도"
      className="app-shell__game-tier"
      data-current-tier={progress.currentTier.tierCode}
      data-surface-variant={surfaceVariant}
    >
      <div className="app-shell__game-tier-copy">
        <p className="app-shell__game-tier-eyebrow">티어</p>
        <h5 className="app-shell__game-tier-title">{title}</h5>
      </div>

      <div className="app-shell__game-tier-card-frame">
        <div
          className="app-shell__game-tier-card"
          data-tier-code={progress.currentTier.tierCode}
          onPointerMove={handleTierCardPointerMove}
          onPointerUp={handleTierCardPointerEnd}
          onPointerLeave={handleTierCardPointerEnd}
          onPointerCancel={handleTierCardPointerEnd}
        >
          <div className="app-shell__game-tier-card-top">
            <span className="app-shell__game-tier-issuer">YOUTUBE ATLAS</span>
            <span className="app-shell__game-tier-network">Season Coin</span>
          </div>

          <div className="app-shell__game-tier-card-tech" aria-hidden="true">
            <span className="app-shell__game-tier-chip" />
            <span className="app-shell__game-tier-contactless" />
          </div>

          <span className="app-shell__game-tier-card-number" aria-label={`티어 카드 번호 ${tierCardNumber}`}>
            {tierCardNumber}
          </span>

          <div className="app-shell__game-tier-head">
            <span className="app-shell__game-tier-name" title={`${progress.currentTier.displayName} 티어`}>
              {progress.currentTier.displayName}
            </span>
            <strong className="app-shell__game-tier-balance" title={formatCoins(progress.coinBalance)}>
              {formatCoins(progress.coinBalance)}
            </strong>
          </div>

          <p className="app-shell__game-tier-description">
            {progress.nextTier
              ? `${progress.nextTier.displayName}까지 ${formatCoins(remainingToNextTier)} 남음`
              : '이번 시즌 최고 티어를 달성했어요.'}
          </p>

          <div className="app-shell__game-tier-progress-label">
            <span>진행률</span>
            <span>{progressLabel}</span>
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
