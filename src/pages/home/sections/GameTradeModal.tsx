import { createPortal } from 'react-dom';
import type { ScheduledSellTriggerDirection, ScheduledSellTriggerType } from '../../../features/game/types';
import {
  FALLBACK_SCHEDULED_SELL_DEFAULT_PROFIT_RATE_PERCENT,
  FALLBACK_SCHEDULED_SELL_PROFIT_RATE_PRESETS,
} from '../../../features/game/constants';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useHeaderSwipeToClose from '../hooks/useHeaderSwipeToClose';
import { normalizeGameOrderCapacity } from '../gameHelpers';
import { getFullscreenElement } from '../utils';
import BuyTradeReceipt from './GameTradeModal/BuyTradeReceipt';
import SellTradeReceipt from './GameTradeModal/SellTradeReceipt';
import type { GameTradeModalSummaryItem } from './GameTradeModal/types';
import './GameTradeModal.css';

interface GameTradeModalProps {
  confirmLabel: string;
  currentRankLabel: string;
  helperText: string;
  isOpen: boolean;
  isInstantSellDisabled?: boolean;
  isSubmitting: boolean;
  maxQuantity: number;
  mode: 'buy' | 'sell';
  onChangeQuantity: (quantity: number) => void;
  onChangeSellOrderMode?: (mode: 'instant' | 'scheduled') => void;
  onChangeScheduledSellTriggerType?: (triggerType: ScheduledSellTriggerType) => void;
  onChangeScheduledSellTriggerDirection?: (direction: ScheduledSellTriggerDirection) => void;
  onChangeScheduledSellTargetRank?: (rank: number | null) => void;
  onChangeScheduledSellTargetProfitRatePercent?: (profitRatePercent: number | null) => void;
  onClose: () => void;
  onConfirm: () => void;
  quantity: number;
  scheduledSellConditionError?: string | null;
  scheduledSellProfitRatePresets?: readonly number[];
  scheduledSellTriggerType?: ScheduledSellTriggerType;
  scheduledSellTargetRank?: number | null;
  scheduledSellTargetProfitRatePercent?: number | null;
  scheduledSellTriggerDirection?: ScheduledSellTriggerDirection;
  sellOrderMode?: 'instant' | 'scheduled';
  summaryItems: GameTradeModalSummaryItem[];
  summaryNote?: string;
  thumbnailUrl?: string | null;
  title: string;
  unitPointsLabel: string;
}

export default function GameTradeModal({
  confirmLabel,
  currentRankLabel,
  helperText,
  isOpen,
  isInstantSellDisabled = false,
  isSubmitting,
  maxQuantity,
  mode,
  onChangeSellOrderMode,
  onChangeScheduledSellTriggerType,
  onChangeScheduledSellTriggerDirection,
  onChangeScheduledSellTargetRank,
  onChangeScheduledSellTargetProfitRatePercent,
  onClose,
  onConfirm,
  scheduledSellConditionError = null,
  scheduledSellProfitRatePresets = FALLBACK_SCHEDULED_SELL_PROFIT_RATE_PRESETS,
  scheduledSellTriggerType = 'RANK',
  scheduledSellTargetRank = 100,
  scheduledSellTargetProfitRatePercent = FALLBACK_SCHEDULED_SELL_DEFAULT_PROFIT_RATE_PERCENT,
  scheduledSellTriggerDirection = 'RANK_IMPROVES_TO',
  sellOrderMode = 'instant',
  summaryItems,
  summaryNote,
  thumbnailUrl,
  title,
  unitPointsLabel,
}: GameTradeModalProps) {
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
  const modalTitleId = `game-trade-modal-title-${mode}`;
  const normalizedMaxQuantity = normalizeGameOrderCapacity(maxQuantity);
  const isScheduledSellMode = mode === 'sell' && sellOrderMode === 'scheduled';

  if (mode === 'buy') {
    return createPortal(
      <div
        className="app-shell__modal-backdrop app-shell__modal-backdrop--trade"
        onClick={onClose}
        role="presentation"
        style={backdropStyle}
      >
        <section
          aria-labelledby={modalTitleId}
          aria-modal="true"
          className="app-shell__modal app-shell__modal--trade app-shell__modal--trade-receipt"
          data-trade-mode={mode}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          style={modalStyle}
        >
          <BuyTradeReceipt
            bodySwipeHandlers={bodySwipeHandlers}
            confirmLabel={confirmLabel}
            currentRankLabel={currentRankLabel}
            headerSwipeHandlers={headerSwipeHandlers}
            helperText={helperText}
            isSubmitting={isSubmitting}
            modalTitleId={modalTitleId}
            normalizedMaxQuantity={normalizedMaxQuantity}
            onClose={onClose}
            onConfirm={onConfirm}
            summaryItems={summaryItems}
            thumbnailUrl={thumbnailUrl}
            title={title}
            unitPointsLabel={unitPointsLabel}
          />
        </section>
      </div>,
      container,
    );
  }

  return createPortal(
    <div
      className="app-shell__modal-backdrop app-shell__modal-backdrop--trade"
      onClick={onClose}
      role="presentation"
      style={backdropStyle}
    >
      <section
        aria-labelledby={modalTitleId}
        aria-modal="true"
        className="app-shell__modal app-shell__modal--trade app-shell__modal--trade-receipt"
        data-trade-mode={mode}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={modalStyle}
      >
        <SellTradeReceipt
          bodySwipeHandlers={bodySwipeHandlers}
          confirmLabel={confirmLabel}
          currentRankLabel={currentRankLabel}
          headerSwipeHandlers={headerSwipeHandlers}
          isScheduledSellMode={isScheduledSellMode}
          isInstantSellDisabled={isInstantSellDisabled}
          isSubmitting={isSubmitting}
          modalTitleId={modalTitleId}
          normalizedMaxQuantity={normalizedMaxQuantity}
          onChangeSellOrderMode={onChangeSellOrderMode}
          onChangeScheduledSellTargetProfitRatePercent={onChangeScheduledSellTargetProfitRatePercent}
          onChangeScheduledSellTargetRank={onChangeScheduledSellTargetRank}
          onChangeScheduledSellTriggerDirection={onChangeScheduledSellTriggerDirection}
          onChangeScheduledSellTriggerType={onChangeScheduledSellTriggerType}
          onClose={onClose}
          onConfirm={onConfirm}
          scheduledSellConditionError={scheduledSellConditionError}
          scheduledSellProfitRatePresets={scheduledSellProfitRatePresets}
          scheduledSellTargetProfitRatePercent={scheduledSellTargetProfitRatePercent}
          scheduledSellTargetRank={scheduledSellTargetRank}
          scheduledSellTriggerDirection={scheduledSellTriggerDirection}
          scheduledSellTriggerType={scheduledSellTriggerType}
          summaryItems={summaryItems}
          summaryNote={summaryNote}
          thumbnailUrl={thumbnailUrl}
          title={title}
          unitPointsLabel={unitPointsLabel}
        />
      </section>
    </div>,
    container,
  );
}
