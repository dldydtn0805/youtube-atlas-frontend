import { useCallback, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { AuthStatus } from '../../../features/auth/types';
import type {
  GameCoinOverview,
  GameCoinTierProgress,
  GameCurrentSeason,
  GameLeaderboardEntry,
  GamePosition,
} from '../../../features/game/types';
import type { VideoTrendSignal } from '../../../features/trending/types';
import type { YouTubeCategorySection } from '../../../features/youtube/types';
import { findPlaybackQueueIdForVideo } from '../utils';
import type { OpenGameHolding } from '../gameHelpers';
import {
  RankingGameCoinOverview,
  RankingGameHistoryTab,
  RankingGameLeaderboardTab,
  RankingGamePanelShell,
  RankingGamePositionsTab,
} from './RankingGamePanel';

type GameTab = 'positions' | 'history' | 'leaderboard';

interface GamePanelSectionProps {
  activeGameTab: GameTab;
  authStatus: AuthStatus;
  canShowGameActions: boolean;
  coinOverview?: GameCoinOverview;
  coinTierProgress?: GameCoinTierProgress;
  computedWalletTotalAssetPoints: number | null;
  currentGameSeason?: GameCurrentSeason;
  favoriteStreamerVideoSection?: YouTubeCategorySection;
  favoriteTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  gameActionStatus: string | null;
  gameHistoryPositions: GamePosition[];
  gameLeaderboard: GameLeaderboardEntry[];
  gameLeaderboardError: unknown;
  gameMarketSignalsByVideoId: Record<string, VideoTrendSignal>;
  gamePortfolioSection: YouTubeCategorySection;
  hasApiConfigured: boolean;
  historyPlaybackLoadingVideoId: string | null;
  historyPlaybackSection?: YouTubeCategorySection;
  isCurrentVideoGameHelperWarning: boolean;
  isGameHistoryLoading: boolean;
  isGameLeaderboardError: boolean;
  isGameLeaderboardLoading: boolean;
  isCollapsed: boolean;
  isSelectedLeaderboardPositionsError: boolean;
  isSelectedLeaderboardPositionsLoading: boolean;
  newChartEntriesSection?: YouTubeCategorySection;
  onOpenCoinModal: () => void;
  onSelectGameHistoryVideo: (position: GamePosition, playbackQueueId?: string) => void | Promise<void>;
  onSelectGamePositionVideo: (videoId: string) => void;
  onSelectLeaderboardPositionVideo: (position: GamePosition, playbackQueueId?: string) => void | Promise<void>;
  onSelectTab: (tab: GameTab) => void;
  onToggleCollapse: () => void;
  openDistinctVideoCount: number;
  openGameHoldings: OpenGameHolding[];
  openPositionsBuyPoints: number;
  openPositionsEvaluationPoints: number;
  openPositionsProfitPoints: number;
  positionsEmptyMessage: string | null;
  realtimeSurgingSection?: YouTubeCategorySection;
  seasonStatusMessage: string;
  selectedLeaderboardPositions: GamePosition[];
  selectedLeaderboardPositionsError: unknown;
  selectedLeaderboardUserId: number | null;
  selectedPlaybackSection?: YouTubeCategorySection;
  selectedVideoActions?: ReactNode;
  selectedVideoId?: string;
  setSelectedLeaderboardUserId: Dispatch<SetStateAction<number | null>>;
  trendSignalsByVideoId: Record<string, VideoTrendSignal>;
}

export default function GamePanelSection({
  activeGameTab,
  authStatus,
  canShowGameActions,
  coinOverview,
  coinTierProgress,
  computedWalletTotalAssetPoints,
  currentGameSeason,
  favoriteStreamerVideoSection,
  favoriteTrendSignalsByVideoId,
  gameActionStatus,
  gameHistoryPositions,
  gameLeaderboard,
  gameLeaderboardError,
  gameMarketSignalsByVideoId,
  gamePortfolioSection,
  hasApiConfigured,
  historyPlaybackLoadingVideoId,
  historyPlaybackSection,
  isCurrentVideoGameHelperWarning,
  isGameHistoryLoading,
  isGameLeaderboardError,
  isGameLeaderboardLoading,
  isCollapsed,
  isSelectedLeaderboardPositionsError,
  isSelectedLeaderboardPositionsLoading,
  newChartEntriesSection,
  onOpenCoinModal,
  onSelectGameHistoryVideo,
  onSelectGamePositionVideo,
  onSelectLeaderboardPositionVideo,
  onSelectTab,
  onToggleCollapse,
  openDistinctVideoCount,
  openGameHoldings,
  openPositionsBuyPoints,
  openPositionsEvaluationPoints,
  openPositionsProfitPoints,
  positionsEmptyMessage,
  realtimeSurgingSection,
  seasonStatusMessage,
  selectedLeaderboardPositions,
  selectedLeaderboardPositionsError,
  selectedLeaderboardUserId,
  selectedPlaybackSection,
  selectedVideoActions,
  selectedVideoId,
  setSelectedLeaderboardUserId,
  trendSignalsByVideoId,
}: GamePanelSectionProps) {
  const historyEmptyMessage = currentGameSeason ? '아직 현재 시즌 거래내역이 없습니다.' : null;
  const selectedLeaderboardEntry = selectedLeaderboardUserId
    ? gameLeaderboard.find((entry) => entry.userId === selectedLeaderboardUserId) ?? null
    : null;
  const selectedLeaderboardPositionsTitle = selectedLeaderboardEntry
    ? `${selectedLeaderboardEntry.displayName}님의 보유 포지션`
    : '보유 포지션';

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

  const leaderboardContent = (
    <RankingGameLeaderboardTab
      entries={gameLeaderboard}
      error={gameLeaderboardError}
      isError={isGameLeaderboardError}
      isLoading={isGameLeaderboardLoading}
      isPositionsError={isSelectedLeaderboardPositionsError}
      isPositionsLoading={isSelectedLeaderboardPositionsLoading}
      loadingVideoId={historyPlaybackLoadingVideoId}
      onSelectPosition={(position, playbackQueueId) => {
        void onSelectLeaderboardPositionVideo(position, playbackQueueId);
      }}
      onToggleUser={(userId) =>
        setSelectedLeaderboardUserId((currentUserId) => (currentUserId === userId ? null : userId))
      }
      positions={selectedLeaderboardPositions}
      positionsError={selectedLeaderboardPositionsError}
      positionsTitle={selectedLeaderboardPositionsTitle}
      resolvePlaybackQueueId={resolvePlaybackQueueId}
      season={currentGameSeason}
      selectedUserId={selectedLeaderboardUserId}
    />
  );

  const positionsContent = (
    <RankingGamePositionsTab
      canShowGameActions={canShowGameActions}
      emptyMessage={positionsEmptyMessage}
      favoriteTrendSignalsByVideoId={favoriteTrendSignalsByVideoId}
      gameMarketSignalsByVideoId={gameMarketSignalsByVideoId}
      holdings={openGameHoldings}
      onSelectVideo={onSelectGamePositionVideo}
      selectedVideoId={selectedVideoId}
      trendSignalsByVideoId={trendSignalsByVideoId}
    />
  );

  const historyContent = (
    <RankingGameHistoryTab
      emptyMessage={historyEmptyMessage}
      historyPlaybackLoadingVideoId={historyPlaybackLoadingVideoId}
      isLoading={isGameHistoryLoading}
      onSelectPosition={(position, playbackQueueId) => {
        void onSelectGameHistoryVideo(position, playbackQueueId);
      }}
      positions={gameHistoryPositions}
      resolvePlaybackQueueId={resolvePlaybackQueueId}
      selectedVideoId={selectedVideoId}
    />
  );

  const activeGameTabContent =
    activeGameTab === 'positions'
      ? positionsContent
      : activeGameTab === 'history'
        ? historyContent
        : leaderboardContent;

  return (
    <RankingGamePanelShell
      activeGameTab={activeGameTab}
      dividendOverview={
        <RankingGameCoinOverview
          coinTierProgress={coinTierProgress}
          onOpenDetails={onOpenCoinModal}
          overview={coinOverview}
          season={currentGameSeason}
        />
      }
      helperText={seasonStatusMessage}
      isCollapsed={isCollapsed}
      isHelperWarning={isCurrentVideoGameHelperWarning}
      onSelectTab={onSelectTab}
      onToggleCollapse={onToggleCollapse}
      season={currentGameSeason}
      selectedVideoActions={selectedVideoActions}
      statusMessage={gameActionStatus}
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
