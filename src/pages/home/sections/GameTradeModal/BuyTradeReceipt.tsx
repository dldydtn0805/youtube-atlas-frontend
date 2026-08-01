import type { HTMLAttributes } from 'react';
import ThumbnailPlayOverlay from '../../../../components/ThumbnailPlayOverlay/ThumbnailPlayOverlay';
import type { GameTradeModalSummaryItem } from './types';
import './BuyTradeReceipt.css';

interface BuyTradeReceiptProps {
  bodySwipeHandlers: HTMLAttributes<HTMLDivElement>;
  confirmLabel: string;
  currentRankLabel: string;
  headerSwipeHandlers: HTMLAttributes<HTMLDivElement>;
  helperText: string;
  isSubmitting: boolean;
  modalTitleId: string;
  normalizedMaxQuantity: number;
  onClose: () => void;
  onConfirm: () => void;
  summaryItems: GameTradeModalSummaryItem[];
  thumbnailUrl?: string | null;
  title: string;
  unitPointsLabel: string;
}

function getBuyReceiptTotal(items: GameTradeModalSummaryItem[]) {
  return items.find((item) => item.label.includes('총')) ?? items[items.length - 1];
}

export default function BuyTradeReceipt({
  bodySwipeHandlers,
  confirmLabel,
  currentRankLabel,
  headerSwipeHandlers,
  helperText,
  isSubmitting,
  modalTitleId,
  normalizedMaxQuantity,
  onClose,
  onConfirm,
  summaryItems,
  thumbnailUrl,
  title,
  unitPointsLabel,
}: BuyTradeReceiptProps) {
  const totalItem = getBuyReceiptTotal(summaryItems);

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
          <output className="app-shell__game-buy-receipt-fixed-quantity" aria-label="고정 매수 수량">
            1개
          </output>
          <p className="app-shell__game-buy-receipt-hint">영상마다 1개만 매수할 수 있습니다.</p>
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
