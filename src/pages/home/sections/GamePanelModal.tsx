import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useHeaderSwipeToClose from '../hooks/useHeaderSwipeToClose';
import { getFullscreenElement } from '../utils';
import './GamePanelModal.css';

interface GamePanelModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export default function GamePanelModal({ children, isOpen, onClose }: GamePanelModalProps) {
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
            <h2 className="app-shell__section-title" id="game-panel-modal-title">
              내 게임
            </h2>
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
