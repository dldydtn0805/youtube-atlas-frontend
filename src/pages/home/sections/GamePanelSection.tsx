import { useCallback, type ReactNode } from 'react';
import type { AuthStatus } from '../../../features/auth/types';
import type {
  GameCurrentSeason,
  GamePosition,
  GameScheduledSellOrder,
  GameStrategyType,
  GameTierProgress,
} from '../../../features/game/types';
import type { VideoTrendSignal } from '../../../features/trending/types';
import type { YouTubeCategorySection } from '../../../features/youtube/types';
import { findPlaybackQueueIdForVideo } from '../utils';
import type { OpenGameHolding } from '../gameHelpers';
import BoldNumberText from './BoldNumberText';
import { gameIntroSteps } from './GameIntroModal/steps';
import GameScheduledSellOrdersTab, { type ScheduledSellOrderFocusRequest } from './GameScheduledSellOrdersTab';
import {
  RankingGameTierOverview,
  RankingGameHistoryTab,
  RankingGamePanelShell,
  RankingGamePositionsTab,
} from './RankingGamePanel';

type GameTab = 'positions' | 'scheduledOrders' | 'history' | 'guide';

interface GamePanelSectionProps {
  activeGameTab: GameTab;
  activePlaybackQueueId?: string;
  authStatus: AuthStatus;
  canShowGameActions: boolean;
  tierProgress?: GameTierProgress;
  computedWalletTotalAssetPoints: number | null;
  currentGameSeason?: GameCurrentSeason;
  currentGameSeasonUpdatedAt: number;
  favoriteStreamerVideoSection?: YouTubeCategorySection;
  favoriteTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  gameHistoryPositions: GamePosition[];
  gameMarketSignalsByVideoId: Record<string, VideoTrendSignal>;
  gamePortfolioSection: YouTubeCategorySection;
  hasApiConfigured: boolean;
  historyPlaybackLoadingVideoId: string | null;
  historyPlaybackSection?: YouTubeCategorySection;
  isGameHistoryLoading: boolean;
  isOpenGamePositionsLoading: boolean;
  isScheduledSellOrdersLoading: boolean;
  scheduledSellOrderFocusRequest?: ScheduledSellOrderFocusRequest | null;
  isCollapsed: boolean;
  newChartEntriesSection?: YouTubeCategorySection;
  onOpenTierModal: () => void;
  onOpenHistoryChart: (position: GamePosition) => void;
  onOpenPositionChart: (position: GamePosition) => void;
  onRefreshTab?: (tab: GameTab) => Promise<void> | void;
  onOpenScheduledSellOrderChart?: (order: GameScheduledSellOrder) => void;
  onOpenPositionSellTradeModal?: (position: GamePosition) => void;
  onOpenStrategyScheduledSellTradeModal?: (position: GamePosition, strategyType: GameStrategyType) => void;
  onCancelScheduledSellOrder?: (orderId: number) => void;
  onSelectGameHistoryVideo: (position: GamePosition, playbackQueueId?: string) => void | Promise<void>;
  onSelectGamePositionVideo: (position: GamePosition) => void;
  onSelectScheduledSellOrderVideo?: (order: GameScheduledSellOrder) => void | Promise<void>;
  onSelectTab: (tab: GameTab) => void;
  onToggleCollapse: () => void;
  openDistinctVideoCount: number;
  openGameHoldings: OpenGameHolding[];
  openPositionsBuyPoints: number;
  openPositionsEvaluationPoints: number;
  openPositionsProfitPoints: number;
  positionsEmptyMessage: string | null;
  realtimeSurgingSection?: YouTubeCategorySection;
  selectedPositionId?: number | null;
  selectedPlaybackSection?: YouTubeCategorySection;
  selectedVideoActions?: ReactNode;
  selectedVideoId?: string;
  selectedScheduledSellOrderId?: number | null;
  scheduledSellOrders: GameScheduledSellOrder[];
  scheduledSellOrderCancelingId?: number | null;
  trendSignalsByVideoId: Record<string, VideoTrendSignal>;
}

export default function GamePanelSection({
  activeGameTab,
  activePlaybackQueueId,
  authStatus,
  canShowGameActions,
  tierProgress,
  computedWalletTotalAssetPoints,
  currentGameSeason,
  currentGameSeasonUpdatedAt,
  favoriteStreamerVideoSection,
  favoriteTrendSignalsByVideoId,
  gameHistoryPositions,
  gameMarketSignalsByVideoId,
  gamePortfolioSection,
  hasApiConfigured,
  historyPlaybackLoadingVideoId,
  historyPlaybackSection,
  isGameHistoryLoading,
  isOpenGamePositionsLoading,
  isScheduledSellOrdersLoading,
  scheduledSellOrderFocusRequest,
  isCollapsed,
  newChartEntriesSection,
  onOpenTierModal,
  onOpenHistoryChart,
  onOpenPositionChart,
  onRefreshTab,
  onOpenScheduledSellOrderChart,
  onOpenPositionSellTradeModal,
  onOpenStrategyScheduledSellTradeModal,
  onCancelScheduledSellOrder,
  onSelectGameHistoryVideo,
  onSelectGamePositionVideo,
  onSelectScheduledSellOrderVideo,
  onSelectTab,
  onToggleCollapse,
  openDistinctVideoCount,
  openGameHoldings,
  openPositionsBuyPoints,
  openPositionsEvaluationPoints,
  openPositionsProfitPoints,
  positionsEmptyMessage,
  realtimeSurgingSection,
  selectedPositionId,
  selectedPlaybackSection,
  selectedVideoActions,
  selectedVideoId,
  selectedScheduledSellOrderId,
  scheduledSellOrders,
  scheduledSellOrderCancelingId,
  trendSignalsByVideoId,
}: GamePanelSectionProps) {
  const historyEmptyMessage = currentGameSeason ? '아직 현재 시즌 거래내역이 없습니다.' : null;
  const resolvePlaybackQueueId = useCallback(
    (videoId: string) =>
      findPlaybackQueueIdForVideo(videoId, {
        favoriteStreamerVideoSection,
        gamePortfolioSection,
        historyPlaybackSection,
        newChartEntriesSection,
        realtimeSurgingSection,
        selectedSection: selectedPlaybackSection,
      }),
    [
      favoriteStreamerVideoSection,
      gamePortfolioSection,
      historyPlaybackSection,
      newChartEntriesSection,
      realtimeSurgingSection,
      selectedPlaybackSection,
    ],
  );

  if (!hasApiConfigured || authStatus !== 'authenticated') {
    return null;
  }

  const positionsContent = (
    <RankingGamePositionsTab
      activePlaybackQueueId={activePlaybackQueueId}
      canShowGameActions={canShowGameActions}
      emptyMessage={positionsEmptyMessage}
      favoriteTrendSignalsByVideoId={favoriteTrendSignalsByVideoId}
      gameMarketSignalsByVideoId={gameMarketSignalsByVideoId}
      holdings={openGameHoldings}
      currentGameSeason={currentGameSeason}
      isLoading={isOpenGamePositionsLoading}
      onCancelScheduledSellOrder={onCancelScheduledSellOrder}
      onOpenPositionChart={onOpenPositionChart}
      onOpenSellTradeModal={onOpenPositionSellTradeModal}
      onOpenStrategyScheduledSellTradeModal={onOpenStrategyScheduledSellTradeModal}
      onSelectPosition={onSelectGamePositionVideo}
      openDistinctVideoCount={openDistinctVideoCount}
      scheduledSellOrderCancelingId={scheduledSellOrderCancelingId}
      scheduledSellOrders={scheduledSellOrders}
      selectedPositionId={selectedPositionId}
      trendSignalsByVideoId={trendSignalsByVideoId}
    />
  );

  const historyContent = (
    <RankingGameHistoryTab
      activePlaybackQueueId={activePlaybackQueueId}
      emptyMessage={historyEmptyMessage}
      historyPlaybackLoadingVideoId={historyPlaybackLoadingVideoId}
      isLoading={isGameHistoryLoading}
      onOpenPositionChart={onOpenHistoryChart}
      onSelectPosition={(position, playbackQueueId) => {
        void onSelectGameHistoryVideo(position, playbackQueueId);
      }}
      positions={gameHistoryPositions}
      resolvePlaybackQueueId={resolvePlaybackQueueId}
      selectedPositionId={selectedPositionId}
      selectedVideoId={selectedVideoId}
    />
  );
  const scheduledOrdersContent = (
    <GameScheduledSellOrdersTab
      activePlaybackQueueId={activePlaybackQueueId}
      focusedOrderRequest={scheduledSellOrderFocusRequest}
      isActive={activeGameTab === 'scheduledOrders'}
      isCancelingOrderId={scheduledSellOrderCancelingId}
      isLoading={isScheduledSellOrdersLoading}
      onCancelOrder={onCancelScheduledSellOrder}
      onOpenChart={onOpenScheduledSellOrderChart}
      onSelectOrderVideo={
        onSelectScheduledSellOrderVideo
          ? (order) => {
              void onSelectScheduledSellOrderVideo(order);
            }
          : undefined
      }
      orders={scheduledSellOrders}
      selectedOrderId={selectedScheduledSellOrderId}
      selectedVideoId={selectedVideoId}
    />
  );
  const guideContent = (
    <div className="app-shell__game-guide" aria-label="랭킹 게임 설명">
      <ol className="app-shell__game-guide-list">
        {gameIntroSteps.map((step) => (
          <li key={step.title} className="app-shell__game-guide-item">
            <strong className="app-shell__game-guide-title">{step.title}</strong>
            <p className="app-shell__game-guide-copy">
              <BoldNumberText>{step.body}</BoldNumberText>
            </p>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <RankingGamePanelShell
      activeGameTab={activeGameTab}
      tierProgress={tierProgress}
      dividendOverview={
        <RankingGameTierOverview
          tierProgress={tierProgress}
          onOpenDetails={onOpenTierModal}
          season={currentGameSeason}
        />
      }
      enablePullToRefresh={false}
      isCollapsed={isCollapsed}
      onRefreshTab={onRefreshTab}
      onSelectTab={onSelectTab}
      onToggleCollapse={onToggleCollapse}
      season={currentGameSeason}
      walletUpdatedAt={currentGameSeasonUpdatedAt}
      selectedVideoActions={selectedVideoActions}
      summary={{
        computedWalletTotalAssetPoints,
        openPositionsBuyPoints,
        openPositionsEvaluationPoints,
        openPositionsProfitPoints,
      }}
      tabContentById={{
        guide: guideContent,
        history: historyContent,
        positions: positionsContent,
        scheduledOrders: scheduledOrdersContent,
      }}
    />
  );
}
