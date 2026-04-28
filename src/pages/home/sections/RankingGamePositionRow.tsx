import { memo } from 'react';
import type { GamePosition } from '../../../features/game/types';
import {
  calculateGameUnitPricePoints,
  formatGameQuantity,
  formatHoldCountdown,
  formatMaybePoints,
  formatRank,
  getPointTone,
  type OpenGameHolding,
} from '../gameHelpers';
import { buildPositionStrategyBadges } from '../gameStrategyTags';
import { formatSignedProfitRate } from '../utils';

interface RankingGamePositionRowProps {
  canShowGameActions: boolean;
  holding: OpenGameHolding;
  isSelected: boolean;
  onOpenPositionChart?: (position: GamePosition) => void;
  onOpenBuyTradeModal?: (position: GamePosition) => void;
  onOpenSellTradeModal?: (position: GamePosition) => void;
  onSelectPosition: (position: GamePosition) => void;
}

function formatHighlightScore(score?: number | null) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return '0점';
  }

  return `${score.toLocaleString('ko-KR')}점`;
}

function getHoldingRankDiffBadge(holding: Pick<OpenGameHolding, 'buyRank' | 'currentRank' | 'chartOut'>) {
  if (holding.chartOut || typeof holding.currentRank !== 'number') {
    return null;
  }

  const rankDiff = holding.buyRank - holding.currentRank;

  if (rankDiff > 0) {
    return { label: `${rankDiff}위 상승`, tone: 'up' as const };
  }

  if (rankDiff < 0) {
    return { label: `${Math.abs(rankDiff)}위 하락`, tone: 'down' as const };
  }

  return { label: '유지', tone: 'steady' as const };
}

function mapHoldingToGamePosition(holding: OpenGameHolding): GamePosition {
  return {
    id: holding.positionId,
    videoId: holding.videoId,
    title: holding.title,
    channelTitle: holding.channelTitle,
    thumbnailUrl: holding.thumbnailUrl,
    buyRank: holding.buyRank,
    currentRank: holding.currentRank,
    rankDiff: null,
    quantity: holding.quantity,
    stakePoints: holding.stakePoints,
    currentPricePoints: holding.currentPricePoints,
    profitPoints: holding.profitPoints,
    strategyTags: holding.strategyTags,
    achievedStrategyTags: holding.achievedStrategyTags,
    targetStrategyTags: holding.targetStrategyTags,
    projectedHighlightScore: holding.projectedHighlightScore,
    chartOut: holding.chartOut,
    status: 'OPEN',
    buyCapturedAt: holding.createdAt,
    createdAt: holding.createdAt,
    closedAt: null,
    reservedForSell: holding.reservedForSell,
    scheduledSellOrderId: holding.scheduledSellOrderId,
    scheduledSellTargetRank: holding.scheduledSellTargetRank,
    scheduledSellTriggerDirection: holding.scheduledSellTriggerDirection,
    scheduledSellQuantity: holding.scheduledSellQuantity,
  };
}

function RankingGamePositionRowComponent({
  canShowGameActions,
  holding,
  isSelected,
  onOpenPositionChart,
  onOpenBuyTradeModal,
  onOpenSellTradeModal,
  onSelectPosition,
}: RankingGamePositionRowProps) {
  const holdingRankTrendBadge = getHoldingRankDiffBadge(holding);
  const strategyBadges = buildPositionStrategyBadges(holding.achievedStrategyTags, holding.targetStrategyTags);
  const currentUnitPricePoints =
    typeof holding.currentPricePoints === 'number'
      ? calculateGameUnitPricePoints(holding.currentPricePoints, holding.quantity)
      : null;
  const positionStatusBadge = holding.chartOut ? '차트 아웃' : null;
  const reservedSellBadge = holding.reservedForSell
    ? `${formatGameQuantity(Math.max(holding.scheduledSellQuantity, 1))} 예약 중`
    : null;
  const sellableStatusBadge = !canShowGameActions
    ? '전체 카테고리에서 매도 가능'
    : holding.sellableQuantity > 0
      ? `${formatGameQuantity(holding.sellableQuantity)} 매도 가능`
      : typeof holding.nextSellableInSeconds === 'number' && holding.nextSellableInSeconds > 0
        ? `매도 대기 · ${formatHoldCountdown(holding.nextSellableInSeconds)}`
        : '매도 가능 수량 없음';
  const hasDetailBadges = Boolean(
    strategyBadges.length || holdingRankTrendBadge || positionStatusBadge || reservedSellBadge || sellableStatusBadge,
  );
  const projectedHighlightScoreValue = formatHighlightScore(holding.projectedHighlightScore);
  const position = mapHoldingToGamePosition(holding);
  const canOpenBuyTrade = canShowGameActions && Boolean(onOpenBuyTradeModal);
  const canOpenSellTrade = canShowGameActions && holding.sellableQuantity > 0 && Boolean(onOpenSellTradeModal);
  const handleOpenPositionChart = () => onOpenPositionChart?.(position);

  return (
    <li className="app-shell__game-position" data-selected={isSelected}>
      <div className="app-shell__game-position-select">
        <button
          className="app-shell__game-position-thumb-button"
          onClick={() => onSelectPosition(position)}
          type="button"
        >
          <img
            alt=""
            className="app-shell__game-position-thumb"
            loading="lazy"
            src={holding.thumbnailUrl}
          />
        </button>
        <div className="app-shell__game-position-copy">
          <div className="app-shell__game-position-heading">
            <button
              aria-label={`${holding.title} 순위 추이 차트`}
              className="app-shell__game-position-title-button"
              onClick={handleOpenPositionChart}
              type="button"
            >
              <p className="app-shell__game-position-title">{holding.title}</p>
            </button>
          </div>
          <div
            aria-label={`${holding.title} 본문 차트 보기`}
            className="app-shell__game-position-body-button"
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
          >
            <p className="app-shell__game-position-channel">{holding.channelTitle}</p>
            <div className="app-shell__game-position-body">
              <p className="app-shell__game-position-meta">
                <span className="app-shell__game-position-meta-label">예상 티어 점수</span>{' '}
                <span className="app-shell__game-position-score">
                  {holding.projectedHighlightScore > 0 ? `+${projectedHighlightScoreValue}` : projectedHighlightScoreValue}
                </span>
                {' · '}
                <span className="app-shell__game-position-meta-label">순위</span>{' '}
                <span className="app-shell__game-position-rank">{formatRank(holding.buyRank)}</span>
                {' → '}
                <span className="app-shell__game-position-rank" data-chart-out={holding.chartOut || undefined}>
                  {formatRank(holding.currentRank, {
                    chartOut: holding.chartOut,
                  })}
                </span>
                {' · '}<span className="app-shell__game-position-meta-label">평가 금액</span> {formatMaybePoints(holding.currentPricePoints)}
                {' · '}<span className="app-shell__game-position-meta-label">현재 단가</span> {formatMaybePoints(currentUnitPricePoints)}
                {' · '}<span className="app-shell__game-position-meta-label">손익률</span>{' '}
                <span data-tone={getPointTone(holding.profitPoints)}>
                  {formatSignedProfitRate(holding.profitPoints, holding.stakePoints)}
                </span>
              </p>
              {hasDetailBadges ? (
                <div className="app-shell__game-position-detail">
                  <span className="app-shell__game-position-detail-badges">
                    {strategyBadges.map((badge) => (
                      <span
                        key={`${holding.positionId}-${badge.state}-${badge.type}`}
                        className="app-shell__game-position-trend"
                        data-state={badge.state}
                        data-tone={badge.tone}
                      >
                        {badge.label}
                      </span>
                    ))}
                    {holdingRankTrendBadge ? (
                      <span className="app-shell__game-position-trend" data-tone={holdingRankTrendBadge.tone}>
                        {holdingRankTrendBadge.label}
                      </span>
                    ) : null}
                    {positionStatusBadge ? (
                      <span className="app-shell__game-position-trend" data-tone="steady">
                        {positionStatusBadge}
                      </span>
                    ) : null}
                    {reservedSellBadge ? (
                      <span className="app-shell__game-position-trend" data-tone="info">
                        {reservedSellBadge}
                      </span>
                    ) : null}
                    {sellableStatusBadge ? (
                      <span className="app-shell__game-position-trend" data-tone="steady">
                        {sellableStatusBadge}
                      </span>
                    ) : null}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="app-shell__game-position-side">
        <div className="app-shell__game-position-actions" aria-label={`${holding.title} 거래`}>
          <button
            aria-label={`${holding.title} 추가 매수`}
            className="app-shell__game-position-action"
            data-variant="buy"
            disabled={!canOpenBuyTrade}
            onClick={() => onOpenBuyTradeModal?.(position)}
            title={!canShowGameActions ? '전체 카테고리에서만 매수할 수 있습니다.' : '추가 매수'}
            type="button"
          >
            <span className="app-shell__game-position-action-icon" aria-hidden="true">
              <svg fill="none" viewBox="0 0 24 24">
                <path d="M12 19V5M12 5l-5 5M12 5l5 5" />
              </svg>
            </span>
            <span className="app-shell__game-position-action-label">매수</span>
          </button>
          <button
            aria-label={`${holding.title} 매도`}
            className="app-shell__game-position-action"
            data-variant="sell"
            disabled={!canOpenSellTrade}
            onClick={() => onOpenSellTradeModal?.(position)}
            title={
              !canShowGameActions
                ? '전체 카테고리에서만 매도할 수 있습니다.'
                : holding.sellableQuantity > 0
                  ? '매도'
                  : holding.reservedForSell
                    ? '예약 취소 후 매도할 수 있습니다.'
                    : '아직 매도 가능한 수량이 없습니다.'
            }
            type="button"
          >
            <span className="app-shell__game-position-action-icon" aria-hidden="true">
              <svg fill="none" viewBox="0 0 24 24">
                <path d="M12 5v14M12 19l-5-5M12 19l5-5" />
              </svg>
            </span>
            <span className="app-shell__game-position-action-label">매도</span>
          </button>
        </div>
      </div>
    </li>
  );
}

function areRankingGamePositionRowPropsEqual(
  prevProps: RankingGamePositionRowProps,
  nextProps: RankingGamePositionRowProps,
) {
  return (
    prevProps.canShowGameActions === nextProps.canShowGameActions &&
    prevProps.holding === nextProps.holding &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onOpenPositionChart === nextProps.onOpenPositionChart &&
    prevProps.onOpenBuyTradeModal === nextProps.onOpenBuyTradeModal &&
    prevProps.onOpenSellTradeModal === nextProps.onOpenSellTradeModal &&
    prevProps.onSelectPosition === nextProps.onSelectPosition
  );
}

export const RankingGamePositionRow = memo(
  RankingGamePositionRowComponent,
  areRankingGamePositionRowPropsEqual,
);
