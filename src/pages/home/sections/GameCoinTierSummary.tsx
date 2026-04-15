import { useEffect, useRef, type PointerEvent } from 'react';

import type { GameCoinTierProgress } from '../../../features/game/types';
import { formatCoins } from '../gameHelpers';

interface GameCoinTierSummaryProps {
  progress?: GameCoinTierProgress;
  surfaceVariant?: 'default' | 'season-coin';
  title?: string;
  showLadder?: boolean;
}

const TIER_CARD_LONG_PRESS_MS = 320;
const TIER_CARD_TOUCH_MOVE_TOLERANCE_PX = 12;

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

function setTierCardTiltFromPoint(card: HTMLDivElement, clientX: number, clientY: number) {
  const rect = card.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  const dx = (x - 50) / 50;
  const dy = (y - 50) / 50;

  card.style.setProperty('--game-tier-card-rotate-x', `${-dy * 16}deg`);
  card.style.setProperty('--game-tier-card-rotate-y', `${dx * 16}deg`);
  card.style.setProperty('--game-tier-card-glare-x', `${x}%`);
  card.style.setProperty('--game-tier-card-glare-y', `${y}%`);
  card.style.setProperty('--game-tier-card-scale', '1.02');
  card.dataset.interacting = 'true';
}

function setTierCardTilt(event: PointerEvent<HTMLDivElement>) {
  setTierCardTiltFromPoint(event.currentTarget, event.clientX, event.clientY);
}

function handleTierCardPointerDown(event: PointerEvent<HTMLDivElement>) {
  if (event.pointerType === 'touch') {
    return;
  }

  event.currentTarget.setPointerCapture(event.pointerId);
  setTierCardTilt(event);
}

function resetTierCardTilt(card: HTMLDivElement) {
  card.style.setProperty('--game-tier-card-rotate-x', '0deg');
  card.style.setProperty('--game-tier-card-rotate-y', '0deg');
  card.style.setProperty('--game-tier-card-glare-x', '22%');
  card.style.setProperty('--game-tier-card-glare-y', '18%');
  card.style.setProperty('--game-tier-card-scale', '1');
  delete card.dataset.interacting;
}

function handleTierCardPointerEnd(event: PointerEvent<HTMLDivElement>) {
  const card = event.currentTarget;

  if (card.hasPointerCapture(event.pointerId)) {
    card.releasePointerCapture(event.pointerId);
  }
}

export default function GameCoinTierSummary({
  progress,
  surfaceVariant = 'default',
  title = '현재 티어',
  showLadder = true,
}: GameCoinTierSummaryProps) {
  const longPressTimeoutRef = useRef<number | null>(null);
  const mouseInteractionRef = useRef<{
    active: boolean;
    pointerId: number | null;
  }>({
    active: false,
    pointerId: null,
  });
  const touchInteractionRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    card: HTMLDivElement | null;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    card: null,
  });

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current !== null) {
        window.clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  if (!progress) {
    return null;
  }

  function clearPendingLongPress() {
    if (longPressTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = null;
  }

  function beginTouchInteraction() {
    const touchInteraction = touchInteractionRef.current;
    const card = touchInteraction.card;

    if (!card) {
      return;
    }

    touchInteraction.active = true;
    card.style.touchAction = 'none';

    if (touchInteraction.pointerId !== null) {
      try {
        card.setPointerCapture(touchInteraction.pointerId);
      } catch {
        // Touch capture can fail if scrolling already took over.
      }
    }

    setTierCardTiltFromPoint(card, touchInteraction.lastX, touchInteraction.lastY);
  }

  function resetTouchInteraction(card?: HTMLDivElement) {
    const targetCard = card ?? touchInteractionRef.current.card;

    clearPendingLongPress();

    if (targetCard) {
      targetCard.style.removeProperty('touch-action');
    }

    touchInteractionRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      card: null,
    };
  }

  function handleTouchPointerDown(event: PointerEvent<HTMLDivElement>) {
    touchInteractionRef.current = {
      active: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      card: event.currentTarget,
    };

    clearPendingLongPress();
    longPressTimeoutRef.current = window.setTimeout(() => {
      beginTouchInteraction();
      longPressTimeoutRef.current = null;
    }, TIER_CARD_LONG_PRESS_MS);
  }

  function handleTouchPointerMove(event: PointerEvent<HTMLDivElement>) {
    const touchInteraction = touchInteractionRef.current;

    if (touchInteraction.pointerId !== event.pointerId) {
      return;
    }

    touchInteraction.lastX = event.clientX;
    touchInteraction.lastY = event.clientY;

    if (!touchInteraction.active) {
      const deltaX = Math.abs(event.clientX - touchInteraction.startX);
      const deltaY = Math.abs(event.clientY - touchInteraction.startY);

      if (deltaX > TIER_CARD_TOUCH_MOVE_TOLERANCE_PX || deltaY > TIER_CARD_TOUCH_MOVE_TOLERANCE_PX) {
        resetTouchInteraction(event.currentTarget);
      }

      return;
    }

    setTierCardTiltFromPoint(event.currentTarget, event.clientX, event.clientY);
  }

  function handleTierCardPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch') {
      handleTouchPointerMove(event);
      return;
    }

    if (
      !mouseInteractionRef.current.active ||
      mouseInteractionRef.current.pointerId !== event.pointerId
    ) {
      return;
    }

    setTierCardTilt(event);
  }

  function handleTierCardPointerRelease(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch') {
      const card = event.currentTarget;

      if (card.hasPointerCapture(event.pointerId)) {
        card.releasePointerCapture(event.pointerId);
      }

      resetTierCardTilt(card);
      resetTouchInteraction(card);
      return;
    }

    mouseInteractionRef.current = {
      active: false,
      pointerId: null,
    };
    handleTierCardPointerEnd(event);
    resetTierCardTilt(event.currentTarget);
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
          onPointerDown={(event) => {
            if (event.pointerType === 'touch') {
              handleTouchPointerDown(event);
              return;
            }

            mouseInteractionRef.current = {
              active: true,
              pointerId: event.pointerId,
            };
            handleTierCardPointerDown(event);
          }}
          onPointerMove={handleTierCardPointerMove}
          onPointerUp={handleTierCardPointerRelease}
          onPointerLeave={handleTierCardPointerRelease}
          onPointerCancel={handleTierCardPointerRelease}
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
