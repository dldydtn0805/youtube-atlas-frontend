import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useHeaderSwipeToClose from '../hooks/useHeaderSwipeToClose';
import { getFullscreenElement } from '../utils';
import GameSeasonCountdown from './GameSeasonCountdown';
import { formatSeasonDurationLabel } from './gameSeasonDurationLabel';
import './GamePanelModal.css';

interface GamePanelModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  seasonEndAt?: string | null;
  seasonStartAt?: string | null;
}

export default function GamePanelModal({
  children,
  isOpen,
  onClose,
  seasonEndAt,
  seasonStartAt,
}: GamePanelModalProps) {
  useBodyScrollLock(isOpen);
  const { backdropStyle, bodySwipeHandlers, headerSwipeHandlers, modalStyle } = useHeaderSwipeToClose({
    disabled: !isOpen,
    onClose,
  });

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;
  const seasonDurationLabel = formatSeasonDurationLabel(seasonStartAt, seasonEndAt);

  return createPortal(
    <div
      className="app-shell__modal-backdrop app-shell__modal-backdrop--game-panel"
      onClick={onClose}
      role="presentation"
      style={backdropStyle}
    >
      <section
        aria-labelledby="game-panel-modal-title"
        aria-modal="true"
        className="app-shell__modal app-shell__modal--game-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={modalStyle}
      >
        <div className="app-shell__modal-header app-shell__modal-header--swipe-close" {...headerSwipeHandlers}>
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">My Game</p>
            <div className="app-shell__modal-title-row">
              <h2 className="app-shell__section-title" id="game-panel-modal-title">
                내 게임
              </h2>
              {seasonDurationLabel ? (
                <span className="app-shell__game-season-duration">{seasonDurationLabel} 시즌</span>
              ) : null}
              {seasonEndAt ? <GameSeasonCountdown endAt={seasonEndAt} startAt={seasonStartAt} /> : null}
            </div>
          </div>
          <button aria-label="게임 모달 닫기" className="app-shell__modal-close" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        <div className="app-shell__modal-body app-shell__modal-body--game-panel" {...bodySwipeHandlers}>{children}</div>
      </section>
    </div>,
    container,
  );
}
