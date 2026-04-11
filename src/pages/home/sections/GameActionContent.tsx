import type { ReactNode } from 'react';
import type { GameCoinOverview, GameMarketVideo } from '../../../features/game/types';
import type { VideoTrendBadge } from '../../../features/trending/presentation';
import {
  calculateEstimatedCoinYield,
  formatCoins,
  formatGameQuantity,
  formatHoldCountdown,
  formatPercent,
  formatPoints,
  formatRank,
  getPointTone,
  type GamePositionSummary,
} from '../gameHelpers';
import { formatSignedProfitRate } from '../utils';
import { RankingGameSelectedVideoActions } from './RankingGamePanel';
import './GameActionContent.css';

interface GameSelectedVideoPriceSummaryProps {
  gameCoinOverview?: GameCoinOverview;
  maxSellQuantity?: number;
  selectedVideoCurrentChartRank: number | null | undefined;
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
  gameCoinOverview?: GameCoinOverview;
  isBuySubmitting?: boolean;
  isChartDisabled?: boolean;
  isSelectedVideoBuyDisabled: boolean;
  isSelectedVideoSellDisabled: boolean;
  isSellSubmitting?: boolean;
  maxSellQuantity?: number;
  mode: 'panel' | 'stage';
  onHeaderClick?: () => void;
  onOpenBuyTradeModal: () => void;
  onOpenRankHistory: () => void;
  onOpenSellTradeModal: () => void;
  panelControls?: ReactNode;
  selectedGameActionChannelTitle?: string;
  selectedGameActionTitle?: string;
  selectedVideoCurrentChartRank: number | null | undefined;
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
    return matchedNumber ? `${matchedNumber[0]}위 상승` : badge.label;
  }

  if (badge.tone === 'down') {
    const matchedNumber = badge.label.match(/\d+/);
    return matchedNumber ? `${matchedNumber[0]}위 하락` : badge.label;
  }

  return badge.label;
}

export function GameSelectedVideoPriceSummary({
  gameCoinOverview,
  maxSellQuantity = 0,
  selectedVideoCurrentChartRank,
  selectedVideoId,
  selectedVideoIsChartOut,
  selectedVideoMarketEntry,
  selectedVideoOpenPositionCount,
  selectedVideoOpenPositionSummary,
  selectedVideoTrendBadges,
}: GameSelectedVideoPriceSummaryProps) {
  if (selectedVideoOpenPositionCount > 0) {
    const selectedPositionTrendBadges = selectedVideoTrendBadges.map((badge) => ({
      ...badge,
      label: formatTrendBadgeLabel(badge),
    }));
    const selectedVideoCoinPositions =
      selectedVideoId && gameCoinOverview
        ? gameCoinOverview.positions.filter((position) => position.videoId === selectedVideoId)
        : [];
    const matchingRank = gameCoinOverview?.ranks.find((rank) => rank.rank === selectedVideoCurrentChartRank);
    const activeVideoCoinPositions = selectedVideoCoinPositions.filter((position) => position.productionActive);
    const positionCoinYield = activeVideoCoinPositions.reduce((sum, position) => sum + position.estimatedCoinYield, 0);
    const nearestPayoutInSeconds = activeVideoCoinPositions.reduce<number | null>((nearest, position) => {
      if (typeof position.nextPayoutInSeconds !== 'number') {
        return nearest;
      }

      return nearest === null ? position.nextPayoutInSeconds : Math.min(nearest, position.nextPayoutInSeconds);
    }, null);
    const warmingUpPosition = selectedVideoCoinPositions.find((position) => !position.productionActive);
    const maxHoldBoostPercent = selectedVideoCoinPositions.reduce(
      (highest, position) => Math.max(highest, position.holdBoostPercent),
      0,
    );
    const hasBoostBadge = !selectedVideoIsChartOut && selectedVideoCoinPositions.length > 0;
    const sellableStatusBadge = maxSellQuantity > 0 ? `${formatGameQuantity(maxSellQuantity)} 매도 가능` : null;
    const statusBadge = selectedVideoIsChartOut
      ? '차트 아웃'
      : positionCoinYield > 0
        ? nearestPayoutInSeconds !== null
          ? `${formatHoldCountdown(nearestPayoutInSeconds)} 뒤 채굴`
          : '채굴 중'
        : typeof warmingUpPosition?.nextProductionInSeconds === 'number'
          ? `${formatHoldCountdown(warmingUpPosition.nextProductionInSeconds)} 뒤 채굴`
          : matchingRank
            ? '채굴 대상'
            : null;
    const detailCopy = selectedVideoIsChartOut
      ? null
      : !matchingRank
        ? `Top ${gameCoinOverview?.eligibleRankCutoff ?? 0} 안에 들면 시즌 코인 채굴이 시작됩니다.`
        : positionCoinYield > 0
          ? null
          : typeof warmingUpPosition?.nextProductionInSeconds === 'number'
            ? null
            : `기본 채굴률 ${formatPercent(matchingRank.coinRatePercent)}`;

    return (
      <div className="app-shell__game-selected-summary" aria-label="선택한 영상 가격 정보">
        <p className="app-shell__game-selected-summary-line">
          <span className="app-shell__game-selected-summary-label">순위</span>{' '}
          <span className="app-shell__game-selected-summary-value">
            {formatRank(selectedVideoCurrentChartRank, {
              chartOut: selectedVideoIsChartOut,
            })}
          </span>
          {' · '}<span className="app-shell__game-selected-summary-label">금액</span>{' '}
          <span className="app-shell__game-selected-summary-value">
            {formatPoints(selectedVideoOpenPositionSummary.evaluationPoints)}
          </span>
          {' · '}<span className="app-shell__game-selected-summary-label">손익률</span>{' '}
          <span
            className="app-shell__game-selected-summary-value"
            data-tone={selectedVideoIsChartOut ? undefined : getPointTone(selectedVideoOpenPositionSummary.profitPoints)}
          >
            {formatSignedProfitRate(
              selectedVideoOpenPositionSummary.profitPoints,
              selectedVideoOpenPositionSummary.stakePoints,
              {
                unavailableText: selectedVideoIsChartOut ? '-' : undefined,
              },
            )}
          </span>
          {positionCoinYield > 0 ? (
            <>
              {' · '}<span className="app-shell__game-selected-summary-label">채굴량</span>{' '}
              <span className="app-shell__game-selected-summary-value">{formatCoins(positionCoinYield)}</span>
            </>
          ) : null}
        </p>
        {selectedVideoTrendBadges.length > 0 || statusBadge || hasBoostBadge || sellableStatusBadge ? (
          <p className="app-shell__game-selected-summary-badges">
            <TrendBadges badges={selectedPositionTrendBadges} />
            {sellableStatusBadge ? (
              <span className="app-shell__game-selected-status-badge">{sellableStatusBadge}</span>
            ) : null}
            {statusBadge ? <span className="app-shell__game-selected-status-badge">{statusBadge}</span> : null}
            {hasBoostBadge ? (
              <span className="app-shell__game-selected-status-badge">
                부스트 +{formatPercent(maxHoldBoostPercent)}
              </span>
            ) : null}
          </p>
        ) : null}
        {detailCopy ? <p className="app-shell__game-selected-summary-line">{detailCopy}</p> : null}
      </div>
    );
  }

  if (!selectedVideoMarketEntry) {
    return null;
  }

  const selectedVideoMatchingRank = gameCoinOverview?.ranks.find(
    (rank) => rank.rank === selectedVideoMarketEntry.currentRank,
  );
  const selectedVideoFormattedTrendBadges = selectedVideoTrendBadges.map((badge) => ({
    ...badge,
    label: formatTrendBadgeLabel(badge),
  }));
  const selectedVideoCoinYield =
    gameCoinOverview && !selectedVideoIsChartOut && selectedVideoMatchingRank
      ? calculateEstimatedCoinYield(
          selectedVideoMarketEntry.currentPricePoints,
          selectedVideoMatchingRank.coinRatePercent,
        ) ?? 0
      : 0;
  const selectedVideoMiningBadge = selectedVideoIsChartOut
    ? '채굴 중지'
    : selectedVideoMatchingRank
      ? `채굴률 ${formatPercent(selectedVideoMatchingRank.coinRatePercent)}`
      : gameCoinOverview?.eligibleRankCutoff
        ? `Top ${gameCoinOverview.eligibleRankCutoff} 밖`
        : null;

  return (
    <div className="app-shell__game-selected-summary" aria-label="선택한 영상 현재 가격">
      <p className="app-shell__game-selected-summary-line">
        <span className="app-shell__game-selected-summary-label">순위</span>{' '}
        <span className="app-shell__game-selected-summary-value">
          {formatRank(selectedVideoMarketEntry.currentRank)}
        </span>
        {' · '}<span className="app-shell__game-selected-summary-label">금액</span>{' '}
        <span className="app-shell__game-selected-summary-value">
          {formatPoints(selectedVideoMarketEntry.currentPricePoints)}
        </span>
        {' · '}<span className="app-shell__game-selected-summary-label">채굴량</span>{' '}
        <span className="app-shell__game-selected-summary-value">{formatCoins(selectedVideoCoinYield)}</span>
      </p>
      {selectedVideoFormattedTrendBadges.length > 0 || selectedVideoMiningBadge ? (
        <p className="app-shell__game-selected-summary-badges">
          <TrendBadges badges={selectedVideoFormattedTrendBadges} />
          {selectedVideoMiningBadge ? (
            <span className="app-shell__game-selected-status-badge">{selectedVideoMiningBadge}</span>
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
                strokeWidth="1.8"
              />
            </svg>
          </span>
        </button>
        <span className="app-shell__stage-action-caption">매수</span>
      </div>
      {selectedVideoOpenPositionCount > 0 ? (
        <div className="app-shell__stage-action-item">
          <button
            aria-label="선택한 영상 매도"
            className="app-shell__stage-action-button app-shell__stage-action-button--game"
            data-variant="sell"
            disabled={isSelectedVideoSellDisabled}
            onClick={onOpenSellTradeModal}
            title={sellActionTitle}
            type="button"
          >
            <span className="app-shell__stage-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 6v12M12 18l-4-4M12 18l4-4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
          </button>
          <span className="app-shell__stage-action-caption">매도</span>
        </div>
      ) : null}
    </>
  );
}

export function SelectedVideoGameActionsBundle({
  buyActionTitle,
  canShowGameActions,
  gameCoinOverview,
  isBuySubmitting = false,
  isChartDisabled = false,
  isSelectedVideoBuyDisabled,
  isSelectedVideoSellDisabled,
  isSellSubmitting = false,
  maxSellQuantity = 0,
  mode,
  onHeaderClick,
  onOpenBuyTradeModal,
  onOpenRankHistory,
  onOpenSellTradeModal,
  panelControls,
  selectedGameActionChannelTitle,
  selectedGameActionTitle,
  selectedVideoCurrentChartRank,
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
      gameCoinOverview={gameCoinOverview}
      maxSellQuantity={maxSellQuantity}
      selectedVideoCurrentChartRank={selectedVideoCurrentChartRank}
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
      isBuyDisabled={isSelectedVideoBuyDisabled}
      isBuySubmitting={isBuySubmitting}
      isChartDisabled={isChartDisabled}
      isSellDisabled={isSelectedVideoSellDisabled}
      isSellSubmitting={isSellSubmitting}
      onHeaderClick={onHeaderClick}
      onOpenBuyTradeModal={onOpenBuyTradeModal}
      onOpenRankHistory={onOpenRankHistory}
      onOpenSellTradeModal={onOpenSellTradeModal}
      panelControls={panelControls}
      selectedGameActionChannelTitle={selectedGameActionChannelTitle}
      selectedGameActionTitle={selectedGameActionTitle}
      selectedVideoOpenPositionCount={selectedVideoOpenPositionCount}
      selectedVideoTradeThumbnailUrl={selectedVideoTradeThumbnailUrl}
      sellActionTitle={sellActionTitle}
    />
  );
}
