import { createPortal } from 'react-dom';
import { getFullscreenElement } from '../utils';

interface GameTradeModalProps {
  confirmLabel: string;
  currentRankLabel: string;
  helperText: string;
  isOpen: boolean;
  isSubmitting: boolean;
  maxQuantity: number;
  mode: 'buy' | 'sell';
  onChangeQuantity: (quantity: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  quantity: number;
  quantityLabel: string;
  thumbnailUrl?: string | null;
  title: string;
  totalPointsLabel: string;
  unitPointsLabel: string;
}

export default function GameTradeModal({
  confirmLabel,
  currentRankLabel,
  helperText,
  isOpen,
  isSubmitting,
  maxQuantity,
  mode,
  onChangeQuantity,
  onClose,
  onConfirm,
  quantity,
  quantityLabel,
  thumbnailUrl,
  title,
  totalPointsLabel,
  unitPointsLabel,
}: GameTradeModalProps) {
  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;
  const modalTitleId = `game-trade-modal-title-${mode}`;
  const normalizedQuantity = Math.max(1, Math.floor(quantity));
  const quickActions =
    maxQuantity > 0
      ? [
          { label: '25%', quantity: Math.max(1, Math.ceil(maxQuantity * 0.25)) },
          { label: '50%', quantity: Math.max(1, Math.ceil(maxQuantity * 0.5)) },
          { label: '전량', quantity: maxQuantity },
        ].filter((action, index, actions) => actions.findIndex((candidate) => candidate.quantity === action.quantity) === index)
      : [];

  return createPortal(
    <div className="app-shell__modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-labelledby={modalTitleId}
        aria-modal="true"
        className="app-shell__modal app-shell__modal--trade"
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
          <button
            aria-label="거래 모달 닫기"
            className="app-shell__modal-close"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>

        <div className="app-shell__modal-body">
          <div className="app-shell__game-trade-modal-head">
            {thumbnailUrl ? <img alt="" className="app-shell__game-trade-modal-thumb" src={thumbnailUrl} /> : null}
            <div className="app-shell__game-trade-modal-copy">
              <p className="app-shell__game-trade-modal-title">{title}</p>
              <p className="app-shell__game-trade-modal-meta">
                현재 {currentRankLabel} · 개당 {unitPointsLabel}
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
                    disabled={isSubmitting || (mode === 'sell' ? normalizedQuantity <= 1 : maxQuantity <= 0)}
                    onClick={() => onChangeQuantity(mode === 'buy' ? normalizedQuantity - 1 : normalizedQuantity - 1)}
                    type="button"
                  >
                    -
                  </button>
                  <input
                    className="app-shell__game-panel-quantity-input"
                    disabled={isSubmitting || maxQuantity <= 0}
                    inputMode="numeric"
                    max={maxQuantity > 0 ? maxQuantity : undefined}
                    min={mode === 'buy' ? 0 : 1}
                    onChange={(event) => {
                      const nextValue = Number.parseInt(event.target.value, 10);
                      onChangeQuantity(Number.isFinite(nextValue) ? nextValue : mode === 'buy' ? 0 : 1);
                    }}
                    type="number"
                    value={normalizedQuantity}
                  />
                  <button
                    className="app-shell__game-panel-quantity-button"
                    disabled={isSubmitting || maxQuantity <= 0 || normalizedQuantity >= maxQuantity}
                    onClick={() => onChangeQuantity(normalizedQuantity + 1)}
                    type="button"
                  >
                    +
                  </button>
                </div>
                <p className="app-shell__game-trade-modal-quantity-note">{quantityLabel}</p>
              </div>
            </div>

            <div className="app-shell__modal-field">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Summary</p>
                <h3 className="app-shell__modal-field-title">{mode === 'buy' ? '주문 요약' : '정리 요약'}</h3>
              </div>
              <div className="app-shell__game-trade-modal-summary">
                <span className="app-shell__game-price-chip">{quantityLabel}</span>
                <span className="app-shell__game-price-chip">{totalPointsLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="app-shell__modal-footer">
          <button
            className="app-shell__modal-action"
            disabled={isSubmitting || maxQuantity <= 0}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    container,
  );
}
