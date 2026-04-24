import { useCallback, type ReactNode } from 'react';
import type { AuthStatus } from '../../../features/auth/types';
import type {
  GameCurrentSeason,
  GamePosition,
  GameScheduledSellOrder,
  GameTierProgress,
} from '../../../features/game/types';
import type { VideoTrendSignal } from '../../../features/trending/types';
import type { YouTubeCategorySection } from '../../../features/youtube/types';
import { findPlaybackQueueIdForVideo } from '../utils';
import type { OpenGameHolding } from '../gameHelpers';
import BoldNumberText from './BoldNumberText';
import GameScheduledSellOrdersTab from './GameScheduledSellOrdersTab';
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
  isScheduledSellOrdersLoading: boolean;
  isCollapsed: boolean;
  newChartEntriesSection?: YouTubeCategorySection;
  onOpenTierModal: () => void;
  onOpenHistoryChart: (position: GamePosition) => void;
  onOpenPositionChart: (position: GamePosition) => void;
  onOpenPositionBuyTradeModal?: (position: GamePosition) => void;
  onOpenPositionSellTradeModal?: (position: GamePosition) => void;
  onCancelScheduledSellOrder?: (orderId: number) => void;
  onSelectGameHistoryVideo: (position: GamePosition, playbackQueueId?: string) => void | Promise<void>;
  onSelectGamePositionVideo: (position: GamePosition) => void;
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
  isScheduledSellOrdersLoading,
  isCollapsed,
  newChartEntriesSection,
  onOpenTierModal,
  onOpenHistoryChart,
  onOpenPositionChart,
  onOpenPositionBuyTradeModal,
  onOpenPositionSellTradeModal,
  onCancelScheduledSellOrder,
  onSelectGameHistoryVideo,
  onSelectGamePositionVideo,
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
      onOpenPositionChart={onOpenPositionChart}
      onOpenBuyTradeModal={onOpenPositionBuyTradeModal}
      onOpenSellTradeModal={onOpenPositionSellTradeModal}
      onSelectPosition={onSelectGamePositionVideo}
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
      isCancelingOrderId={scheduledSellOrderCancelingId}
      isLoading={isScheduledSellOrdersLoading}
      onCancelOrder={onCancelScheduledSellOrder}
      orders={scheduledSellOrders}
    />
  );
  const guideContent = (
    <div className="app-shell__game-guide" aria-label="랭킹 게임 설명">
      <ol className="app-shell__game-guide-list">
        <li className="app-shell__game-guide-item">
          <strong className="app-shell__game-guide-title">사고 팔아 포인트 벌기</strong>
          <p className="app-shell__game-guide-copy">
            홈에서 영상 차트를 확인하고, 순위가 오를 것 같은 영상을 싸게 사보세요. 나중에 순위가 오르면
            비싸게 팔아 차익을 포인트로 챙길 수 있어요!
          </p>
        </li>
        <li className="app-shell__game-guide-item">
          <strong className="app-shell__game-guide-title">하이라이트로 티어 올리기</strong>
          <p className="app-shell__game-guide-copy">
            <BoldNumberText>
              아틀라스 샷은 50위 또는 그 바깥에서 매수한 영상이 10위 안으로 진입할 때 붙는 최상위 하이라이트입니다. 문샷은 100위 바깥에서 50위 안, 스나이프는 150위 바깥에서 100위 안에 진입했을 때 붙습니다. 캐시아웃은 수익률 하이라이트로, 300% 이상은 스몰, 1,000% 이상은 빅으로 기록됩니다.
            </BoldNumberText>
          </p>
        </li>
        <li className="app-shell__game-guide-item">
          <strong className="app-shell__game-guide-title">기록과 경쟁</strong>
          <p className="app-shell__game-guide-copy">
            <BoldNumberText>
              거래내역에서 내가 했던 선택들을 돌아보고, 리더보드에서 다른 유저들과 이번 시즌 순위를 비교해보세요. 1위를 노려봐요!
            </BoldNumberText>
          </p>
        </li>
      </ol>
    </div>
  );

  const activeGameTabContent =
    activeGameTab === 'positions'
      ? positionsContent
      : activeGameTab === 'scheduledOrders'
        ? scheduledOrdersContent
      : activeGameTab === 'history'
        ? historyContent
        : guideContent;

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
      isCollapsed={isCollapsed}
      onSelectTab={onSelectTab}
      onToggleCollapse={onToggleCollapse}
      season={currentGameSeason}
      walletUpdatedAt={currentGameSeasonUpdatedAt}
      selectedVideoActions={selectedVideoActions}
      summary={{
        computedWalletTotalAssetPoints,
        openDistinctVideoCount,
        openPositionsBuyPoints,
        openPositionsEvaluationPoints,
        openPositionsProfitPoints,
      }}
      tabContent={activeGameTabContent}
    />
  );
}
