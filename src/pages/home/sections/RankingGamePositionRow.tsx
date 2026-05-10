import './GameInventory/GameInventoryRows.css';
import { memo } from 'react';
import ThumbnailPlayOverlay from '../../../components/ThumbnailPlayOverlay/ThumbnailPlayOverlay';
import type { GamePosition, GameScheduledSellOrder, GameStrategyType } from '../../../features/game/types';
import {
  calculateGameUnitPricePoints,
  formatGameQuantity,
  formatHoldCountdown,
  formatMaybePoints,
  formatRank,
  getPointTone,
  type OpenGameHolding,
} from '../gameHelpers';
import { getHoldingProfitRate } from '../gameInventorySorting';
import { buildPositionStrategyBadges } from '../gameStrategyTags';
import { getScheduledSellPresetForStrategy } from '../scheduledSellStrategyPreset';
import { formatSignedProfitRate } from '../utils';
import RankingGameReservedSellBadge from './RankingGameReservedSellBadge';

interface RankingGamePositionRowProps {
  canShowGameActions: boolean;
  holding: OpenGameHolding;
  isSelected: boolean;
  onCancelScheduledSellOrder?: (orderId: number) => void;
  onOpenPositionChart?: (position: GamePosition) => void;
  onOpenBuyTradeModal?: (position: GamePosition) => void;
  onOpenSellTradeModal?: (position: GamePosition) => void;
  onOpenStrategyScheduledSellTradeModal?: (position: GamePosition, strategyType: GameStrategyType) => void;
  onSelectPosition: (position: GamePosition) => void;
  scheduledSellOrderCancelingId?: number | null;
  scheduledSellOrders?: GameScheduledSellOrder[];
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

function getHoldingRankDelta(holding: Pick<OpenGameHolding, 'buyRank' | 'currentRank' | 'chartOut'>) {
  if (holding.chartOut || typeof holding.currentRank !== 'number') {
    return null;
  }

  return holding.buyRank - holding.currentRank;
}

function formatRankDelta(delta: number | null) {
  if (delta === null || delta === 0) {
    return '0';
  }

  return delta > 0 ? `+${delta}` : `${delta}`;
}

function formatRankBoxLabel(holding: Pick<OpenGameHolding, 'currentRank' | 'chartOut'>) {
  return formatRank(holding.currentRank, { chartOut: holding.chartOut });
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
    scheduledSellTriggerType: holding.scheduledSellTriggerType,
    scheduledSellTargetRank: holding.scheduledSellTargetRank,
    scheduledSellTargetProfitRatePercent: holding.scheduledSellTargetProfitRatePercent,
    scheduledSellTriggerDirection: holding.scheduledSellTriggerDirection,
    scheduledSellQuantity: holding.scheduledSellQuantity,
  };
}

function RankingGamePositionRowComponent({
  canShowGameActions,
  holding,
  isSelected,
  onCancelScheduledSellOrder,
  onOpenPositionChart,
  onOpenBuyTradeModal,
  onOpenSellTradeModal,
  onOpenStrategyScheduledSellTradeModal,
  onSelectPosition,
  scheduledSellOrderCancelingId,
  scheduledSellOrders,
}: RankingGamePositionRowProps) {
  const rankDelta = getHoldingRankDelta(holding);
  const rankDeltaTone = rankDelta === null || rankDelta === 0 ? 'flat' : rankDelta > 0 ? 'gain' : 'loss';
  const holdingRankTrendBadge = getHoldingRankDiffBadge(holding);
  const strategyBadges = buildPositionStrategyBadges(holding.achievedStrategyTags, holding.targetStrategyTags);
  const profitRate = getHoldingProfitRate(holding);
  const profitTone = getPointTone(holding.profitPoints);
  const profitMeterWidth = Number.isFinite(profitRate) ? Math.min(Math.abs(profitRate) * 100, 100) : 0;
  const currentUnitPricePoints =
    typeof holding.currentPricePoints === 'number'
      ? calculateGameUnitPricePoints(holding.currentPricePoints, holding.quantity)
      : null;
  const positionStatusBadge = holding.chartOut ? '차트 아웃' : null;
  const sellableStatusBadge = !canShowGameActions
    ? '전체 카테고리에서 매도 가능'
    : holding.sellableQuantity > 0
      ? `${formatGameQuantity(holding.sellableQuantity)} 매도 가능`
      : typeof holding.nextSellableInSeconds === 'number' && holding.nextSellableInSeconds > 0
        ? `매도 대기 · ${formatHoldCountdown(holding.nextSellableInSeconds)}`
        : '매도 가능 수량 없음';
  const hasDetailBadges = Boolean(
    strategyBadges.length || holdingRankTrendBadge || positionStatusBadge || holding.reservedForSell || sellableStatusBadge,
  );
  const projectedHighlightScoreValue = formatHighlightScore(holding.projectedHighlightScore);
  const position = mapHoldingToGamePosition(holding);
  const canOpenBuyTrade = canShowGameActions && Boolean(onOpenBuyTradeModal);
  const canOpenSellTrade = canShowGameActions && holding.sellableQuantity > 0 && Boolean(onOpenSellTradeModal);
  const canOpenStrategyScheduledSellTrade =
    canShowGameActions && holding.sellableQuantity > 0 && Boolean(onOpenStrategyScheduledSellTradeModal);
  const handleOpenPositionChart = () => onOpenPositionChart?.(position);

  return (
    <li className="app-shell__game-position" data-selected={isSelected}>
      <div className="app-shell__game-position-select">
        <div className="app-shell__game-position-rank-box" data-tone={rankDeltaTone}>
          <span className="app-shell__game-position-rank-now">
            {formatRankBoxLabel(holding)}
          </span>
          <span className="app-shell__game-position-rank-delta" data-tone={rankDeltaTone}>
            {formatRankDelta(rankDelta)}
          </span>
        </div>
        <button
          className="app-shell__game-position-thumb-button thumbnail-play-overlay-host thumbnail-play-overlay-host--sm"
          onClick={() => onSelectPosition(position)}
          type="button"
        >
          <img
            alt=""
            className="app-shell__game-position-thumb"
            loading="lazy"
            src={holding.thumbnailUrl}
          />
          <ThumbnailPlayOverlay />
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
              <span className="app-shell__game-position-profit-track" aria-hidden="true">
                <span data-tone={profitTone} style={{ width: `${profitMeterWidth}%` }} />
              </span>
              {hasDetailBadges ? (
                <div className="app-shell__game-position-detail">
                  <span className="app-shell__game-position-detail-badges">
                    {strategyBadges.map((badge) => {
                      const canOpenPreset =
                        badge.state === 'target' &&
                        canOpenStrategyScheduledSellTrade &&
                        getScheduledSellPresetForStrategy(badge.type) !== null;

                      if (canOpenPreset) {
                        return (
                          <button
                            key={`${holding.positionId}-${badge.state}-${badge.type}`}
                            aria-label={`${holding.title} ${badge.label} 예약 매도`}
                            className="app-shell__game-position-trend app-shell__game-position-trend-button"
                            data-state={badge.state}
                            data-tone={badge.tone}
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenStrategyScheduledSellTradeModal?.(position, badge.type);
                            }}
                            onKeyDown={(event) => event.stopPropagation()}
                            title={`${badge.label} 목표로 50% 예약 매도`}
                            type="button"
                          >
                            {badge.label}
                          </button>
                        );
                      }

                      return (
                        <span
                          key={`${holding.positionId}-${badge.state}-${badge.type}`}
                          className="app-shell__game-position-trend"
                          data-state={badge.state}
                          data-tone={badge.tone}
                        >
                          {badge.label}
                        </span>
                      );
                    })}
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
                    <RankingGameReservedSellBadge
                      holding={holding}
                      isCancelingOrderId={scheduledSellOrderCancelingId}
                      onCancelScheduledSellOrder={onCancelScheduledSellOrder}
                      scheduledSellOrders={scheduledSellOrders}
                    />
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
    prevProps.onCancelScheduledSellOrder === nextProps.onCancelScheduledSellOrder &&
    prevProps.onOpenPositionChart === nextProps.onOpenPositionChart &&
    prevProps.onOpenBuyTradeModal === nextProps.onOpenBuyTradeModal &&
    prevProps.onOpenSellTradeModal === nextProps.onOpenSellTradeModal &&
    prevProps.onOpenStrategyScheduledSellTradeModal === nextProps.onOpenStrategyScheduledSellTradeModal &&
    prevProps.onSelectPosition === nextProps.onSelectPosition &&
    prevProps.scheduledSellOrderCancelingId === nextProps.scheduledSellOrderCancelingId &&
    prevProps.scheduledSellOrders === nextProps.scheduledSellOrders
  );
}

export const RankingGamePositionRow = memo(
  RankingGamePositionRowComponent,
  areRankingGamePositionRowPropsEqual,
);
