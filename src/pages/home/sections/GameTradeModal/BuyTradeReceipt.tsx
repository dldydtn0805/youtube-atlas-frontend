import type { HTMLAttributes } from 'react';
import ThumbnailPlayOverlay from '../../../../components/ThumbnailPlayOverlay/ThumbnailPlayOverlay';
import {
  GAME_ORDER_QUANTITY_STEP,
  formatGameOrderQuantity,
  parseGameOrderQuantityInput,
  toDisplayGameOrderQuantity,
} from '../../gameHelpers';
import type { GameTradeModalSummaryItem, GameTradeQuickAction } from './types';
import './BuyTradeReceipt.css';

interface BuyTradeReceiptProps {
  bodySwipeHandlers: HTMLAttributes<HTMLDivElement>;
  confirmLabel: string;
  currentRankLabel: string;
  disableQuantityControls: boolean;
  headerSwipeHandlers: HTMLAttributes<HTMLDivElement>;
  helperText: string;
  isSubmitting: boolean;
  modalTitleId: string;
  normalizedMaxQuantity: number;
  normalizedQuantity: number;
  onChangeQuantity: (quantity: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  quickActions: GameTradeQuickAction[];
  summaryItems: GameTradeModalSummaryItem[];
  thumbnailUrl?: string | null;
  title: string;
  unitPointsLabel: string;
}

function getBuyReceiptTotal(items: GameTradeModalSummaryItem[]) {
  return items.find((item) => item.label.includes('총')) ?? items[items.length - 1];
}

function clampBuyQuantity(quantity: number, maxQuantity: number) {
  if (maxQuantity <= 0) {
    return GAME_ORDER_QUANTITY_STEP;
  }

  return Math.max(GAME_ORDER_QUANTITY_STEP, Math.min(maxQuantity, quantity));
}

export default function BuyTradeReceipt({
  bodySwipeHandlers,
  confirmLabel,
  currentRankLabel,
  disableQuantityControls,
  headerSwipeHandlers,
  helperText,
  isSubmitting,
  modalTitleId,
  normalizedMaxQuantity,
  normalizedQuantity,
  onChangeQuantity,
  onClose,
  onConfirm,
  quickActions,
  summaryItems,
  thumbnailUrl,
  title,
  unitPointsLabel,
}: BuyTradeReceiptProps) {
  const totalItem = getBuyReceiptTotal(summaryItems);
  const previousQuantity = clampBuyQuantity(normalizedQuantity - GAME_ORDER_QUANTITY_STEP, normalizedMaxQuantity);
  const nextQuantity = clampBuyQuantity(normalizedQuantity + GAME_ORDER_QUANTITY_STEP, normalizedMaxQuantity);

  return (
    <>
      <div className="app-shell__game-buy-receipt-head app-shell__modal-header--swipe-close" {...headerSwipeHandlers}>
        <p className="app-shell__game-buy-receipt-eyebrow">BUY ORDER</p>
        <h2 className="app-shell__game-buy-receipt-title" id={modalTitleId}>
          매수 주문서
        </h2>
        <p className="app-shell__game-buy-receipt-meta">YOUTUBE ATLAS | GAME POINT ORDER</p>
      </div>

      <div className="app-shell__game-buy-receipt-body app-shell__modal-body" {...bodySwipeHandlers}>
        <section className="app-shell__game-buy-receipt-item" aria-label="매수 대상">
          {thumbnailUrl ? (
            <span className="thumbnail-play-overlay-host app-shell__game-buy-receipt-thumb">
              <img alt="" src={thumbnailUrl} />
              <ThumbnailPlayOverlay />
            </span>
          ) : null}
          <div className="app-shell__game-buy-receipt-item-copy">
            <p className="app-shell__game-buy-receipt-label">ITEM</p>
            <strong className="app-shell__game-buy-receipt-item-name">{title}</strong>
            <span className="app-shell__game-buy-receipt-rank">{currentRankLabel} -&gt; ??? 랭크</span>
          </div>
          <div className="app-shell__game-buy-receipt-unit">
            <span>단가</span>
            <strong>{unitPointsLabel}</strong>
          </div>
        </section>

        <section className="app-shell__game-buy-receipt-section" aria-label="매수 수량">
          <p className="app-shell__game-buy-receipt-label">QUANTITY</p>
          <div className="app-shell__game-buy-receipt-quantity">
            <button disabled={disableQuantityControls} onClick={() => onChangeQuantity(previousQuantity)} type="button">
              -
            </button>
            <input
              aria-label="매수 수량"
              disabled={disableQuantityControls}
              inputMode="numeric"
              max={normalizedMaxQuantity > 0 ? toDisplayGameOrderQuantity(normalizedMaxQuantity) : undefined}
              min={1}
              onChange={(event) => onChangeQuantity(parseGameOrderQuantityInput(Number(event.target.value)))}
              step="1"
              type="number"
              value={toDisplayGameOrderQuantity(normalizedQuantity)}
            />
            <button disabled={disableQuantityControls} onClick={() => onChangeQuantity(nextQuantity)} type="button">
              +
            </button>
          </div>
          {quickActions.length > 0 ? (
            <div className="app-shell__game-buy-receipt-pcts">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  data-active={action.quantity === normalizedQuantity}
                  disabled={disableQuantityControls}
                  onClick={() => onChangeQuantity(action.quantity)}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
          <p className="app-shell__game-buy-receipt-hint">
            1개 단위로만 주문할 수 있습니다. 현재 선택: {formatGameOrderQuantity(normalizedQuantity)}
          </p>
          <p className="app-shell__game-buy-receipt-help">{helperText}</p>
        </section>

        <section className="app-shell__game-buy-receipt-section" aria-label="매수 요약">
          <p className="app-shell__game-buy-receipt-label">SUMMARY</p>
          <dl className="app-shell__game-buy-receipt-ledger">
            {summaryItems.map((item) => (
              <div key={`${item.label}-${item.value}`}>
                <dt>{item.label}</dt>
                <dd data-tone={item.tone}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="app-shell__game-buy-receipt-total">
          <span>TOTAL</span>
          <strong>{totalItem?.value ?? unitPointsLabel}</strong>
        </div>

        <div className="app-shell__game-buy-receipt-actions">
          <button
            className="app-shell__game-buy-receipt-buy"
            disabled={isSubmitting || normalizedMaxQuantity <= 0}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? '처리 중...' : confirmLabel}
          </button>
          <button className="app-shell__game-buy-receipt-close" onClick={onClose} type="button">
            닫기
          </button>
        </div>
      </div>

      <div className="app-shell__game-buy-receipt-foot">YOUTUBE ATLAS | 이 거래는 게임 포인트로 진행됩니다</div>
    </>
  );
}
