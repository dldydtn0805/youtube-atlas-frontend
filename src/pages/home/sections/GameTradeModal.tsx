import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ScheduledSellTriggerDirection, ScheduledSellTriggerType } from '../../../features/game/types';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useHeaderSwipeToClose from '../hooks/useHeaderSwipeToClose';
import {
  GAME_ORDER_QUANTITY_STEP,
  normalizeGameOrderCapacity,
  normalizeGameOrderQuantity,
} from '../gameHelpers';
import { getFullscreenElement } from '../utils';
import BuyTradeReceipt from './GameTradeModal/BuyTradeReceipt';
import SellTradeReceipt from './GameTradeModal/SellTradeReceipt';
import type { GameTradeModalSummaryItem, GameTradeQuickAction } from './GameTradeModal/types';
import './GameTradeModal.css';

interface GameTradeModalProps {
  confirmLabel: string;
  currentRankLabel: string;
  detailContent?: ReactNode;
  helperText: string;
  isOpen: boolean;
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

export function getGameTradeQuickActions(maxQuantity: number): GameTradeQuickAction[] {
  const normalizedMaxQuantity = normalizeGameOrderCapacity(maxQuantity);

  if (normalizedMaxQuantity <= 0) {
    return [];
  }

  const actionsByQuantity = new Map<number, GameTradeQuickAction>();

  [
    {
      label: '10%',
      quantity: Math.max(
        GAME_ORDER_QUANTITY_STEP,
        Math.ceil(normalizedMaxQuantity * 0.1 / GAME_ORDER_QUANTITY_STEP) * GAME_ORDER_QUANTITY_STEP,
      ),
    },
    {
      label: '25%',
      quantity: Math.max(
        GAME_ORDER_QUANTITY_STEP,
        Math.ceil(normalizedMaxQuantity * 0.25 / GAME_ORDER_QUANTITY_STEP) * GAME_ORDER_QUANTITY_STEP,
      ),
    },
    {
      label: '50%',
      quantity: Math.max(
        GAME_ORDER_QUANTITY_STEP,
        Math.ceil(normalizedMaxQuantity * 0.5 / GAME_ORDER_QUANTITY_STEP) * GAME_ORDER_QUANTITY_STEP,
      ),
    },
    { label: '100%', quantity: normalizedMaxQuantity },
  ].forEach((action) => {
    actionsByQuantity.set(action.quantity, action);
  });

  return [...actionsByQuantity.values()];
}

export default function GameTradeModal({
  confirmLabel,
  currentRankLabel,
  detailContent,
  helperText,
  isOpen,
  isSubmitting,
  maxQuantity,
  mode,
  onChangeQuantity,
  onChangeSellOrderMode,
  onChangeScheduledSellTriggerType,
  onChangeScheduledSellTriggerDirection,
  onChangeScheduledSellTargetRank,
  onChangeScheduledSellTargetProfitRatePercent,
  onClose,
  onConfirm,
  quantity,
  scheduledSellConditionError = null,
  scheduledSellTriggerType = 'RANK',
  scheduledSellTargetRank = 100,
  scheduledSellTargetProfitRatePercent = 300,
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
  const normalizedQuantity =
    normalizedMaxQuantity > 0
      ? Math.min(normalizeGameOrderQuantity(quantity), normalizedMaxQuantity)
      : normalizeGameOrderQuantity(quantity);
  const quickActions = getGameTradeQuickActions(normalizedMaxQuantity);
  const isScheduledSellMode = mode === 'sell' && sellOrderMode === 'scheduled';
  const disableQuantityControls = isSubmitting || normalizedMaxQuantity <= 0;

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
            disableQuantityControls={disableQuantityControls}
            headerSwipeHandlers={headerSwipeHandlers}
            helperText={helperText}
            isSubmitting={isSubmitting}
            modalTitleId={modalTitleId}
            normalizedMaxQuantity={normalizedMaxQuantity}
            normalizedQuantity={normalizedQuantity}
            onChangeQuantity={onChangeQuantity}
            onClose={onClose}
            onConfirm={onConfirm}
            quickActions={quickActions}
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
          detailContent={detailContent}
          disableQuantityControls={disableQuantityControls}
          headerSwipeHandlers={headerSwipeHandlers}
          helperText={helperText}
          isScheduledSellMode={isScheduledSellMode}
          isSubmitting={isSubmitting}
          modalTitleId={modalTitleId}
          normalizedMaxQuantity={normalizedMaxQuantity}
          normalizedQuantity={normalizedQuantity}
          onChangeQuantity={onChangeQuantity}
          onChangeSellOrderMode={onChangeSellOrderMode}
          onChangeScheduledSellTargetProfitRatePercent={onChangeScheduledSellTargetProfitRatePercent}
          onChangeScheduledSellTargetRank={onChangeScheduledSellTargetRank}
          onChangeScheduledSellTriggerDirection={onChangeScheduledSellTriggerDirection}
          onChangeScheduledSellTriggerType={onChangeScheduledSellTriggerType}
          onClose={onClose}
          onConfirm={onConfirm}
          quickActions={quickActions}
          scheduledSellConditionError={scheduledSellConditionError}
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
