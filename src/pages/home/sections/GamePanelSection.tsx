import { useCallback, type ReactNode } from 'react';
import type { AuthStatus } from '../../../features/auth/types';
import type {
  GameCoinTierProgress,
  GameCurrentSeason,
  GameHighlight,
  GamePosition,
} from '../../../features/game/types';
import type { VideoTrendSignal } from '../../../features/trending/types';
import type { YouTubeCategorySection } from '../../../features/youtube/types';
import { findPlaybackQueueIdForVideo } from '../utils';
import type { OpenGameHolding } from '../gameHelpers';
import {
  RankingGameCoinOverview,
  RankingGameHistoryTab,
  RankingGamePanelShell,
  RankingGamePositionsTab,
} from './RankingGamePanel';
import GameHighlightsTab from './GameHighlightsTab';

type GameTab = 'positions' | 'highlights' | 'history' | 'guide';

interface GamePanelSectionProps {
  activeGameTab: GameTab;
  activePlaybackQueueId?: string;
  authStatus: AuthStatus;
  canShowGameActions: boolean;
  coinTierProgress?: GameCoinTierProgress;
  computedWalletTotalAssetPoints: number | null;
  currentGameSeason?: GameCurrentSeason;
  currentGameSeasonUpdatedAt: number;
  favoriteStreamerVideoSection?: YouTubeCategorySection;
  favoriteTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  gameHistoryPositions: GamePosition[];
  gameHighlights: GameHighlight[];
  gameMarketSignalsByVideoId: Record<string, VideoTrendSignal>;
  gamePortfolioSection: YouTubeCategorySection;
  hasApiConfigured: boolean;
  historyPlaybackLoadingVideoId: string | null;
  historyPlaybackSection?: YouTubeCategorySection;
  isGameHistoryLoading: boolean;
  isGameHighlightsLoading: boolean;
  isCollapsed: boolean;
  newChartEntriesSection?: YouTubeCategorySection;
  onOpenCoinModal: () => void;
  onSelectGameHighlight: (highlight: GameHighlight) => void;
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
  trendSignalsByVideoId: Record<string, VideoTrendSignal>;
}

export default function GamePanelSection({
  activeGameTab,
  activePlaybackQueueId,
  authStatus,
  canShowGameActions,
  coinTierProgress,
  computedWalletTotalAssetPoints,
  currentGameSeason,
  currentGameSeasonUpdatedAt,
  favoriteStreamerVideoSection,
  favoriteTrendSignalsByVideoId,
  gameHistoryPositions,
  gameHighlights,
  gameMarketSignalsByVideoId,
  gamePortfolioSection,
  hasApiConfigured,
  historyPlaybackLoadingVideoId,
  historyPlaybackSection,
  isGameHistoryLoading,
  isGameHighlightsLoading,
  isCollapsed,
  newChartEntriesSection,
  onOpenCoinModal,
  onSelectGameHighlight,
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
      onSelectPosition={(position, playbackQueueId) => {
        void onSelectGameHistoryVideo(position, playbackQueueId);
      }}
      positions={gameHistoryPositions}
      resolvePlaybackQueueId={resolvePlaybackQueueId}
      selectedPositionId={selectedPositionId}
      selectedVideoId={selectedVideoId}
    />
  );
  const highlightsContent = (
    <GameHighlightsTab
      highlights={gameHighlights}
      isLoading={isGameHighlightsLoading}
      onSelectHighlight={onSelectGameHighlight}
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
            문샷은 100위 밖에서 사서 20위 안에 들면, 스나이프는 150위 밖에서 사서 100위 안에 들면
            기록됩니다. 캐시아웃은 수익률 300% 이상일 때 쌓이고 큰 수익은 추가 점수도 붙어요. 시즌 티어와
            랭킹은 이 점수로 결정돼요.
          </p>
        </li>
        <li className="app-shell__game-guide-item">
          <strong className="app-shell__game-guide-title">기록과 경쟁</strong>
          <p className="app-shell__game-guide-copy">
            거래내역에서 내가 했던 선택들을 돌아보고, 리더보드에서 다른 유저들과 이번 시즌 순위를
            비교해보세요. 1위를 노려봐요!
          </p>
        </li>
      </ol>
    </div>
  );

  const activeGameTabContent =
    activeGameTab === 'positions'
      ? positionsContent
      : activeGameTab === 'highlights'
        ? highlightsContent
      : activeGameTab === 'history'
        ? historyContent
        : guideContent;

  return (
    <RankingGamePanelShell
      activeGameTab={activeGameTab}
      coinTierProgress={coinTierProgress}
      dividendOverview={
        <RankingGameCoinOverview
          coinTierProgress={coinTierProgress}
          onOpenDetails={onOpenCoinModal}
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
