import type { ReactNode, RefObject } from 'react';
import type { VideoPlayerHandle } from '../../../components/VideoPlayer/VideoPlayer';
import type { GameMarketVideo, GamePosition } from '../../../features/game/types';
import type { VideoTrendBadge } from '../../../features/trending/presentation';
import {
  formatGameQuantity,
  formatPercentValue,
  formatPoints,
  formatRank,
  getPointTone,
  type GamePositionSummary,
} from '../gameHelpers';
import { formatSignedProfitRate } from '../utils';
import { RankingGameSelectedVideoActions } from './RankingGamePanel';
import './GameActionContent.css';

interface GameSelectedVideoPriceSummaryProps {
  fallbackRankLabel?: string;
  fallbackViewCountLabel?: string;
  hideEvaluationPoints?: boolean;
  maxSellQuantity?: number;
  preferMarketSummary?: boolean;
  selectedVideoCurrentChartRank: number | null | undefined;
  selectedVideoHistoricalPosition?: GamePosition | null;
  selectedVideoId?: string;
  selectedVideoIsChartOut: boolean;
  selectedVideoMarketEntry?: GameMarketVideo;
  selectedVideoOpenPositionCount: number;
  selectedVideoOpenPositionSummary: GamePositionSummary;
  selectedVideoTrendBadges: VideoTrendBadge[];
}

interface GameStageActionsProps {
  buyActionTitle: string;
  canShowGameActions: boolean;
  isSelectedVideoBuyDisabled: boolean;
  isSelectedVideoSellDisabled: boolean;
  onOpenBuyTradeModal: () => void;
  onOpenRankHistory: () => void;
  onOpenSellTradeModal: () => void;
  selectedVideoId?: string;
  selectedVideoOpenPositionCount: number;
  sellActionTitle: string;
}

interface SelectedVideoGameActionsBundleProps {
  buyActionTitle: string;
  canShowGameActions: boolean;
  desktopPlayerDockSlotRef?: RefObject<HTMLDivElement | null>;
  fallbackRankLabel?: string;
  fallbackViewCountLabel?: string;
  isDesktopMiniPlayerEnabled?: boolean;
  mainPlayerRef?: RefObject<VideoPlayerHandle | null>;
  isBuySubmitting?: boolean;
  isChartDisabled?: boolean;
  isSelectedVideoBuyDisabled: boolean;
  isSelectedVideoSellDisabled: boolean;
  isSellSubmitting?: boolean;
  maxSellQuantity?: number;
  onContentClick?: () => void;
  mode: 'panel' | 'stage';
  onEyebrowClick?: () => void;
  onHeaderClick?: () => void;
  onOpenBuyTradeModal: () => void;
  onOpenRankHistory: () => void;
  onOpenSellTradeModal: () => void;
  panelControls?: ReactNode;
  selectedGameActionChannelTitle?: string;
  selectedGameActionTitle?: string;
  selectedVideoCurrentChartRank: number | null | undefined;
  selectedVideoHistoricalPosition?: GamePosition | null;
  selectedVideoId?: string;
  selectedVideoIsChartOut: boolean;
  selectedVideoMarketEntry?: GameMarketVideo;
  selectedVideoOpenPositionCount: number;
  selectedVideoOpenPositionSummary: GamePositionSummary;
  selectedVideoTradeThumbnailUrl?: string | null;
  selectedVideoTrendBadges: VideoTrendBadge[];
  sellActionTitle: string;
}

function TrendBadges({ badges }: { badges: VideoTrendBadge[] }) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <span className="app-shell__game-trend-badges">
      {badges.map((badge) => (
        <span
          key={`${badge.tone}-${badge.label}`}
          className="app-shell__game-trend-badge"
          data-tone={badge.tone}
        >
          {badge.label}
        </span>
      ))}
    </span>
  );
}

function formatTrendBadgeLabel(badge: VideoTrendBadge) {
  if (badge.tone === 'steady') {
    return '유지';
  }

  if (badge.tone === 'up') {
    const matchedNumber = badge.label.match(/\d+/);
    return matchedNumber ? `${matchedNumber[0]}위 상승` : '순위 상승';
  }

  if (badge.tone === 'down') {
    const matchedNumber = badge.label.match(/\d+/);
    return matchedNumber ? `${matchedNumber[0]}위 하락` : '순위 하락';
  }

  return badge.label;
}

function formatMomentumPriceBadge(entry: GameMarketVideo) {
  if (
    entry.momentumPriceType !== 'PREMIUM' &&
    entry.momentumPriceType !== 'DISCOUNT'
  ) {
    return null;
  }

  if (
    typeof entry.momentumPriceDeltaPercent !== 'number' ||
    !Number.isFinite(entry.momentumPriceDeltaPercent) ||
    entry.momentumPriceDeltaPercent === 0
  ) {
    return null;
  }

  const absolutePercent = Math.abs(entry.momentumPriceDeltaPercent);
  const formattedPercent = formatPercentValue(absolutePercent);
  return entry.momentumPriceType === 'PREMIUM'
    ? `프리미엄 +${formattedPercent}%`
    : `세일 -${formattedPercent}%`;
}

export function GameSelectedVideoPriceSummary({
  fallbackRankLabel,
  fallbackViewCountLabel,
  hideEvaluationPoints = false,
  maxSellQuantity = 0,
  preferMarketSummary = false,
  selectedVideoCurrentChartRank,
  selectedVideoHistoricalPosition,
  selectedVideoId,
  selectedVideoIsChartOut,
  selectedVideoMarketEntry,
  selectedVideoOpenPositionCount,
  selectedVideoOpenPositionSummary,
  selectedVideoTrendBadges,
}: GameSelectedVideoPriceSummaryProps) {
  const viewCountSummary = fallbackViewCountLabel ? (
    <>
      {' · '}<span className="app-shell__game-selected-summary-label">조회수</span>{' '}
      <span className="app-shell__game-selected-summary-value">{fallbackViewCountLabel}</span>
    </>
  ) : null;

  if (!preferMarketSummary && selectedVideoOpenPositionCount <= 0 && selectedVideoHistoricalPosition) {
    const historicalStatusLabel =
      selectedVideoHistoricalPosition.status === 'AUTO_CLOSED' ? '자동 청산' : '매도 완료';

    return (
      <div className="app-shell__game-selected-summary" aria-label="선택한 거래 영상 정보">
        <p className="app-shell__game-selected-summary-line">
          <span className="app-shell__game-selected-summary-label">순위</span>{' '}
          <span
            className="app-shell__game-selected-summary-value"
            data-chart-out={selectedVideoHistoricalPosition.chartOut || undefined}
          >
            {formatRank(selectedVideoCurrentChartRank, {
              chartOut: selectedVideoHistoricalPosition.chartOut,
              unavailableAsChartOut: true,
            })}
          </span>
          {viewCountSummary}
          {' · '}<span className="app-shell__game-selected-summary-label">정산금</span>{' '}
          <span className="app-shell__game-selected-summary-value">
            {typeof selectedVideoHistoricalPosition.currentPricePoints === 'number'
              ? formatPoints(selectedVideoHistoricalPosition.currentPricePoints)
              : '집계 중'}
          </span>
          {' · '}<span className="app-shell__game-selected-summary-label">손익률</span>{' '}
          <span
            className="app-shell__game-selected-summary-value"
            data-tone={getPointTone(selectedVideoHistoricalPosition.profitPoints)}
          >
            {formatSignedProfitRate(
              selectedVideoHistoricalPosition.profitPoints,
              selectedVideoHistoricalPosition.stakePoints,
            )}
          </span>
        </p>
        <p className="app-shell__game-selected-summary-badges">
          <span className="app-shell__game-selected-status-badge">{historicalStatusLabel}</span>
          {selectedVideoHistoricalPosition.chartOut ? (
            <span className="app-shell__game-selected-status-badge">차트 아웃</span>
          ) : null}
        </p>
      </div>
    );
  }

  if (preferMarketSummary && selectedVideoIsChartOut && selectedVideoOpenPositionCount <= 0 && selectedVideoHistoricalPosition) {
    const historicalStatusLabel =
      selectedVideoHistoricalPosition.status === 'AUTO_CLOSED' ? '자동 청산' : '매도 완료';

    return (
      <div className="app-shell__game-selected-summary" aria-label="선택한 거래 영상 정산 정보">
        <p className="app-shell__game-selected-summary-line">
          <span className="app-shell__game-selected-summary-label">순위</span>{' '}
          <span className="app-shell__game-selected-summary-value" data-chart-out="true">
            {formatRank(selectedVideoCurrentChartRank, {
              chartOut: true,
              unavailableAsChartOut: true,
            })}
          </span>
          {viewCountSummary}
          {' · '}<span className="app-shell__game-selected-summary-label">정산금</span>{' '}
          <span className="app-shell__game-selected-summary-value">
            {typeof selectedVideoHistoricalPosition.currentPricePoints === 'number'
              ? formatPoints(selectedVideoHistoricalPosition.currentPricePoints)
              : '집계 중'}
          </span>
          {' · '}<span className="app-shell__game-selected-summary-label">손익률</span>{' '}
          <span
            className="app-shell__game-selected-summary-value"
            data-tone={getPointTone(selectedVideoHistoricalPosition.profitPoints)}
          >
            {formatSignedProfitRate(
              selectedVideoHistoricalPosition.profitPoints,
              selectedVideoHistoricalPosition.stakePoints,
            )}
          </span>
        </p>
        <p className="app-shell__game-selected-summary-badges">
          <span className="app-shell__game-selected-status-badge">{historicalStatusLabel}</span>
          <span className="app-shell__game-selected-status-badge">차트 아웃</span>
        </p>
      </div>
    );
  }

  if (selectedVideoOpenPositionCount > 0 && preferMarketSummary && selectedVideoIsChartOut) {
    return (
      <div className="app-shell__game-selected-summary" aria-label="선택한 포지션 현재 상태">
        <p className="app-shell__game-selected-summary-line">
          <span className="app-shell__game-selected-summary-label">순위</span>{' '}
          <span
            className="app-shell__game-selected-summary-value"
            data-chart-out="true"
          >
            {formatRank(selectedVideoCurrentChartRank, {
              chartOut: true,
              unavailableAsChartOut: true,
            })}
          </span>
          {viewCountSummary}
          {!hideEvaluationPoints ? (
            <>
              {' · '}<span className="app-shell__game-selected-summary-label">평가 금액</span>{' '}
              <span className="app-shell__game-selected-summary-value">
                {formatPoints(selectedVideoOpenPositionSummary.evaluationPoints)}
              </span>
            </>
          ) : null}
          {' · '}<span className="app-shell__game-selected-summary-label">손익률</span>{' '}
          <span
            className="app-shell__game-selected-summary-value"
            data-tone={getPointTone(selectedVideoOpenPositionSummary.profitPoints)}
          >
            {formatSignedProfitRate(
              selectedVideoOpenPositionSummary.profitPoints,
              selectedVideoOpenPositionSummary.stakePoints,
            )}
          </span>
        </p>
        <p className="app-shell__game-selected-summary-badges">
          <span className="app-shell__game-selected-status-badge">차트 아웃</span>
        </p>
      </div>
    );
  }

  if (selectedVideoOpenPositionCount > 0 && !preferMarketSummary) {
    const selectedPositionTrendBadges = selectedVideoTrendBadges.map((badge) => ({
      ...badge,
      label: formatTrendBadgeLabel(badge),
    }));
    const sellableStatusBadge = maxSellQuantity > 0 ? `${formatGameQuantity(maxSellQuantity)} 매도 가능` : null;
    const statusBadge = selectedVideoIsChartOut ? '차트 아웃' : null;

    return (
      <div className="app-shell__game-selected-summary" aria-label="선택한 영상 가격 정보">
        <p className="app-shell__game-selected-summary-line">
          <span className="app-shell__game-selected-summary-label">순위</span>{' '}
          <span
            className="app-shell__game-selected-summary-value"
            data-chart-out={selectedVideoIsChartOut || undefined}
          >
            {formatRank(selectedVideoCurrentChartRank, {
              chartOut: selectedVideoIsChartOut,
              unavailableAsChartOut: selectedVideoIsChartOut,
            })}
          </span>
          {viewCountSummary}
          {!hideEvaluationPoints ? (
            <>
              {' · '}<span className="app-shell__game-selected-summary-label">평가 금액</span>{' '}
              <span className="app-shell__game-selected-summary-value">
                {formatPoints(selectedVideoOpenPositionSummary.evaluationPoints)}
              </span>
            </>
          ) : null}
          {' · '}<span className="app-shell__game-selected-summary-label">손익률</span>{' '}
          <span
            className="app-shell__game-selected-summary-value"
            data-tone={getPointTone(selectedVideoOpenPositionSummary.profitPoints)}
          >
            {formatSignedProfitRate(
              selectedVideoOpenPositionSummary.profitPoints,
              selectedVideoOpenPositionSummary.stakePoints,
            )}
          </span>
        </p>
        {selectedVideoTrendBadges.length > 0 || statusBadge || sellableStatusBadge ? (
          <p className="app-shell__game-selected-summary-badges">
            <TrendBadges badges={selectedPositionTrendBadges} />
            {sellableStatusBadge ? (
              <span className="app-shell__game-selected-status-badge">{sellableStatusBadge}</span>
            ) : null}
            {statusBadge ? <span className="app-shell__game-selected-status-badge">{statusBadge}</span> : null}
          </p>
        ) : null}
      </div>
    );
  }

  if (!selectedVideoMarketEntry) {
    if (!fallbackRankLabel && !fallbackViewCountLabel) {
      return null;
    }

    const fallbackTrendBadges = selectedVideoTrendBadges.map((badge) => ({
      ...badge,
      label: formatTrendBadgeLabel(badge),
    }));

    return (
      <div className="app-shell__game-selected-summary" aria-label="선택한 영상 메타데이터">
        <p className="app-shell__game-selected-summary-line">
          {fallbackRankLabel ? (
            <>
              <span className="app-shell__game-selected-summary-label">순위</span>{' '}
              <span className="app-shell__game-selected-summary-value">{fallbackRankLabel}</span>
            </>
          ) : null}
          {fallbackRankLabel && fallbackViewCountLabel ? ' · ' : null}
          {fallbackViewCountLabel ? (
            <>
              <span className="app-shell__game-selected-summary-label">조회수</span>{' '}
              <span className="app-shell__game-selected-summary-value">{fallbackViewCountLabel}</span>
            </>
          ) : null}
        </p>
        {fallbackTrendBadges.length > 0 ? (
          <p className="app-shell__game-selected-summary-badges">
            <TrendBadges badges={fallbackTrendBadges} />
          </p>
        ) : null}
      </div>
    );
  }

  const selectedVideoFormattedTrendBadges = selectedVideoTrendBadges.map((badge) => ({
    ...badge,
    label: formatTrendBadgeLabel(badge),
  }));
  const selectedVideoStatusBadge = selectedVideoIsChartOut ? '차트 아웃' : null;
  const selectedVideoMomentumPriceBadge = formatMomentumPriceBadge(selectedVideoMarketEntry);

  return (
    <div className="app-shell__game-selected-summary" aria-label="선택한 영상 현재 가격">
      <p className="app-shell__game-selected-summary-line">
        <span className="app-shell__game-selected-summary-label">순위</span>{' '}
        <span className="app-shell__game-selected-summary-value">
          {formatRank(selectedVideoMarketEntry.currentRank)}
        </span>
        {viewCountSummary}
        {' · '}<span className="app-shell__game-selected-summary-label">현재 단가</span>{' '}
        <span className="app-shell__game-selected-summary-value">
          {formatPoints(selectedVideoMarketEntry.currentPricePoints)}
        </span>
      </p>
      {selectedVideoFormattedTrendBadges.length > 0 || selectedVideoStatusBadge || selectedVideoMomentumPriceBadge ? (
        <p className="app-shell__game-selected-summary-badges">
          <TrendBadges badges={selectedVideoFormattedTrendBadges} />
          {selectedVideoStatusBadge ? (
            <span className="app-shell__game-selected-status-badge">{selectedVideoStatusBadge}</span>
          ) : null}
          {selectedVideoMomentumPriceBadge ? (
            <span
              className="app-shell__game-selected-status-badge"
              data-momentum-price-type={selectedVideoMarketEntry.momentumPriceType}
              title={`기본가 ${formatPoints(selectedVideoMarketEntry.basePricePoints ?? selectedVideoMarketEntry.currentPricePoints)}`}
            >
              {selectedVideoMomentumPriceBadge}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export function GameStageActions({
  buyActionTitle,
  canShowGameActions,
  isSelectedVideoBuyDisabled,
  isSelectedVideoSellDisabled,
  onOpenBuyTradeModal,
  onOpenRankHistory,
  onOpenSellTradeModal,
  selectedVideoId,
  selectedVideoOpenPositionCount,
  sellActionTitle,
}: GameStageActionsProps) {
  if (!selectedVideoId) {
    return null;
  }

  return (
    <>
      <div className="app-shell__stage-action-item">
        <button
          aria-label="선택한 영상 매수"
          className="app-shell__stage-action-button app-shell__stage-action-button--game"
          data-variant="buy"
          disabled={!canShowGameActions || isSelectedVideoBuyDisabled}
          onClick={onOpenBuyTradeModal}
          title={!canShowGameActions ? '전체 카테고리에서만 매수할 수 있습니다.' : buyActionTitle}
          type="button"
        >
          <span className="app-shell__stage-action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 18V6M12 6l-4 4M12 6l4 4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.15"
              />
            </svg>
          </span>
        </button>
        <span className="app-shell__stage-action-caption">매수</span>
      </div>
      <div className="app-shell__stage-action-item">
        <button
          aria-label="선택한 영상 매도"
          className="app-shell__stage-action-button app-shell__stage-action-button--game"
          data-variant="sell"
          disabled={isSelectedVideoSellDisabled || selectedVideoOpenPositionCount <= 0}
          onClick={onOpenSellTradeModal}
          title={selectedVideoOpenPositionCount > 0 ? sellActionTitle : '보유 수량이 있을 때만 매도할 수 있습니다.'}
          type="button"
        >
          <span className="app-shell__stage-action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 6v12M12 18l-4-4M12 18l4-4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.15"
              />
            </svg>
          </span>
        </button>
        <span className="app-shell__stage-action-caption">매도</span>
      </div>
      <div className="app-shell__stage-action-item">
        <button
          aria-label="선택한 영상 차트"
          className="app-shell__stage-action-button app-shell__stage-action-button--game"
          data-variant="chart"
          disabled={!canShowGameActions}
          onClick={onOpenRankHistory}
          title={
            !canShowGameActions
              ? '전체 카테고리에서만 차트를 볼 수 있습니다.'
              : '선택한 영상의 랭킹 차트를 엽니다.'
          }
          type="button"
        >
          <span className="app-shell__stage-action-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5.75 17.25 10 12.5l2.75 2.75 5.5-6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <path
                d="M15.5 9.25H18.5v3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
        </button>
        <span className="app-shell__stage-action-caption">차트</span>
      </div>
    </>
  );
}

export function SelectedVideoGameActionsBundle({
  buyActionTitle,
  canShowGameActions,
  desktopPlayerDockSlotRef,
  fallbackRankLabel,
  fallbackViewCountLabel,
  isDesktopMiniPlayerEnabled = false,
  mainPlayerRef,
  isBuySubmitting = false,
  isSelectedVideoBuyDisabled,
  isSelectedVideoSellDisabled,
  isSellSubmitting = false,
  maxSellQuantity = 0,
  onContentClick,
  mode,
  onEyebrowClick,
  onHeaderClick,
  onOpenBuyTradeModal,
  onOpenRankHistory,
  onOpenSellTradeModal,
  panelControls,
  selectedGameActionChannelTitle,
  selectedGameActionTitle,
  selectedVideoCurrentChartRank,
  selectedVideoHistoricalPosition,
  selectedVideoId,
  selectedVideoIsChartOut,
  selectedVideoMarketEntry,
  selectedVideoOpenPositionCount,
  selectedVideoOpenPositionSummary,
  selectedVideoTradeThumbnailUrl,
  selectedVideoTrendBadges,
  sellActionTitle,
}: SelectedVideoGameActionsBundleProps) {
  const currentVideoGamePriceSummary = (
    <GameSelectedVideoPriceSummary
      fallbackRankLabel={fallbackRankLabel}
      fallbackViewCountLabel={fallbackViewCountLabel}
      maxSellQuantity={maxSellQuantity}
      selectedVideoCurrentChartRank={selectedVideoCurrentChartRank}
      selectedVideoHistoricalPosition={selectedVideoHistoricalPosition}
      selectedVideoId={selectedVideoId}
      selectedVideoIsChartOut={selectedVideoIsChartOut}
      selectedVideoMarketEntry={selectedVideoMarketEntry}
      selectedVideoOpenPositionCount={selectedVideoOpenPositionCount}
      selectedVideoOpenPositionSummary={selectedVideoOpenPositionSummary}
      selectedVideoTrendBadges={selectedVideoTrendBadges}
    />
  );

  if (mode === 'stage') {
    return (
      <GameStageActions
        buyActionTitle={buyActionTitle}
        canShowGameActions={canShowGameActions}
        isSelectedVideoBuyDisabled={isSelectedVideoBuyDisabled}
        isSelectedVideoSellDisabled={isSelectedVideoSellDisabled}
        onOpenBuyTradeModal={onOpenBuyTradeModal}
        onOpenRankHistory={onOpenRankHistory}
        onOpenSellTradeModal={onOpenSellTradeModal}
        selectedVideoId={selectedVideoId}
        selectedVideoOpenPositionCount={selectedVideoOpenPositionCount}
        sellActionTitle={sellActionTitle}
      />
    );
  }

  if (!selectedVideoId || !selectedGameActionTitle) {
    return null;
  }

  return (
    <RankingGameSelectedVideoActions
      buyActionTitle={buyActionTitle}
      canShowGameActions={canShowGameActions}
      currentVideoGamePriceSummary={currentVideoGamePriceSummary}
      desktopPlayerDockSlotRef={desktopPlayerDockSlotRef}
      isDesktopMiniPlayerEnabled={isDesktopMiniPlayerEnabled}
      mainPlayerRef={mainPlayerRef}
      isBuyDisabled={isSelectedVideoBuyDisabled}
      isBuySubmitting={isBuySubmitting}
      isSellDisabled={isSelectedVideoSellDisabled}
      isSellSubmitting={isSellSubmitting}
      onContentClick={onContentClick}
      onEyebrowClick={onEyebrowClick}
      onHeaderClick={onHeaderClick}
      onOpenBuyTradeModal={onOpenBuyTradeModal}
      onOpenSellTradeModal={onOpenSellTradeModal}
      panelControls={panelControls}
      selectedGameActionChannelTitle={selectedGameActionChannelTitle}
      selectedGameActionTitle={selectedGameActionTitle}
      selectedVideoId={selectedVideoId}
      selectedVideoTradeThumbnailUrl={selectedVideoTradeThumbnailUrl}
      sellActionTitle={sellActionTitle}
    />
  );
}
