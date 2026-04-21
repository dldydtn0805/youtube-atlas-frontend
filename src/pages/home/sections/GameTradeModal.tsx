import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_GAME_QUANTITY,
  GAME_ORDER_QUANTITY_STEP,
  formatGameOrderQuantity,
  parseGameOrderQuantityInput,
  toDisplayGameOrderQuantity,
  normalizeGameOrderCapacity,
  normalizeGameOrderQuantity,
} from '../gameHelpers';
import { getFullscreenElement } from '../utils';
import './GameTradeModal.css';

interface GameTradeModalSummaryItem {
  label: string;
  tone?: 'flat' | 'gain' | 'loss';
  value: string;
}

interface GameTradeQuickAction {
  label: string;
  quantity: number;
}

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
  onClose: () => void;
  onConfirm: () => void;
  quantity: number;
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
  onClose,
  onConfirm,
  quantity,
  summaryItems,
  summaryNote,
  thumbnailUrl,
  title,
  unitPointsLabel,
}: GameTradeModalProps) {
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
  const previousQuantity =
    normalizedQuantity <= GAME_ORDER_QUANTITY_STEP ? normalizedMaxQuantity : normalizedQuantity - GAME_ORDER_QUANTITY_STEP;
  const nextQuantity =
    normalizedQuantity >= normalizedMaxQuantity ? GAME_ORDER_QUANTITY_STEP : normalizedQuantity + GAME_ORDER_QUANTITY_STEP;
  const displayQuantity = toDisplayGameOrderQuantity(normalizedQuantity);
  const quickActions = getGameTradeQuickActions(normalizedMaxQuantity);

  return createPortal(
    <div className="app-shell__modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-labelledby={modalTitleId}
        aria-modal="true"
        className="app-shell__modal app-shell__modal--trade"
        data-trade-mode={mode}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="app-shell__modal-header">
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">{mode === 'buy' ? 'Buy Position' : 'Sell Position'}</p>
            <h2 className="app-shell__section-title" id={modalTitleId}>
              {mode === 'buy' ? '몇 개 매수할까요?' : '몇 개 매도할까요?'}
            </h2>
          </div>
        </div>

        <div className="app-shell__modal-body">
          <div className="app-shell__game-trade-modal-head">
            {thumbnailUrl ? <img alt="" className="app-shell__game-trade-modal-thumb" src={thumbnailUrl} /> : null}
            <div className="app-shell__game-trade-modal-copy">
              <p className="app-shell__game-trade-modal-title">{title}</p>
              <p className="app-shell__game-trade-modal-meta">
                현재 {currentRankLabel} · 1개당 {unitPointsLabel}
              </p>
            </div>
          </div>

          <div className="app-shell__modal-fields">
            <div className="app-shell__modal-field">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Quantity</p>
                <h3 className="app-shell__modal-field-title">수량</h3>
              </div>
              <p className="app-shell__modal-field-copy">{helperText}</p>
              <div className="app-shell__game-trade-modal-controls">
                {quickActions.length > 0 ? (
                  <div className="app-shell__game-trade-modal-quick-actions">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        className="app-shell__game-trade-modal-quick-action"
                        data-active={action.quantity === normalizedQuantity}
                        disabled={isSubmitting || maxQuantity <= 0}
                        onClick={() => onChangeQuantity(action.quantity)}
                        type="button"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="app-shell__game-panel-quantity">
                  <button
                    className="app-shell__game-panel-quantity-button"
                    disabled={isSubmitting || normalizedMaxQuantity <= 0}
                    onClick={() => onChangeQuantity(previousQuantity)}
                    type="button"
                  >
                    -
                  </button>
                  <input
                    className="app-shell__game-panel-quantity-input"
                    disabled={isSubmitting || normalizedMaxQuantity <= 0}
                    inputMode="numeric"
                    max={normalizedMaxQuantity > 0 ? toDisplayGameOrderQuantity(normalizedMaxQuantity) : undefined}
                    min={mode === 'buy' ? 0 : toDisplayGameOrderQuantity(GAME_ORDER_QUANTITY_STEP)}
                    onChange={(event) => {
                      const nextValue = Number.parseInt(event.target.value, 10);
                      onChangeQuantity(
                        Number.isFinite(nextValue)
                          ? parseGameOrderQuantityInput(nextValue)
                          : mode === 'buy'
                            ? 0
                            : DEFAULT_GAME_QUANTITY,
                      );
                    }}
                    step="1"
                    type="number"
                    value={displayQuantity}
                  />
                  <button
                    className="app-shell__game-panel-quantity-button"
                    disabled={isSubmitting || normalizedMaxQuantity <= 0}
                    onClick={() => onChangeQuantity(nextQuantity)}
                    type="button"
                  >
                    +
                  </button>
                </div>
                <p className="app-shell__modal-field-copy">1개 단위로만 주문할 수 있습니다. 현재 선택: {formatGameOrderQuantity(normalizedQuantity)}</p>
              </div>
            </div>

            <div className="app-shell__modal-field">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Summary</p>
                <h3 className="app-shell__modal-field-title">{mode === 'buy' ? '주문 요약' : '정리 요약'}</h3>
              </div>
              <dl className="app-shell__game-trade-modal-summary">
                {summaryItems.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="app-shell__game-trade-modal-summary-item">
                    <dt className="app-shell__game-trade-modal-summary-label">{item.label}</dt>
                    <dd className="app-shell__game-trade-modal-summary-value" data-tone={item.tone}>
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
              {summaryNote ? <p className="app-shell__game-trade-modal-quantity-note">{summaryNote}</p> : null}
              {detailContent ? <div className="app-shell__game-trade-modal-detail">{detailContent}</div> : null}
            </div>
          </div>
        </div>

        <div className="app-shell__modal-footer app-shell__modal-footer--trade-actions">
          <button
            className="app-shell__modal-action"
            disabled={isSubmitting || normalizedMaxQuantity <= 0}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? '처리 중...' : confirmLabel}
          </button>
          <button
            aria-label="거래 모달 닫기"
            className="app-shell__modal-close"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>
      </section>
    </div>,
    container,
  );
}
