import type { HTMLAttributes } from 'react';
import ThumbnailPlayOverlay from '../../../../components/ThumbnailPlayOverlay/ThumbnailPlayOverlay';
import type { ScheduledSellTriggerDirection, ScheduledSellTriggerType } from '../../../../features/game/types';
import {
  FALLBACK_SCHEDULED_SELL_DEFAULT_PROFIT_RATE_PERCENT,
  FALLBACK_SCHEDULED_SELL_PROFIT_RATE_PRESETS,
} from '../../../../features/game/constants';
import ScheduledSellReceiptFields from './ScheduledSellReceiptFields';
import SellOrderModeTabs from './SellOrderModeTabs';
import type { GameTradeModalSummaryItem } from './types';
import './SellTradeReceipt.css';

interface SellTradeReceiptProps {
  bodySwipeHandlers: HTMLAttributes<HTMLDivElement>;
  confirmLabel: string;
  currentRankLabel: string;
  headerSwipeHandlers: HTMLAttributes<HTMLDivElement>;
  isScheduledSellMode: boolean;
  isInstantSellDisabled: boolean;
  isSubmitting: boolean;
  modalTitleId: string;
  normalizedMaxQuantity: number;
  onChangeSellOrderMode?: (mode: 'instant' | 'scheduled') => void;
  onChangeScheduledSellTargetProfitRatePercent?: (profitRatePercent: number | null) => void;
  onChangeScheduledSellTargetRank?: (rank: number | null) => void;
  onChangeScheduledSellTriggerDirection?: (direction: ScheduledSellTriggerDirection) => void;
  onChangeScheduledSellTriggerType?: (triggerType: ScheduledSellTriggerType) => void;
  onClose: () => void;
  onConfirm: () => void;
  scheduledSellConditionError?: string | null;
  scheduledSellProfitRatePresets?: readonly number[];
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

function getTotalItem(items: GameTradeModalSummaryItem[], isScheduledSellMode: boolean) {
  if (isScheduledSellMode) {
    return items.find((item) => item.label.includes('예약 조건')) ?? items.find((item) => item.label.includes('처리 방식'));
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
  headerSwipeHandlers,
  isScheduledSellMode,
  isInstantSellDisabled,
  isSubmitting,
  modalTitleId,
  normalizedMaxQuantity,
  onChangeSellOrderMode,
  onChangeScheduledSellTargetProfitRatePercent,
  onChangeScheduledSellTargetRank,
  onChangeScheduledSellTriggerDirection,
  onChangeScheduledSellTriggerType,
  onClose,
  onConfirm,
  scheduledSellConditionError = null,
  scheduledSellProfitRatePresets = FALLBACK_SCHEDULED_SELL_PROFIT_RATE_PRESETS,
  scheduledSellTargetProfitRatePercent = FALLBACK_SCHEDULED_SELL_DEFAULT_PROFIT_RATE_PERCENT,
  scheduledSellTargetRank = 100,
  scheduledSellTriggerDirection = 'RANK_IMPROVES_TO',
  scheduledSellTriggerType = 'RANK',
  summaryItems,
  summaryNote,
  thumbnailUrl,
  title,
  unitPointsLabel,
}: SellTradeReceiptProps) {
  const totalItem = getTotalItem(summaryItems, isScheduledSellMode);
  const statItems = summaryItems.slice(0, 2);
  const ledgerItems = summaryItems.slice(2);
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
          isInstantSellDisabled={isInstantSellDisabled}
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
            <span>현재 {currentRankLabel}</span>
          </div>
          <div className="app-shell__game-sell-receipt-price">
            <span>현재가</span>
            <strong>{unitPointsLabel}</strong>
          </div>
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
              profitRatePresets={scheduledSellProfitRatePresets}
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
            <strong>{totalItem?.value ?? '--'}</strong>
          </div>
        ) : null}

        {!isScheduledSellMode && summaryNote ? (
          <div className="app-shell__game-sell-receipt-notice">
            <p>{summaryNote}</p>
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
        YOUTUBE ATLAS | {isScheduledSellMode ? '지금 등록하고 다음 순위 갱신부터 조건을 확인합니다' : '이 거래는 게임 포인트로 진행됩니다'}
      </div>
    </>
  );
}
