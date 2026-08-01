import { useEffect, useRef, useState } from 'react';
import ThumbnailPlayOverlay from '../../../components/ThumbnailPlayOverlay/ThumbnailPlayOverlay';
import type { GameScheduledSellOrder } from '../../../features/game/types';
import {
  formatGameTimestamp,
  formatMaybePoints,
  formatPercent,
  formatPoints,
  formatRank,
  getPointTone,
} from '../gameHelpers';
import { SCHEDULED_SELL_ORDERS_QUEUE_ID } from '../utils';

interface GameScheduledSellOrdersTabProps {
  activePlaybackQueueId?: string;
  emptyMessage?: string | null;
  focusedOrderRequest?: ScheduledSellOrderFocusRequest | null;
  isActive?: boolean;
  isCancelingOrderId?: number | null;
  isLoading: boolean;
  onCancelOrder?: (orderId: number) => void;
  onOpenChart?: (order: GameScheduledSellOrder) => void;
  onSelectOrderVideo?: (order: GameScheduledSellOrder) => void;
  orders: GameScheduledSellOrder[];
  selectedOrderId?: number | null;
  selectedVideoId?: string;
}

export interface ScheduledSellOrderFocusRequest {
  orderId: number;
  positionId?: number;
  requestId: number;
}

type ScheduledSellOrderFilter = 'ALL' | 'PENDING' | 'EXECUTED' | 'CANCELED';

const SCHEDULED_SELL_ORDER_FILTERS: Array<{ label: string; value: ScheduledSellOrderFilter }> = [
  { label: '전체', value: 'ALL' },
  { label: '대기', value: 'PENDING' },
  { label: '완료', value: 'EXECUTED' },
  { label: '취소', value: 'CANCELED' },
];
const SCHEDULED_SELL_FOCUS_SCROLL_OFFSET = 12;

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
  if (order.triggerType === 'PROFIT_RATE') {
    return typeof order.targetProfitRatePercent === 'number'
      ? `수익률 +${formatPercent(order.targetProfitRatePercent)} 도달`
      : '수익률 조건 도달';
  }

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

function getScheduledSellFocusFilter(status: GameScheduledSellOrder['status']): ScheduledSellOrderFilter {
  return status === 'FAILED' ? 'ALL' : status;
}

function getFocusedScheduledSellOrder(
  orders: GameScheduledSellOrder[],
  request?: ScheduledSellOrderFocusRequest | null,
) {
  if (!request) {
    return null;
  }

  return (
    orders.find((order) => order.id === request.orderId) ??
    (typeof request.positionId === 'number'
      ? orders.find((order) => order.status === 'PENDING' && order.positionId === request.positionId)
      : undefined) ??
    null
  );
}

function scrollScheduledOrderIntoView(orderElement: HTMLElement) {
  const scrollContainer = orderElement.closest<HTMLElement>('.app-shell__game-tab-slide-panel');

  if (!scrollContainer) {
    return;
  }

  scrollContainer.scrollTop = Math.max(0, orderElement.offsetTop - SCHEDULED_SELL_FOCUS_SCROLL_OFFSET);
}

function scheduleScheduledOrderScroll(orderElement: HTMLElement) {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    scrollScheduledOrderIntoView(orderElement);
    return undefined;
  }

  let nextAnimationFrameId: number | null = null;
  const animationFrameId = window.requestAnimationFrame(() => {
    nextAnimationFrameId = window.requestAnimationFrame(() => {
      scrollScheduledOrderIntoView(orderElement);
    });
  });

  return () => {
    window.cancelAnimationFrame(animationFrameId);

    if (nextAnimationFrameId != null) {
      window.cancelAnimationFrame(nextAnimationFrameId);
    }
  };
}

export default function GameScheduledSellOrdersTab({
  activePlaybackQueueId,
  emptyMessage = '예약 매도 주문이 아직 없습니다.',
  focusedOrderRequest,
  isActive = true,
  isCancelingOrderId = null,
  isLoading,
  onCancelOrder,
  onOpenChart,
  onSelectOrderVideo,
  orders,
  selectedOrderId,
  selectedVideoId,
}: GameScheduledSellOrdersTabProps) {
  const [activeFilter, setActiveFilter] = useState<ScheduledSellOrderFilter>('PENDING');
  const activeFilterRef = useRef(activeFilter);
  const focusedOrderRef = useRef<HTMLLIElement | null>(null);
  const focusedOrder = getFocusedScheduledSellOrder(orders, focusedOrderRequest);
  const focusedOrderId = focusedOrder?.id ?? focusedOrderRequest?.orderId ?? null;
  const filteredOrders = getScheduledSellOrdersByFilter(orders, activeFilter);

  useEffect(() => {
    activeFilterRef.current = activeFilter;
  }, [activeFilter]);

  useEffect(() => {
    if (!focusedOrderRequest) {
      return;
    }

    const focusedOrder = getFocusedScheduledSellOrder(orders, focusedOrderRequest);
    const currentFilter = activeFilterRef.current;
    const focusFilter = focusedOrder ? getScheduledSellFocusFilter(focusedOrder.status) : null;

    if (focusFilter && currentFilter !== 'ALL' && currentFilter !== focusFilter) {
      setActiveFilter(focusFilter);
    }
  }, [focusedOrderRequest, orders]);

  useEffect(() => {
    if (!isActive || focusedOrderId == null) {
      return;
    }

    const focusedOrder = focusedOrderRef.current;

    if (!focusedOrder) {
      return;
    }

    return scheduleScheduledOrderScroll(focusedOrder);
  }, [activeFilter, focusedOrderId, focusedOrderRequest?.requestId, isActive, orders]);

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
              const chartButtonLabel = `${order.videoTitle} 차트 보기`;
              const handleOpenChart = () => onOpenChart?.(order);
              const handleSelectOrderVideo = () => onSelectOrderVideo?.(order);
              const isSelected =
                activePlaybackQueueId === SCHEDULED_SELL_ORDERS_QUEUE_ID &&
                order.id === selectedOrderId &&
                order.videoId === selectedVideoId;
              const isFocused = order.id === focusedOrderId;

              return (
                <li
                  key={order.id}
                  aria-busy={isCanceling}
                  className="app-shell__game-position"
                  data-focused={isFocused || undefined}
                  data-scheduled-status={order.status}
                  data-selected={isSelected}
                  ref={isFocused ? focusedOrderRef : undefined}
                >
                  {isCanceling ? (
                    <div className="app-shell__game-position-overlay" role="status" aria-live="polite">
                      <span className="app-shell__game-position-overlay-spinner" aria-hidden="true" />
                      <span className="app-shell__game-position-overlay-label">예약 취소 처리 중</span>
                    </div>
                  ) : null}
                  <div className="app-shell__game-position-select">
                  {onSelectOrderVideo ? (
                    <button
                      aria-label={`${order.videoTitle} 재생`}
                      className="app-shell__game-position-thumb-button thumbnail-play-overlay-host thumbnail-play-overlay-host--sm"
                      onClick={handleSelectOrderVideo}
                      title="이 영상을 플레이어에서 엽니다."
                      type="button"
                    >
                      <img
                        alt=""
                        className="app-shell__game-position-thumb"
                        loading="lazy"
                        src={order.thumbnailUrl}
                      />
                      <ThumbnailPlayOverlay />
                    </button>
                  ) : (
                    <img
                      alt=""
                      className="app-shell__game-position-thumb"
                      loading="lazy"
                      src={order.thumbnailUrl}
                    />
                  )}
                  <div className="app-shell__game-position-copy">
                    <div className="app-shell__game-position-heading">
                      {onOpenChart ? (
                        <button
                          aria-label={chartButtonLabel}
                          className="app-shell__game-position-title-button"
                          onClick={handleOpenChart}
                          type="button"
                        >
                          <span className="app-shell__game-position-title">{order.videoTitle}</span>
                        </button>
                      ) : (
                        <p className="app-shell__game-position-title">{order.videoTitle}</p>
                      )}
                    </div>
                    <div
                      aria-label={`${order.videoTitle} 본문 차트 보기`}
                      className="app-shell__game-position-body-button"
                      data-clickable={onOpenChart ? 'true' : undefined}
                      onClick={onOpenChart ? handleOpenChart : undefined}
                      onKeyDown={
                        onOpenChart
                          ? (event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleOpenChart();
                              }
                            }
                          : undefined
                      }
                      role={onOpenChart ? 'button' : undefined}
                      tabIndex={onOpenChart ? 0 : undefined}
                    >
                      <p className="app-shell__game-position-channel">{order.channelTitle}</p>
                      <p className="app-shell__game-position-meta">
                        <span className="app-shell__game-position-meta-label">조건</span>{' '}
                        <span>{getScheduledSellConditionLabel(order)}</span>
                        {' · '}
                        <span className="app-shell__game-position-meta-label">현재</span>{' '}
                        <span>{formatRank(order.currentRank)}</span>
                        {' · '}
                        <span className="app-shell__game-position-meta-label">방식</span>{' '}
                        <span>예약 매도</span>
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
