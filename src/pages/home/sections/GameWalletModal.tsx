import { createPortal } from 'react-dom';
import type { GameCurrentSeason } from '../../../features/game/types';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useHeaderSwipeToClose from '../hooks/useHeaderSwipeToClose';
import { getFullscreenElement } from '../utils';
import GameWalletSummary from './GameWalletSummary';
import './GameWalletModal.css';

interface GameWalletModalProps {
  computedWalletTotalAssetPoints: number | null;
  currentTierCode?: string | null;
  isOpen: boolean;
  onClose: () => void;
  openPositionsBuyPoints: number;
  openPositionsEvaluationPoints: number;
  openPositionsProfitPoints: number;
  season?: GameCurrentSeason;
  walletUpdatedAt?: number;
}

export default function GameWalletModal({
  computedWalletTotalAssetPoints,
  currentTierCode,
  isOpen,
  onClose,
  openPositionsBuyPoints,
  openPositionsEvaluationPoints,
  openPositionsProfitPoints,
  season,
  walletUpdatedAt,
}: GameWalletModalProps) {
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
    <div className="app-shell__modal-backdrop" onClick={onClose} role="presentation" style={backdropStyle}>
      <section
        aria-labelledby="game-wallet-modal-title"
        aria-modal="true"
        className="app-shell__modal app-shell__modal--wallet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={modalStyle}
      >
        <div className="app-shell__modal-header app-shell__modal-header--swipe-close" {...headerSwipeHandlers}>
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Wallet</p>
            <h2 className="app-shell__section-title" id="game-wallet-modal-title">
              지갑 현황
            </h2>
          </div>
          <button aria-label="지갑 현황 모달 닫기" className="app-shell__modal-close" onClick={onClose} type="button">
            닫기
          </button>
        </div>
        <div className="app-shell__modal-body app-shell__modal-body--wallet" {...bodySwipeHandlers}>
          <GameWalletSummary
            computedWalletTotalAssetPoints={computedWalletTotalAssetPoints}
            currentTierCode={currentTierCode}
            openPositionsBuyPoints={openPositionsBuyPoints}
            openPositionsEvaluationPoints={openPositionsEvaluationPoints}
            openPositionsProfitPoints={openPositionsProfitPoints}
            season={season}
            walletUpdatedAt={walletUpdatedAt}
          />
        </div>
      </section>
    </div>,
    container,
  );
}
