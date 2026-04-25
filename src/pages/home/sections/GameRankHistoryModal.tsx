import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import type {
  GamePosition,
  GamePositionRankHistory,
  GamePositionRankHistoryPoint,
} from '../../../features/game/types';
import type { VideoRankHistory } from '../../../features/trending/types';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import { getFullscreenElement } from '../utils';
import './GameRankHistoryModal.css';

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
const viewCountFormatter = new Intl.NumberFormat('ko-KR');
const TRADE_FOCUS_PADDING_POINTS = 2;

function formatRank(rank?: number | null, chartOut = false) {
  if (chartOut) {
    return '차트 아웃';
  }

  return typeof rank === 'number' ? `${rank}위` : '집계 중';
}

function formatTimestamp(timestamp?: string | null) {
  if (!timestamp) {
    return '집계 중';
  }

  return chartDateFormatter.format(new Date(timestamp));
}

function formatViewCount(viewCount?: number | null) {
  return typeof viewCount === 'number' ? `${viewCountFormatter.format(viewCount)}회` : '집계 없음';
}

function buildLinePath(points: Array<{ rank: number | null; x: number; y: number }>) {
  let path = '';
  let canConnect = false;

  for (const point of points) {
    if (typeof point.rank !== 'number') {
      canConnect = false;
      continue;
    }

    path += `${canConnect ? 'L' : 'M'} ${point.x} ${point.y} `;
    canConnect = true;
  }

  return path.trim();
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

function isPreBuyPoint(
  point: GamePositionRankHistoryPoint | VideoRankHistory['points'][number],
  index: number,
  buyPointIndex: number,
) {
  return 'buyPoint' in point && buyPointIndex > 0 && index < buyPointIndex;
}

function getInactiveGapFlags(points: Array<GamePositionRankHistoryPoint | VideoRankHistory['points'][number]>) {
  const inactiveFlags = new Array<boolean>(points.length);
  let isHolding = false;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const isBuyPoint = 'buyPoint' in point && point.buyPoint;
    const isSellPoint = 'sellPoint' in point && point.sellPoint;

    if (isBuyPoint) {
      isHolding = true;
    }

    inactiveFlags[index] = !isHolding && !isBuyPoint && !isSellPoint;

    if (isSellPoint) {
      isHolding = false;
    }
  }

  return inactiveFlags;
}

function getEventLabel(point: GamePositionRankHistoryPoint | VideoRankHistory['points'][number]) {
  if ('buyPoint' in point && point.buyPoint) {
    return 'B';
  }

  if ('sellPoint' in point && point.sellPoint) {
    return 'S';
  }

  return null;
}

function createChartGeometry(points: Array<GamePositionRankHistoryPoint | VideoRankHistory['points'][number]>) {
  const width = 640;
  const height = 240;
  const padding = {
    bottom: 32,
    left: 42,
    right: 18,
    top: 18,
  };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const baselineY = padding.top + plotHeight;
  const rankedPoints = points.filter((point) => typeof point.rank === 'number');
  const buyPointIndex = getBuyPointIndex(points);
  const inactiveGapFlags = getInactiveGapFlags(points);
  const xForIndex = (index: number) =>
    padding.left +
    (points.length === 1 ? plotWidth / 2 : (index / Math.max(points.length - 1, 1)) * plotWidth);

  if (rankedPoints.length === 0) {
    return {
      baselineY,
      hasRankedPoints: false,
      height,
      markers: points.map((point, index) => ({
        chartOut: point.chartOut,
        eventLabel: getEventLabel(point),
        isInactive: inactiveGapFlags[index],
        isPreBuy: isPreBuyPoint(point, index, buyPointIndex),
        rank: point.rank,
        x: xForIndex(index),
        y: baselineY,
      })),
      plotTopY: padding.top,
      postBuyPath: '',
      preBuyPath: '',
      width,
      xLabels: [
        { label: formatTimestamp(points[0]?.capturedAt), x: padding.left },
        { label: formatTimestamp(points[points.length - 1]?.capturedAt), x: padding.left + plotWidth },
      ],
      yLabels: [] as Array<{ label: string; y: number }>,
    };
  }

  const minRank = Math.min(...rankedPoints.map((point) => point.rank as number));
  const maxRank = Math.max(...rankedPoints.map((point) => point.rank as number));
  const rankSpan = Math.max(1, maxRank - minRank);
  const markers = points.map((point, index) => {
    const x = xForIndex(index);
    const y =
      typeof point.rank === 'number'
        ? padding.top + ((point.rank - minRank) / rankSpan) * plotHeight
        : baselineY;

    return {
      chartOut: point.chartOut,
      eventLabel: getEventLabel(point),
      isInactive: inactiveGapFlags[index],
      isPreBuy: isPreBuyPoint(point, index, buyPointIndex),
      rank: point.rank,
      x,
      y,
    };
  });
  const fadedMarkers = markers.map((marker) => ({
    ...marker,
    isFaded: marker.isPreBuy || marker.isInactive,
  }));
  const buildSegmentPath = (targetFaded: boolean) =>
    buildLinePath(
      fadedMarkers.map((marker) => ({
        rank: marker.isFaded === targetFaded || marker.eventLabel ? marker.rank : null,
        x: marker.x,
        y: marker.y,
      })),
    );

  return {
    baselineY,
    hasRankedPoints: true,
    height,
    markers: fadedMarkers,
    plotTopY: padding.top,
    postBuyPath: buildSegmentPath(false),
    preBuyPath: buildSegmentPath(true),
    width,
    xLabels: [
      { label: formatTimestamp(points[0]?.capturedAt), x: padding.left },
      { label: formatTimestamp(points[points.length - 1]?.capturedAt), x: padding.left + plotWidth },
    ],
    yLabels: [
      { label: `${minRank}위`, y: padding.top + 4 },
      { label: `${maxRank}위`, y: baselineY },
    ],
  };
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
  const chart = createChartGeometry(points);
  const rankedPoints = points.filter((point) => typeof point.rank === 'number');
  const gameHistory = history && 'buyRank' in history ? history : null;
  const hasBuyRank = Boolean(gameHistory);
  const buyPointIndex = getBuyPointIndex(points);
  const buyPoint = getBuyPoint(points);
  const buyPointMarker = buyPointIndex >= 0 ? chart.markers[buyPointIndex] ?? null : null;
  const preBuyPointCount = buyPointIndex > 0 ? buyPointIndex : 0;
  const chartOutCount = points.filter((point) => point.chartOut).length;
  const recentPoints = points
    .map((point, index) => ({ index, point }))
    .slice(-6)
    .reverse();
  const buyCapturedAtLabel = hasBuyRank
    ? formatTimestamp(buyPoint?.capturedAt ?? gameHistory?.buyCapturedAt ?? position?.buyCapturedAt ?? position?.createdAt)
    : null;

  return createPortal(
    <div
      className="app-shell__modal-backdrop app-shell__modal-backdrop--history"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-labelledby="game-rank-history-title"
        aria-modal="true"
        className="app-shell__modal app-shell__modal--history"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="app-shell__modal-header">
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

        <div ref={modalBodyRef} className="app-shell__modal-body">
          <div className="app-shell__modal-field">
            <div className="app-shell__section-heading">
              <p className="app-shell__section-eyebrow">Timeline</p>
              <h3 className="app-shell__modal-field-title">순위 추이</h3>
            </div>
            <p className="app-shell__modal-field-copy">
              {focusMode === 'trade'
                ? '하이라이트가 발생한 매수-매도 구간 근처만 표시합니다. 숫자가 낮을수록 상위 순위입니다.'
                : hasBuyRank
                  ? '숫자가 낮을수록 상위 순위입니다. 매수 이전 흐름은 연한 색으로 표시되고, 매수 시점은 세로 가이드로 확인할 수 있습니다.'
                : '숫자가 낮을수록 상위 순위입니다. 차트 아웃 구간은 별도 마커로 표시됩니다.'}
            </p>
            {isLoading ? (
              <p className="app-shell__game-rank-history-empty">랭킹 기록을 불러오는 중입니다.</p>
            ) : error ? (
              <p className="app-shell__game-rank-history-empty">{error.message}</p>
            ) : points.length === 0 ? (
              <p className="app-shell__game-rank-history-empty">아직 표시할 랭킹 기록이 없습니다.</p>
            ) : (
              <div className="app-shell__game-rank-history-chart">
                <svg
                  aria-label="랭킹 추이 그래프"
                  className="app-shell__game-rank-history-chart-svg"
                  role="img"
                  viewBox={`0 0 ${chart.width} ${chart.height}`}
                >
                  <line
                    className="app-shell__game-rank-history-axis"
                    x1="42"
                    x2={chart.width - 18}
                    y1={chart.baselineY}
                    y2={chart.baselineY}
                  />
                  {buyPointMarker ? (
                    <>
                      <line
                        className="app-shell__game-rank-history-buy-guide"
                        x1={buyPointMarker.x}
                        x2={buyPointMarker.x}
                        y1={chart.plotTopY}
                        y2={chart.baselineY}
                      />
                    </>
                  ) : null}
                  {chart.hasRankedPoints ? (
                    <>
                      {chart.preBuyPath ? (
                        <path
                          className="app-shell__game-rank-history-line app-shell__game-rank-history-line--prebuy"
                          d={chart.preBuyPath}
                          fill="none"
                        />
                      ) : null}
                      {chart.postBuyPath ? (
                        <path
                          className="app-shell__game-rank-history-line"
                          d={chart.postBuyPath}
                          fill="none"
                        />
                      ) : null}
                    </>
                  ) : null}
              {chart.markers.map((point, index) => (
                    <g
                      data-inactive={point.isInactive ? 'true' : 'false'}
                      data-pre-buy={point.isPreBuy ? 'true' : 'false'}
                      key={`${point.x}-${index}`}
                    >
                      {point.chartOut ? (
                        <circle
                          className={`app-shell__game-rank-history-chartout${
                            point.isPreBuy || point.isInactive ? ' app-shell__game-rank-history-chartout--prebuy' : ''
                          }`}
                          cx={point.x}
                          cy={point.y}
                          r="4.5"
                        />
                      ) : typeof point.rank === 'number' ? (
                        <circle
                          className={`app-shell__game-rank-history-point${
                            point.isPreBuy || point.isInactive ? ' app-shell__game-rank-history-point--prebuy' : ''
                          }`}
                          cx={point.x}
                          cy={point.y}
                          r="4"
                        />
                      ) : null}
                      {point.eventLabel ? (
                        <>
                          <circle
                            className="app-shell__game-rank-history-event"
                            cx={point.x}
                            cy={point.y}
                            r="9"
                          />
                          <text
                            className="app-shell__game-rank-history-event-label"
                            textAnchor="middle"
                            x={point.x}
                            y={point.y + 3}
                          >
                            {point.eventLabel}
                          </text>
                        </>
                      ) : null}
                    </g>
                  ))}
                  {chart.yLabels.map((label) => (
                    <text
                      key={`${label.label}-${label.y}`}
                      className="app-shell__game-rank-history-axis-label"
                      textAnchor="end"
                      x="36"
                      y={label.y}
                    >
                      {label.label}
                    </text>
                  ))}
                  {chart.xLabels.map((label) => (
                    <text
                      key={`${label.label}-${label.x}`}
                      className="app-shell__game-rank-history-axis-label"
                      textAnchor={label.x <= 42 ? 'start' : 'end'}
                      x={label.x}
                      y={chart.height - 8}
                    >
                      {label.label}
                    </text>
                  ))}
                </svg>
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

          {points.length > 0 ? (
            <div className="app-shell__modal-field">
              <div className="app-shell__section-heading">
                <p className="app-shell__section-eyebrow">Samples</p>
                <h3 className="app-shell__modal-field-title">최근 포착 내역</h3>
              </div>
              <ul className="app-shell__game-rank-history-samples">
                {recentPoints.map(({ index, point }) => (
                  <li
                    key={`${point.runId}-${point.capturedAt}`}
                    className="app-shell__game-rank-history-sample"
                    data-pre-buy={chart.markers[index]?.isPreBuy || chart.markers[index]?.isInactive ? 'true' : 'false'}
                  >
                    <div>
                      <p className="app-shell__game-rank-history-sample-rank">
                        {formatRank(point.rank, point.chartOut)}
                      </p>
                      <p className="app-shell__game-rank-history-sample-meta">
                        조회수 {formatViewCount(point.viewCount)}
                      </p>
                    </div>
                    <div className="app-shell__game-rank-history-sample-side">
                      {chart.markers[index]?.isPreBuy ? (
                        <span className="app-shell__game-history-status">매수 전</span>
                      ) : chart.markers[index]?.isInactive ? (
                        <span className="app-shell__game-history-status">비보유 구간</span>
                      ) : null}
                      {'buyPoint' in point && point.buyPoint ? (
                        <span className="app-shell__game-history-status">매수</span>
                      ) : null}
                      {'sellPoint' in point && point.sellPoint ? (
                        <span className="app-shell__game-history-status">매도</span>
                      ) : null}
                      <p className="app-shell__game-history-time">{formatTimestamp(point.capturedAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </div>,
    container,
  );
}
