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

function getScheduledSellStatusLabel(status: GameScheduledSellOrder['status']) {
  if (status === 'PENDING') {
    return '대기중';
  }

  if (status === 'EXECUTED') {
    return '체결';
  }

  if (status === 'CANCELED') {
    return '취소';
  }

  return '실패';
}

export default function GameScheduledSellOrdersTab({
  emptyMessage = '예약 매도 주문이 아직 없습니다.',
  isCancelingOrderId = null,
  isLoading,
  onCancelOrder,
  orders,
}: GameScheduledSellOrdersTabProps) {
  if (isLoading) {
    return <p className="app-shell__game-empty">예약 매도 주문을 불러오는 중입니다.</p>;
  }

  if (orders.length === 0) {
    return emptyMessage ? <p className="app-shell__game-empty">{emptyMessage}</p> : null;
  }

  return (
    <ul className="app-shell__game-positions">
      {orders.map((order) => {
        const canCancel = order.status === 'PENDING' && Boolean(onCancelOrder);
        const isCanceling = isCancelingOrderId === order.id;

        return (
          <li key={order.id} className="app-shell__game-position">
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
                  <span>{formatRank(order.targetRank)} 이내</span>
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
                    <span className="app-shell__game-position-trend" data-tone="steady">
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
              <div className="app-shell__game-position-actions" aria-label={`${order.videoTitle} 예약 매도`}>
                <button
                  className="app-shell__game-position-action"
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
  );
}
