import { useState } from 'react';
import type { GameScheduledSellOrder } from '../../../features/game/types';
import {
  formatGameOrderQuantity,
  formatGameTimestamp,
  formatMaybePoints,
  formatPoints,
  formatRank,
  getPointTone,
} from '../gameHelpers';

interface GameScheduledSellOrdersTabProps {
  emptyMessage?: string | null;
  isCancelingOrderId?: number | null;
  isLoading: boolean;
  onCancelOrder?: (orderId: number) => void;
  orders: GameScheduledSellOrder[];
}

type ScheduledSellOrderFilter = 'ALL' | 'PENDING' | 'EXECUTED' | 'CANCELED';

const SCHEDULED_SELL_ORDER_FILTERS: Array<{ label: string; value: ScheduledSellOrderFilter }> = [
  { label: '전체', value: 'ALL' },
  { label: '대기', value: 'PENDING' },
  { label: '완료', value: 'EXECUTED' },
  { label: '취소', value: 'CANCELED' },
];

function getScheduledSellStatusLabel(status: GameScheduledSellOrder['status']) {
  if (status === 'PENDING') {
    return '대기중';
  }

  if (status === 'EXECUTED') {
    return '완료';
  }

  if (status === 'CANCELED') {
    return '취소';
  }

  return '실패';
}

function getScheduledSellStatusTone(status: GameScheduledSellOrder['status']) {
  if (status === 'PENDING') {
    return 'info';
  }

  if (status === 'EXECUTED') {
    return 'success';
  }

  if (status === 'CANCELED') {
    return 'neutral';
  }

  return 'danger';
}

function getScheduledSellConditionLabel(order: GameScheduledSellOrder) {
  return order.triggerDirection === 'RANK_DROPS_TO'
    ? `${formatRank(order.targetRank)} 이하 이탈`
    : `${formatRank(order.targetRank)} 이내 진입`;
}

function getScheduledSellOrdersByFilter(
  orders: GameScheduledSellOrder[],
  filter: ScheduledSellOrderFilter,
) {
  if (filter === 'ALL') {
    return orders;
  }

  return orders.filter((order) => order.status === filter);
}

function getScheduledSellEmptyMessage(filter: ScheduledSellOrderFilter, defaultMessage: string) {
  if (filter === 'PENDING') {
    return defaultMessage;
  }

  if (filter === 'EXECUTED') {
    return '완료된 예약 매도 주문이 아직 없습니다.';
  }

  if (filter === 'CANCELED') {
    return '취소된 예약 매도 주문이 아직 없습니다.';
  }

  return '예약 매도 주문이 아직 없습니다.';
}

export default function GameScheduledSellOrdersTab({
  emptyMessage = '예약 매도 주문이 아직 없습니다.',
  isCancelingOrderId = null,
  isLoading,
  onCancelOrder,
  orders,
}: GameScheduledSellOrdersTabProps) {
  const [activeFilter, setActiveFilter] = useState<ScheduledSellOrderFilter>('PENDING');
  const filteredOrders = getScheduledSellOrdersByFilter(orders, activeFilter);

  return (
    <div className="app-shell__game-scheduled-orders">
      <div className="app-shell__game-scheduled-order-filters" aria-label="예약 주문 상태 필터" role="tablist">
        {SCHEDULED_SELL_ORDER_FILTERS.map((filter) => (
          <button
            key={filter.value}
            aria-selected={activeFilter === filter.value}
            className="app-shell__game-scheduled-order-filter"
            data-active={activeFilter === filter.value}
            onClick={() => setActiveFilter(filter.value)}
            role="tab"
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="app-shell__game-tab-loading-shell" data-loading={isLoading}>
        {isLoading ? (
          <div className="app-shell__game-tab-loading-overlay" role="status" aria-live="polite">
            <span className="app-shell__game-tab-loading-spinner" aria-hidden="true" />
            <span className="sr-only">예약 매도 주문 불러오는 중</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          emptyMessage ? (
            <p className="app-shell__game-empty app-shell__game-empty--panel-centered">{getScheduledSellEmptyMessage(activeFilter, emptyMessage)}</p>
          ) : null
        ) : (
          <ul className="app-shell__game-positions">
            {filteredOrders.map((order) => {
              const canCancel = order.status === 'PENDING' && Boolean(onCancelOrder);
              const isCanceling = isCancelingOrderId === order.id;

              return (
                <li
                  key={order.id}
                  aria-busy={isCanceling}
                  className="app-shell__game-position"
                  data-scheduled-status={order.status}
                >
                  {isCanceling ? (
                    <div className="app-shell__game-position-overlay" role="status" aria-live="polite">
                      <span className="app-shell__game-position-overlay-spinner" aria-hidden="true" />
                      <span className="app-shell__game-position-overlay-label">예약 취소 처리 중</span>
                    </div>
                  ) : null}
                  <div className="app-shell__game-position-select">
                  <img
                    alt=""
                    className="app-shell__game-position-thumb"
                    loading="lazy"
                    src={order.thumbnailUrl}
                  />
                  <div className="app-shell__game-position-copy">
                    <div className="app-shell__game-position-heading">
                      <p className="app-shell__game-position-title">{order.videoTitle}</p>
                    </div>
                    <p className="app-shell__game-position-channel">{order.channelTitle}</p>
                    <p className="app-shell__game-position-meta">
                      <span className="app-shell__game-position-meta-label">조건</span>{' '}
                      <span>{getScheduledSellConditionLabel(order)}</span>
                      {' · '}
                      <span className="app-shell__game-position-meta-label">현재</span>{' '}
                      <span>{formatRank(order.currentRank)}</span>
                      {' · '}
                      <span className="app-shell__game-position-meta-label">수량</span>{' '}
                      <span>{formatGameOrderQuantity(order.quantity)}</span>
                      {' · '}
                      <span className="app-shell__game-position-meta-label">생성</span>{' '}
                      <span>{formatGameTimestamp(order.createdAt)}</span>
                    </p>
                    <div className="app-shell__game-position-detail">
                      <span className="app-shell__game-position-detail-badges">
                        <span
                          className="app-shell__game-position-trend"
                          data-tone={getScheduledSellStatusTone(order.status)}
                        >
                          {getScheduledSellStatusLabel(order.status)}
                        </span>
                        {typeof order.settledPoints === 'number' ? (
                          <span className="app-shell__game-position-trend" data-tone="steady">
                            정산 {formatMaybePoints(order.settledPoints)}
                          </span>
                        ) : null}
                        {typeof order.pnlPoints === 'number' ? (
                          <span className="app-shell__game-position-trend" data-tone={getPointTone(order.pnlPoints)}>
                            손익 {formatPoints(order.pnlPoints)}
                          </span>
                        ) : null}
                      </span>
                      {order.failureReason ? (
                        <p className="app-shell__game-position-detail-copy">{order.failureReason}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="app-shell__game-position-side">
                  <div
                    className="app-shell__game-position-actions app-shell__game-position-actions--scheduled"
                    aria-label={`${order.videoTitle} 예약 매도`}
                  >
                    <button
                      className="app-shell__game-position-action app-shell__game-position-action--scheduled"
                      data-variant="sell"
                      disabled={!canCancel || isCanceling}
                      onClick={() => onCancelOrder?.(order.id)}
                      type="button"
                    >
                      <span className="app-shell__game-position-action-label">
                        {isCanceling ? '취소 중' : '예약 취소'}
                      </span>
                    </button>
                  </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
