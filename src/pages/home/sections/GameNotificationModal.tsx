import { createPortal } from 'react-dom';
import type { GameNotification } from '../../../features/game/types';
import { formatPoints } from '../gameHelpers';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useHeaderSwipeToClose from '../hooks/useHeaderSwipeToClose';
import { getFullscreenElement } from '../utils';
import { getGameNotificationStatus } from './gameNotificationContent';
import { isTierPromotionNotification } from './gameNotificationEventType';
import { getGameNotificationLabel, getGameNotificationTone } from './gameNotificationLabels';
import GameNotificationTierVisual from './GameNotificationTierVisual';
import { hasProjectedGameNotificationScore, hasResolvedGameNotificationScore } from './gameNotificationModalUtils';
import './GameNotificationModal.css';

interface GameNotificationModalProps {
  notification: GameNotification | null;
  onClose: () => void;
  onOpenChart?: (notification: GameNotification) => void;
}

function isHighlightAchievementNotification(notification: GameNotification) {
  return !isTierPromotionNotification(notification) && notification.showModal !== false;
}

function GameNotificationModal({ notification, onClose, onOpenChart }: GameNotificationModalProps) {
  useBodyScrollLock(Boolean(notification));
  const { backdropStyle, headerSwipeHandlers, modalStyle } = useHeaderSwipeToClose({
    disabled: !notification,
    onClose,
  });

  if (!notification || typeof document === 'undefined') {
    return null;
  }

  const hasResolvedScore = hasResolvedGameNotificationScore(notification);
  const hasProjectedScore = hasProjectedGameNotificationScore(notification);
  const canOpenChart = isHighlightAchievementNotification(notification) && typeof onOpenChart === 'function';

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;

  return createPortal(
    <div className="app-shell__modal-backdrop" onClick={onClose} role="presentation" style={backdropStyle}>
      <section
        aria-labelledby="game-notification-modal-title"
        aria-modal="true"
        className="app-shell__modal game-notification-modal"
        data-tier-promotion={isTierPromotionNotification(notification) ? 'true' : 'false'}
        data-projected={hasResolvedScore ? 'false' : 'true'}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={modalStyle}
      >
        <div
          className="app-shell__modal-header app-shell__modal-header--swipe-close game-notification-modal__header"
          {...headerSwipeHandlers}
        >
          <button aria-label="게임 알림 모달 닫기" className="app-shell__modal-close" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        {isTierPromotionNotification(notification) ? (
          <div className="game-notification-modal__tier-visual">
            <GameNotificationTierVisual notification={notification} />
          </div>
        ) : (
          <img alt="" className="game-notification-modal__thumb" src={notification.thumbnailUrl ?? undefined} />
        )}
        <div className="game-notification-modal__body">
          <span data-tone={getGameNotificationTone(notification)}>{getGameNotificationLabel(notification)}</span>
          <h2 id="game-notification-modal-title">{notification.videoTitle ?? notification.title}</h2>
          <p>{notification.message}</p>
          <strong>
            {isTierPromotionNotification(notification)
              ? getGameNotificationStatus(notification)
              : hasResolvedScore
              ? `${formatPoints(notification.highlightScore as number)} 하이라이트`
              : hasProjectedScore
                ? `${formatPoints(notification.highlightScore as number)} 예상 하이라이트 · 매도 시 확정`
                : '매도 시 하이라이트 점수가 확정됩니다.'}
          </strong>
          {canOpenChart ? (
            <button className="game-notification-modal__chart-button" onClick={() => onOpenChart(notification)} type="button">
              차트 확인
            </button>
          ) : null}
        </div>
      </section>
    </div>,
    container,
  );
}

export default GameNotificationModal;
