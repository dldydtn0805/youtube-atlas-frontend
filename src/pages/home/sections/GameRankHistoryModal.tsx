import { createPortal } from 'react-dom';
import { lazy, Suspense, useEffect, useRef } from 'react';
import type {
  GamePosition,
  GamePositionRankHistory,
  GamePositionRankHistoryPoint,
} from '../../../features/game/types';
import type { VideoRankHistory } from '../../../features/trending/types';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useHeaderSwipeToClose from '../hooks/useHeaderSwipeToClose';
import { getFullscreenElement } from '../utils';
import './GameRankHistoryModal.css';

const GameRankHistoryCharts = lazy(() => import('./GameRankHistoryCharts'));

interface GameRankHistoryModalProps {
  error?: Error | null;
  history?: GamePositionRankHistory | VideoRankHistory;
  focusMode?: 'full' | 'trade';
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  position?: GamePosition | null;
  videoFallback?: {
    channelTitle?: string;
    currentRank?: number | null;
    chartOut?: boolean;
    thumbnailUrl?: string | null;
    title?: string;
  } | null;
}

const chartDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
});
const TRADE_FOCUS_PADDING_POINTS = 3;

function formatTimestamp(timestamp?: string | null) {
  if (!timestamp) {
    return '집계 중';
  }

  return chartDateFormatter.format(new Date(timestamp));
}

function getBuyPointIndex(points: Array<GamePositionRankHistoryPoint | VideoRankHistory['points'][number]>) {
  return points.findIndex((point) => 'buyPoint' in point && point.buyPoint);
}

function getBuyPoint(points: Array<GamePositionRankHistoryPoint | VideoRankHistory['points'][number]>) {
  return points.find((point) => 'buyPoint' in point && point.buyPoint) ?? null;
}

function getTradeFocusPoints(points: Array<GamePositionRankHistoryPoint | VideoRankHistory['points'][number]>) {
  const buyPointIndex = getBuyPointIndex(points);
  const sellPointIndex = points.findIndex((point) => 'sellPoint' in point && point.sellPoint);

  if (buyPointIndex < 0 && sellPointIndex < 0) {
    return points;
  }

  const startAnchor = buyPointIndex >= 0 ? buyPointIndex : sellPointIndex;
  const endAnchor = sellPointIndex >= 0 ? sellPointIndex : points.length - 1;
  const startIndex = Math.max(0, startAnchor - TRADE_FOCUS_PADDING_POINTS);
  const endIndex = Math.min(points.length, endAnchor + TRADE_FOCUS_PADDING_POINTS + 1);

  return points.slice(startIndex, endIndex);
}

export default function GameRankHistoryModal({
  error,
  focusMode = 'full',
  history,
  isLoading,
  isOpen,
  onClose,
  position,
}: GameRankHistoryModalProps) {
  useBodyScrollLock(isOpen);
  const { backdropStyle, bodySwipeHandlers, headerSwipeHandlers, modalStyle } = useHeaderSwipeToClose({
    disabled: !isOpen,
    onClose,
  });

  const modalBodyRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      modalBodyRef.current?.scrollTo({
        top: 0,
      });
    }

    wasOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  const portalTarget = getFullscreenElement();
  const container = portalTarget instanceof HTMLElement ? portalTarget : document.body;

  const originalPoints = history?.points ?? [];
  const points = focusMode === 'trade' ? getTradeFocusPoints(originalPoints) : originalPoints;
  const rankedPoints = points.filter((point) => typeof point.rank === 'number');
  const gameHistory = history && 'buyRank' in history ? history : null;
  const hasBuyRank = Boolean(gameHistory);
  const buyPointIndex = getBuyPointIndex(points);
  const buyPoint = getBuyPoint(points);
  const preBuyPointCount = buyPointIndex > 0 ? buyPointIndex : 0;
  const chartOutCount = points.filter((point) => point.chartOut).length;
  const buyCapturedAtLabel = hasBuyRank
    ? formatTimestamp(buyPoint?.capturedAt ?? gameHistory?.buyCapturedAt ?? position?.buyCapturedAt ?? position?.createdAt)
    : null;

  return createPortal(
    <div
      className="app-shell__modal-backdrop app-shell__modal-backdrop--history"
      onClick={onClose}
      role="presentation"
      style={backdropStyle}
    >
      <section
        aria-labelledby="game-rank-history-title"
        aria-modal="true"
        className="app-shell__modal app-shell__modal--history"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={modalStyle}
      >
        <div className="app-shell__modal-header app-shell__modal-header--swipe-close" {...headerSwipeHandlers}>
          <div className="app-shell__section-heading">
            <p className="app-shell__section-eyebrow">Ranking History</p>
            <h2 className="app-shell__section-title" id="game-rank-history-title">
              랭킹 기록
            </h2>
          </div>
          <button
            aria-label="랭킹 기록 모달 닫기"
            className="app-shell__modal-close"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>

        <div ref={modalBodyRef} className="app-shell__modal-body" {...bodySwipeHandlers}>
          <div className="app-shell__modal-field">
            <div className="app-shell__section-heading">
              <p className="app-shell__section-eyebrow">Timeline</p>
              <h3 className="app-shell__modal-field-title">순위 변화</h3>
            </div>
            <p className="app-shell__modal-field-copy">
              {focusMode === 'trade'
                ? '플레이어가 해당 종목을 소유한 구간을 표시합니다.'
                : hasBuyRank
                  ? '매수 이전 흐름은 연한 색으로, 매수 시점은 세로 가이드로 표시됩니다.'
                : '차트 아웃 구간은 별도 마커로 표시됩니다.'}
            </p>
            {isLoading ? (
              <p className="app-shell__game-rank-history-empty">랭킹 기록을 불러오는 중입니다.</p>
            ) : error ? (
              <p className="app-shell__game-rank-history-empty">{error.message}</p>
            ) : points.length === 0 ? (
              <p className="app-shell__game-rank-history-empty">아직 표시할 랭킹 기록이 없습니다.</p>
            ) : (
              <div className="app-shell__game-rank-history-chart">
                <Suspense fallback={<p className="app-shell__game-rank-history-empty">차트를 준비하는 중입니다.</p>}>
                  <GameRankHistoryCharts focusMode={focusMode} points={points} />
                </Suspense>
                <div className="app-shell__game-rank-history-stats">
                  {buyCapturedAtLabel ? (
                    <span className="app-shell__game-history-status">매수 시점 {buyCapturedAtLabel}</span>
                  ) : null}
                  {preBuyPointCount > 0 ? (
                    <span className="app-shell__game-history-status">{preBuyPointCount}회 매수 전</span>
                  ) : null}
                  <span className="app-shell__game-history-status">{rankedPoints.length}회 포착</span>
                  <span className="app-shell__game-history-status">{chartOutCount}회 차트 아웃</span>
                  <span className="app-shell__game-history-status">
                    최근 집계 {formatTimestamp(history?.latestCapturedAt ?? position?.closedAt ?? position?.createdAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>,
    container,
  );
}
