import { memo, type RefObject } from 'react';
import type { GamePosition } from '../../../features/game/types';
import { formatGameTimestamp, formatMaybePoints, formatPoints, formatRank, getPointTone } from '../gameHelpers';
import { calculateSellFeePoints, formatSignedProfitRate } from '../utils';

interface RankingGameHistoryRowProps {
  historyPlaybackLoadingVideoId: string | null;
  isSelected: boolean;
  itemRef?: RefObject<HTMLLIElement | null>;
  onOpenPositionChart?: (position: GamePosition) => void;
  onSelectPosition: (position: GamePosition, playbackQueueId?: string) => void;
  position: GamePosition;
  resolvePlaybackQueueId: (videoId: string) => string | undefined;
}

function inferGrossSellPointsFromSettled(settledPoints?: number | null) {
  if (typeof settledPoints !== 'number' || !Number.isFinite(settledPoints) || settledPoints < 0) {
    return null;
  }

  return Math.floor((settledPoints * 1000) / 997);
}

function formatSignedPoints(points?: number | null) {
  if (typeof points !== 'number' || !Number.isFinite(points)) {
    return '집계 중';
  }

  if (points > 0) {
    return `+${formatPoints(points)}`;
  }

  if (points < 0) {
    return `-${formatPoints(Math.abs(points))}`;
  }

  return '0P';
}

function RankingGameHistoryRowComponent({
  historyPlaybackLoadingVideoId,
  isSelected,
  itemRef,
  onOpenPositionChart,
  onSelectPosition,
  position,
  resolvePlaybackQueueId,
}: RankingGameHistoryRowProps) {
  const playbackQueueId = resolvePlaybackQueueId(position.videoId);
  const isSelectable = Boolean(playbackQueueId);
  const isLoadingHistoryPlayback = historyPlaybackLoadingVideoId === position.videoId;
  const isClosedPosition = position.status !== 'OPEN';
  const historyStatusTone =
    position.status === 'OPEN' ? 'open' : position.status === 'AUTO_CLOSED' ? 'auto' : 'closed';
  const historyStatusLabel =
    position.status === 'OPEN' ? '보유중' : position.status === 'AUTO_CLOSED' ? '자동 청산' : '매도 완료';
  const grossSellPoints = isClosedPosition ? inferGrossSellPointsFromSettled(position.currentPricePoints) : null;
  const sellFeePoints = grossSellPoints !== null ? calculateSellFeePoints(grossSellPoints) : null;
  const handleOpenPositionChart = () => onOpenPositionChart?.(position);

  return (
    <li
      ref={isSelected ? itemRef : undefined}
      className="app-shell__game-history-item"
      data-selected={isSelected}
    >
      <div className="app-shell__game-history-select">
        <button
          className="app-shell__game-history-thumb-button"
          disabled={isLoadingHistoryPlayback}
          onClick={() => onSelectPosition(position, playbackQueueId)}
          title={
            isLoadingHistoryPlayback
              ? '영상 정보를 다시 불러오는 중입니다.'
              : isSelectable
                ? '이 영상을 플레이어에서 엽니다.'
                : '영상 정보를 다시 불러와 플레이어에서 엽니다.'
          }
          type="button"
        >
          <img
            alt=""
            className="app-shell__game-history-thumb"
            loading="lazy"
            src={position.thumbnailUrl}
          />
        </button>
        <div className="app-shell__game-history-copy">
          <div className="app-shell__game-history-heading">
            <button
              aria-label={`${position.title} 순위 추이 차트`}
              className="app-shell__game-history-title-button"
              onClick={handleOpenPositionChart}
              type="button"
            >
              <p className="app-shell__game-history-title">{position.title}</p>
            </button>
          </div>
          <div
            aria-label={`${position.title} 본문 차트 보기`}
            className="app-shell__game-history-body-button"
            data-clickable={onOpenPositionChart ? 'true' : undefined}
            onClick={onOpenPositionChart ? handleOpenPositionChart : undefined}
            onKeyDown={
              onOpenPositionChart
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleOpenPositionChart();
                    }
                  }
                : undefined
            }
            role={onOpenPositionChart ? 'button' : undefined}
            tabIndex={onOpenPositionChart ? 0 : undefined}
            title={
              isLoadingHistoryPlayback
                ? '영상 정보를 다시 불러오는 중입니다.'
                : isSelectable
                  ? '썸네일을 누르면 플레이어에서 엽니다.'
                  : '썸네일을 누르면 영상 정보를 다시 불러와 플레이어에서 엽니다.'
            }
          >
            <p className="app-shell__game-history-channel">{position.channelTitle}</p>
            {isLoadingHistoryPlayback ? (
              <p className="app-shell__game-history-meta">YouTube에서 영상 정보를 다시 불러오는 중입니다.</p>
            ) : null}
            <div className="app-shell__game-history-body">
              {isClosedPosition ? (
                <p className="app-shell__game-history-meta">
                  <span className="app-shell__game-history-meta-label">순위</span>{' '}
                  <span className="app-shell__game-history-rank">{formatRank(position.buyRank)}</span>
                  {' → '}
                  <span className="app-shell__game-history-rank">
                    {formatRank(position.currentRank, {
                      chartOut: position.chartOut,
                      unavailableAsChartOut: isClosedPosition,
                    })}
                  </span>
                  {' · '}<span className="app-shell__game-history-meta-label">정산금</span>{' '}
                  {formatMaybePoints(position.currentPricePoints)}
                  {' · '}<span className="app-shell__game-history-meta-label">손익금</span>{' '}
                  <span data-tone={getPointTone(position.profitPoints)}>
                    {formatSignedPoints(position.profitPoints)}
                  </span>
                  {' · '}<span className="app-shell__game-history-meta-label">손익률</span>{' '}
                  <span data-tone={getPointTone(position.profitPoints)}>
                    {formatSignedProfitRate(position.profitPoints, position.stakePoints)}
                  </span>
                  {' · '}<span className="app-shell__game-history-meta-label">수수료</span>{' '}
                  {sellFeePoints !== null ? formatPoints(sellFeePoints) : '집계 중'}
                </p>
              ) : (
                <p className="app-shell__game-history-meta">
                  <span className="app-shell__game-history-meta-label">순위</span>{' '}
                  <span className="app-shell__game-history-rank">{formatRank(position.buyRank)}</span>
                  {' · '}<span className="app-shell__game-history-meta-label">매수금</span> {formatPoints(position.stakePoints)}
                </p>
              )}
              <div className="app-shell__game-history-detail">
                <div className="app-shell__game-history-detail-badges">
                  <span
                    className="app-shell__game-history-badge app-shell__game-history-badge--status"
                    data-status={historyStatusTone}
                  >
                    {historyStatusLabel}
                  </span>
                  <span className="app-shell__game-history-badge">
                    {position.closedAt
                      ? `종료 ${formatGameTimestamp(position.closedAt)}`
                      : `진입 ${formatGameTimestamp(position.createdAt)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function areRankingGameHistoryRowPropsEqual(
  prevProps: RankingGameHistoryRowProps,
  nextProps: RankingGameHistoryRowProps,
) {
  const prevIsLoadingHistoryPlayback = prevProps.historyPlaybackLoadingVideoId === prevProps.position.videoId;
  const nextIsLoadingHistoryPlayback = nextProps.historyPlaybackLoadingVideoId === nextProps.position.videoId;

  return (
    prevIsLoadingHistoryPlayback === nextIsLoadingHistoryPlayback &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.itemRef === nextProps.itemRef &&
    prevProps.onOpenPositionChart === nextProps.onOpenPositionChart &&
    prevProps.onSelectPosition === nextProps.onSelectPosition &&
    prevProps.position === nextProps.position &&
    prevProps.resolvePlaybackQueueId === nextProps.resolvePlaybackQueueId
  );
}

export const RankingGameHistoryRow = memo(
  RankingGameHistoryRowComponent,
  areRankingGameHistoryRowPropsEqual,
);
