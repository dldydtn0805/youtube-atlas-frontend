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
  mode: 'panel' | 'stage';
  onOpenBuyTradeModal: () => void;
  onOpenRankHistory: () => void;
  onOpenSellTradeModal: () => void;
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

export function GameSelectedVideoPriceSummary({
  gameCoinOverview,
  selectedVideoCurrentChartRank,
  selectedVideoId,
  selectedVideoIsChartOut,
  selectedVideoMarketEntry,
  selectedVideoOpenPositionCount,
  selectedVideoOpenPositionSummary,
  selectedVideoTrendBadges,
}: GameSelectedVideoPriceSummaryProps) {
  if (selectedVideoOpenPositionCount > 0) {
    return (
      <div className="app-shell__game-selected-summary" aria-label="선택한 영상 가격 정보">
        <p className="app-shell__game-selected-summary-line">
          현재{' '}
          {formatRank(selectedVideoCurrentChartRank, {
            chartOut: selectedVideoIsChartOut,
          })}
          <TrendBadges badges={selectedVideoTrendBadges} /> · 보유{' '}
          {formatGameQuantity(selectedVideoOpenPositionSummary.quantity)} · 손익률{' '}
          <span data-tone={getPointTone(selectedVideoOpenPositionSummary.profitPoints)}>
            {formatSignedProfitRate(
              selectedVideoOpenPositionSummary.profitPoints,
              selectedVideoOpenPositionSummary.stakePoints,
            )}
          </span>
        </p>
        <p className="app-shell__game-selected-summary-line">
          총 매수 {formatPoints(selectedVideoOpenPositionSummary.stakePoints)} · 총 평가{' '}
          {formatPoints(selectedVideoOpenPositionSummary.evaluationPoints)}
        </p>
        {selectedVideoId && gameCoinOverview ? (
          <p className="app-shell__game-selected-summary-line">
            {(() => {
              const matchingRank = gameCoinOverview.ranks.find(
                (rank) => rank.rank === selectedVideoCurrentChartRank,
              );
              const positionEstimatedCoinYield = gameCoinOverview.positions
                .filter((position) => position.videoId === selectedVideoId && position.productionActive)
                .reduce((sum, position) => sum + position.estimatedCoinYield, 0);
              const warmingUpPosition = gameCoinOverview.positions.find(
                (position) => position.videoId === selectedVideoId && !position.productionActive,
              );
              const rankCutoffLabel = `Top ${gameCoinOverview.eligibleRankCutoff}`;

              if (!matchingRank) {
                return `${rankCutoffLabel} 안에 들면 시즌 코인 생산이 시작됩니다.`;
              }

              if (positionEstimatedCoinYield > 0) {
                const nextPayoutInSeconds = gameCoinOverview.positions.find(
                  (position) => position.videoId === selectedVideoId && position.productionActive,
                )?.nextPayoutInSeconds;
                return typeof nextPayoutInSeconds === 'number'
                  ? `생산 진행 중 · ${formatHoldCountdown(nextPayoutInSeconds)} 뒤 예상 ${formatCoins(positionEstimatedCoinYield)} 적립`
                  : `생산 진행 중 · 이번 집계 예상 ${formatCoins(positionEstimatedCoinYield)}`;
              }

              if (typeof warmingUpPosition?.nextProductionInSeconds === 'number') {
                return `생산 대기 중 · ${formatHoldCountdown(warmingUpPosition.nextProductionInSeconds)} 뒤 시작`;
              }

              return `코인 생산 대상 · 평가금액의 ${formatPercent(matchingRank.coinRatePercent)} 적립`;
            })()}
          </p>
        ) : null}
      </div>
    );
  }

  if (!selectedVideoMarketEntry) {
    return null;
  }

  return (
    <div className="app-shell__game-selected-summary" aria-label="선택한 영상 현재 가격">
      <p className="app-shell__game-selected-summary-line">
        현재 {formatRank(selectedVideoMarketEntry.currentRank)}
        <TrendBadges badges={selectedVideoTrendBadges} /> · 가격{' '}
        {formatPoints(selectedVideoMarketEntry.currentPricePoints)}
      </p>
      {gameCoinOverview ? (
        <p className="app-shell__game-selected-summary-line">
          {(() => {
            const matchingRank = gameCoinOverview.ranks.find(
              (rank) => rank.rank === selectedVideoMarketEntry.currentRank,
            );
            const rankCutoffLabel = `Top ${gameCoinOverview.eligibleRankCutoff}`;

            if (!matchingRank) {
              return `${rankCutoffLabel} 안에 진입하면 시즌 코인 생산 현황에 반영됩니다.`;
            }

            const estimatedCoinYield = calculateEstimatedCoinYield(
              selectedVideoMarketEntry.currentPricePoints,
              matchingRank.coinRatePercent,
            );

            return `지금 진입하면 다음 적립 때 예상 ${formatCoins(estimatedCoinYield ?? 0)}`;
          })()}
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
      {selectedVideoOpenPositionCount > 0 ? (
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
  mode,
  onOpenBuyTradeModal,
  onOpenRankHistory,
  onOpenSellTradeModal,
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
      onOpenBuyTradeModal={onOpenBuyTradeModal}
      onOpenRankHistory={onOpenRankHistory}
      onOpenSellTradeModal={onOpenSellTradeModal}
      selectedGameActionTitle={selectedGameActionTitle}
      selectedVideoOpenPositionCount={selectedVideoOpenPositionCount}
      selectedVideoTradeThumbnailUrl={selectedVideoTradeThumbnailUrl}
      sellActionTitle={sellActionTitle}
    />
  );
}
