import type { HTMLAttributes, ReactNode } from 'react';
import ThumbnailPlayOverlay from '../../../../components/ThumbnailPlayOverlay/ThumbnailPlayOverlay';
import type { ScheduledSellTriggerDirection, ScheduledSellTriggerType } from '../../../../features/game/types';
import {
  GAME_ORDER_QUANTITY_STEP,
  formatGameOrderQuantity,
  parseGameOrderQuantityInput,
  toDisplayGameOrderQuantity,
} from '../../gameHelpers';
import ScheduledSellReceiptFields from './ScheduledSellReceiptFields';
import SellOrderModeTabs from './SellOrderModeTabs';
import type { GameTradeModalSummaryItem, GameTradeQuickAction } from './types';
import './SellTradeReceipt.css';

interface SellTradeReceiptProps {
  bodySwipeHandlers: HTMLAttributes<HTMLDivElement>;
  confirmLabel: string;
  currentRankLabel: string;
  detailContent?: ReactNode;
  disableQuantityControls: boolean;
  headerSwipeHandlers: HTMLAttributes<HTMLDivElement>;
  helperText: string;
  isScheduledSellMode: boolean;
  isSubmitting: boolean;
  modalTitleId: string;
  normalizedMaxQuantity: number;
  normalizedQuantity: number;
  onChangeQuantity: (quantity: number) => void;
  onChangeSellOrderMode?: (mode: 'instant' | 'scheduled') => void;
  onChangeScheduledSellTargetProfitRatePercent?: (profitRatePercent: number | null) => void;
  onChangeScheduledSellTargetRank?: (rank: number | null) => void;
  onChangeScheduledSellTriggerDirection?: (direction: ScheduledSellTriggerDirection) => void;
  onChangeScheduledSellTriggerType?: (triggerType: ScheduledSellTriggerType) => void;
  onClose: () => void;
  onConfirm: () => void;
  quickActions: GameTradeQuickAction[];
  scheduledSellConditionError?: string | null;
  scheduledSellTargetProfitRatePercent?: number | null;
  scheduledSellTargetRank?: number | null;
  scheduledSellTriggerDirection?: ScheduledSellTriggerDirection;
  scheduledSellTriggerType?: ScheduledSellTriggerType;
  summaryItems: GameTradeModalSummaryItem[];
  summaryNote?: string;
  thumbnailUrl?: string | null;
  title: string;
  unitPointsLabel: string;
}

function clampSellQuantity(quantity: number, maxQuantity: number) {
  if (maxQuantity <= 0) {
    return GAME_ORDER_QUANTITY_STEP;
  }

  return Math.max(GAME_ORDER_QUANTITY_STEP, Math.min(maxQuantity, quantity));
}

function getTotalItem(items: GameTradeModalSummaryItem[], isScheduledSellMode: boolean) {
  if (isScheduledSellMode) {
    return items.find((item) => item.label.includes('대상')) ?? items.find((item) => item.label.includes('수량'));
  }

  return items.find((item) => item.label.includes('정산')) ?? items.find((item) => item.label.includes('매도'));
}

function getValueClassName(tone?: GameTradeModalSummaryItem['tone']) {
  return tone ? `app-shell__game-sell-receipt-value app-shell__game-sell-receipt-value--${tone}` : 'app-shell__game-sell-receipt-value';
}

export default function SellTradeReceipt({
  bodySwipeHandlers,
  confirmLabel,
  currentRankLabel,
  detailContent,
  disableQuantityControls,
  headerSwipeHandlers,
  helperText,
  isScheduledSellMode,
  isSubmitting,
  modalTitleId,
  normalizedMaxQuantity,
  normalizedQuantity,
  onChangeQuantity,
  onChangeSellOrderMode,
  onChangeScheduledSellTargetProfitRatePercent,
  onChangeScheduledSellTargetRank,
  onChangeScheduledSellTriggerDirection,
  onChangeScheduledSellTriggerType,
  onClose,
  onConfirm,
  quickActions,
  scheduledSellConditionError = null,
  scheduledSellTargetProfitRatePercent = 300,
  scheduledSellTargetRank = 100,
  scheduledSellTriggerDirection = 'RANK_IMPROVES_TO',
  scheduledSellTriggerType = 'RANK',
  summaryItems,
  summaryNote,
  thumbnailUrl,
  title,
  unitPointsLabel,
}: SellTradeReceiptProps) {
  const previousQuantity = clampSellQuantity(normalizedQuantity - GAME_ORDER_QUANTITY_STEP, normalizedMaxQuantity);
  const nextQuantity = clampSellQuantity(normalizedQuantity + GAME_ORDER_QUANTITY_STEP, normalizedMaxQuantity);
  const totalItem = getTotalItem(summaryItems, isScheduledSellMode);
  const statItems = isScheduledSellMode ? summaryItems.slice(0, 2) : summaryItems.slice(0, 6);
  const ledgerItems = isScheduledSellMode ? [] : summaryItems.slice(6);
  const canEditSchedule =
    onChangeScheduledSellTriggerType &&
    onChangeScheduledSellTargetRank &&
    onChangeScheduledSellTargetProfitRatePercent &&
    onChangeScheduledSellTriggerDirection;

  return (
    <>
      <div className="app-shell__modal-header app-shell__game-sell-receipt-head app-shell__modal-header--swipe-close" {...headerSwipeHandlers}>
        <p className="app-shell__game-sell-receipt-eyebrow">SELL ORDER</p>
        <h2 className="app-shell__game-sell-receipt-title" id={modalTitleId}>
          매도 주문서
        </h2>
        <p className="app-shell__game-sell-receipt-meta">YOUTUBE ATLAS | GAME POINT ORDER</p>
        <SellOrderModeTabs
          isScheduledSellMode={isScheduledSellMode}
          isSubmitting={isSubmitting}
          onChangeSellOrderMode={onChangeSellOrderMode}
        />
      </div>

      <div className="app-shell__modal-body app-shell__game-sell-receipt-body" {...bodySwipeHandlers}>
        <section className="app-shell__game-sell-receipt-item" aria-label="매도 대상">
          {thumbnailUrl ? (
            <span className="thumbnail-play-overlay-host app-shell__game-sell-receipt-thumb">
              <img alt="" src={thumbnailUrl} />
              <ThumbnailPlayOverlay />
            </span>
          ) : null}
          <div className="app-shell__game-sell-receipt-item-copy">
            <p className="app-shell__game-sell-receipt-label">ITEM</p>
            <strong>{title}</strong>
            <span>현재 {currentRankLabel} | 1개당 {unitPointsLabel}</span>
          </div>
          <div className="app-shell__game-sell-receipt-price">
            <span>현재가</span>
            <strong>{unitPointsLabel}</strong>
          </div>
        </section>

        <section className="app-shell__game-sell-receipt-section" aria-label="매도 수량">
          <p className="app-shell__game-sell-receipt-label">QUANTITY</p>
          <p className="app-shell__game-sell-receipt-help">{helperText}</p>
          <div className="app-shell__game-sell-receipt-quantity">
            <button disabled={disableQuantityControls} onClick={() => onChangeQuantity(previousQuantity)} type="button">
              -
            </button>
            <input
              aria-label="매도 수량"
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
            <div className="app-shell__game-sell-receipt-pcts">
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
          <p className="app-shell__game-sell-receipt-hint">
            1개 단위로만 주문할 수 있습니다. 현재 선택: {formatGameOrderQuantity(normalizedQuantity)}
          </p>
        </section>

        {isScheduledSellMode && canEditSchedule ? (
          <section className="app-shell__game-sell-receipt-section app-shell__game-sell-receipt-schedule" aria-label="예약 조건">
            <p className="app-shell__game-sell-receipt-label">TRIGGER - 예약 조건</p>
            <ScheduledSellReceiptFields
              conditionError={scheduledSellConditionError}
              disabled={isSubmitting}
              onChangeTargetProfitRatePercent={onChangeScheduledSellTargetProfitRatePercent}
              onChangeTargetRank={onChangeScheduledSellTargetRank}
              onChangeTriggerDirection={onChangeScheduledSellTriggerDirection}
              onChangeTriggerType={onChangeScheduledSellTriggerType}
              targetProfitRatePercent={scheduledSellTargetProfitRatePercent}
              targetRank={scheduledSellTargetRank}
              triggerDirection={scheduledSellTriggerDirection}
              triggerType={scheduledSellTriggerType}
            />
          </section>
        ) : null}

        <section className="app-shell__game-sell-receipt-section" aria-label="매도 요약">
          <p className="app-shell__game-sell-receipt-label">SUMMARY</p>
          <dl className="app-shell__game-sell-receipt-stats">
            {statItems.map((item) => (
              <div key={`${item.label}-${item.value}`}>
                <dt>{item.label}</dt>
                <dd className={getValueClassName(item.tone)}>{item.value}</dd>
              </div>
            ))}
          </dl>
          {ledgerItems.length > 0 ? (
            <dl className="app-shell__game-sell-receipt-ledger">
              {ledgerItems.map((item) => (
                <div key={`${item.label}-${item.value}`}>
                  <dt>{item.label}</dt>
                  <dd className={getValueClassName(item.tone)}>{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        {!isScheduledSellMode ? (
          <div className="app-shell__game-sell-receipt-total">
            <span>TOTAL</span>
            <strong>{totalItem?.value ?? formatGameOrderQuantity(normalizedQuantity)}</strong>
          </div>
        ) : null}

        {!isScheduledSellMode && (summaryNote || detailContent) ? (
          <div className="app-shell__game-sell-receipt-notice">
            {summaryNote ? <p>{summaryNote}</p> : null}
            {detailContent}
          </div>
        ) : null}

        <div className="app-shell__game-sell-receipt-actions">
          <button
            className="app-shell__game-sell-receipt-sell"
            disabled={isSubmitting || normalizedMaxQuantity <= 0 || Boolean(scheduledSellConditionError)}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? '처리 중...' : confirmLabel}
          </button>
          <button className="app-shell__game-sell-receipt-close" onClick={onClose} type="button">
            닫기
          </button>
        </div>
      </div>

      <div className="app-shell__game-sell-receipt-foot">
        YOUTUBE ATLAS | {isScheduledSellMode ? '예약 매도는 차트 동기화 시 자동 체결됩니다' : '이 거래는 게임 포인트로 진행됩니다'}
      </div>
    </>
  );
}
