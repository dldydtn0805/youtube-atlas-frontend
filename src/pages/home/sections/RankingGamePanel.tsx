import './RankingGamePanel.css';
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import type { VideoPlayerHandle } from '../../../components/VideoPlayer/VideoPlayer';
import type {
  GameCurrentSeason,
  GameHighlight,
  GameLeaderboardEntry,
  GamePosition,
  GameTierProgress,
} from '../../../features/game/types';
import { getGameInventorySlotLimit } from '../../../features/game/inventory';
import type { VideoTrendSignal } from '../../../features/trending/types';
import {
  formatPercent,
  formatPoints,
  formatRank,
  formatSeasonDateTime,
  getPointTone,
  type OpenGameHolding,
} from '../gameHelpers';
import { sortHoldingsByProfitRateDesc } from '../gameInventorySorting';
import { buildGameStrategyBadges } from '../gameStrategyTags';
import { GAME_PORTFOLIO_QUEUE_ID, HISTORY_PLAYBACK_QUEUE_ID } from '../utils';
import AchievementTitleBadge from './AchievementTitleBadge';
import GameInventoryCapacity from './GameInventoryCapacity';
import { RankingGameHistoryRow } from './RankingGameHistoryRow';
import GamePanelNyanRefreshIcon from './GamePanelNyanRefreshIcon';
import { RankingGamePositionRow } from './RankingGamePositionRow';
import GameTierSummary from './GameTierSummary';
import GameWalletSummary from './GameWalletSummary';
import MiniVideoPreview from './MiniVideoPreview';
import StickySelectedVideoHeaderCopy from './StickySelectedVideoHeaderCopy';
import useGamePanelPullToRefresh from './useGamePanelPullToRefresh';

type GameTab = 'positions' | 'scheduledOrders' | 'history' | 'guide';

const GAME_PANEL_TABS: ReadonlyArray<{ id: GameTab; label: string }> = [
  { id: 'positions', label: '인벤토리' },
  { id: 'scheduledOrders', label: '대기열' },
  { id: 'history', label: '로그' },
  { id: 'guide', label: '튜토리얼' },
];

const GAME_PANEL_CAROUSEL_GAP = 10;

interface RankingGamePanelShellProps {
  activeGameTab: GameTab;
  tierProgress?: GameTierProgress;
  dividendOverview?: ReactNode;
  enablePullToRefresh?: boolean;
  isCollapsed: boolean;
  onRefreshTab?: (tab: GameTab) => Promise<void> | void;
  onSelectTab: (tab: GameTab) => void;
  onToggleCollapse: () => void;
  season?: GameCurrentSeason;
  selectedVideoActions?: ReactNode;
  summary: {
    computedWalletTotalAssetPoints: number | null;
    openPositionsBuyPoints: number;
    openPositionsEvaluationPoints: number;
    openPositionsProfitPoints: number;
  };
  tabContentById: Record<GameTab, ReactNode>;
  walletUpdatedAt?: number;
}

interface RankingGameSelectedVideoActionsProps {
  buyActionTitle: string;
  canShowGameActions: boolean;
  currentVideoGamePriceSummary: ReactNode;
  isDesktopMiniPlayerEnabled?: boolean;
  desktopPlayerDockSlotRef?: RefObject<HTMLDivElement | null>;
  mainPlayerRef?: RefObject<VideoPlayerHandle | null>;
  isBuyDisabled: boolean;
  isBuySubmitting: boolean;
  isSellDisabled: boolean;
  isSellSubmitting: boolean;
  onContentClick?: () => void;
  onEyebrowClick?: () => void;
  onHeaderClick?: () => void;
  onOpenBuyTradeModal: () => void;
  onOpenSellTradeModal: () => void;
  panelControls?: ReactNode;
  selectedGameActionChannelTitle?: string;
  selectedGameActionTitle: string;
  selectedVideoId?: string;
  selectedVideoTradeThumbnailUrl?: string | null;
  sellActionTitle: string;
}

interface RankingGameLeaderboardTabProps {
  entries: GameLeaderboardEntry[];
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  highlights: GameHighlight[];
  highlightsError: unknown;
  highlightsTitle: string;
  onSelectHighlight: (highlight: GameHighlight) => void;
  onSelectHighlightVideo?: (highlight: GameHighlight) => void;
  selectedUserId: number | null;
  isHighlightsError: boolean;
  isHighlightsLoading: boolean;
  onToggleUser: (userId: number) => void;
  season?: GameCurrentSeason;
}

interface RankingGamePositionsTabProps {
  activePlaybackQueueId?: string;
  canShowGameActions: boolean;
  emptyMessage?: string | null;
  favoriteTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  gameMarketSignalsByVideoId: Record<string, VideoTrendSignal>;
  holdings: OpenGameHolding[];
  currentGameSeason?: GameCurrentSeason;
  isLoading?: boolean;
  onOpenPositionChart?: (position: GamePosition) => void;
  onOpenBuyTradeModal?: (position: GamePosition) => void;
  onOpenSellTradeModal?: (position: GamePosition) => void;
  onSelectPosition: (position: GamePosition) => void;
  openDistinctVideoCount?: number;
  selectedPositionId?: number | null;
  trendSignalsByVideoId: Record<string, VideoTrendSignal>;
}

interface RankingGameHistoryTabProps {
  activePlaybackQueueId?: string;
  emptyMessage?: string | null;
  historyPlaybackLoadingVideoId: string | null;
  isLoading: boolean;
  onOpenPositionChart?: (position: GamePosition) => void;
  onSelectPosition: (position: GamePosition, playbackQueueId?: string) => void;
  positions: GamePosition[];
  resolvePlaybackQueueId: (videoId: string) => string | undefined;
  selectedPositionId?: number | null;
  selectedVideoId?: string;
}

interface RankingGameCoinOverviewProps {
  tierProgress?: GameTierProgress;
  onOpenDetails: () => void;
  season?: GameCurrentSeason;
}

function areRankingGameHistoryTabPropsEqual(
  prevProps: RankingGameHistoryTabProps,
  nextProps: RankingGameHistoryTabProps,
) {
  return (
    prevProps.activePlaybackQueueId === nextProps.activePlaybackQueueId &&
    prevProps.emptyMessage === nextProps.emptyMessage &&
    prevProps.historyPlaybackLoadingVideoId === nextProps.historyPlaybackLoadingVideoId &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.onOpenPositionChart === nextProps.onOpenPositionChart &&
    prevProps.positions === nextProps.positions &&
    prevProps.resolvePlaybackQueueId === nextProps.resolvePlaybackQueueId &&
    prevProps.selectedPositionId === nextProps.selectedPositionId &&
    prevProps.selectedVideoId === nextProps.selectedVideoId
  );
}

function areRankingGamePositionsTabPropsEqual(
  prevProps: RankingGamePositionsTabProps,
  nextProps: RankingGamePositionsTabProps,
) {
  return (
    prevProps.activePlaybackQueueId === nextProps.activePlaybackQueueId &&
    prevProps.canShowGameActions === nextProps.canShowGameActions &&
    prevProps.emptyMessage === nextProps.emptyMessage &&
    prevProps.holdings === nextProps.holdings &&
    prevProps.currentGameSeason === nextProps.currentGameSeason &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.onOpenPositionChart === nextProps.onOpenPositionChart &&
    prevProps.onOpenBuyTradeModal === nextProps.onOpenBuyTradeModal &&
    prevProps.onOpenSellTradeModal === nextProps.onOpenSellTradeModal &&
    prevProps.onSelectPosition === nextProps.onSelectPosition &&
    prevProps.openDistinctVideoCount === nextProps.openDistinctVideoCount &&
    prevProps.selectedPositionId === nextProps.selectedPositionId
  );
}

function formatSignedPercent(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '집계 중';
  }

  if (value > 0) {
    return `+${formatPercent(value)}`;
  }

  if (value < 0) {
    return `-${formatPercent(Math.abs(value))}`;
  }

  return '0%';
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

function formatHighlightScore(score?: number | null) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return '0점';
  }

  return `${score.toLocaleString('ko-KR')}점`;
}

function getLeaderboardHighlightTypeLabel(type: string) {
  if (type === 'ATLAS_SHOT') {
    return '아틀라스 샷';
  }

  if (type === 'GALAXY_SHOT') {
    return '갤럭시 샷';
  }

  if (type === 'SOLAR_SHOT') {
    return '솔라 샷';
  }

  if (type === 'MOONSHOT') {
    return '문샷';
  }

  if (type === 'SNIPE') {
    return '스나이프';
  }

  if (type === 'SMALL_CASHOUT') {
    return '스몰 캐시아웃';
  }

  if (type === 'BIG_CASHOUT') {
    return '빅 캐시아웃';
  }

  return '하이라이트';
}

function LeaderboardHighlightList({
  highlights,
  onSelectHighlight,
  onSelectHighlightVideo,
}: {
  highlights: GameHighlight[];
  onSelectHighlight: (highlight: GameHighlight) => void;
  onSelectHighlightVideo?: (highlight: GameHighlight) => void;
}) {
  return (
    <ul className="app-shell__game-leaderboard-position-list">
      {highlights.map((highlight) => {
        const strategyBadges = buildGameStrategyBadges(highlight.strategyTags, highlight.highlightType);

        return (
          <li key={highlight.id} className="app-shell__game-leaderboard-position-item">
            <article
              className="app-shell__game-leaderboard-position-select"
            >
              {onSelectHighlightVideo ? (
                <button
                  aria-label={`${highlight.videoTitle} 재생`}
                  className="app-shell__game-leaderboard-position-thumb-button"
                  onClick={() => onSelectHighlightVideo(highlight)}
                  type="button"
                >
                  <img
                    alt=""
                    className="app-shell__game-leaderboard-position-thumb"
                    loading="lazy"
                    src={highlight.thumbnailUrl}
                  />
                </button>
              ) : (
                <img
                  alt=""
                  className="app-shell__game-leaderboard-position-thumb"
                  loading="lazy"
                  src={highlight.thumbnailUrl}
                />
              )}
              <button
                className="app-shell__game-leaderboard-position-copy-button"
                onClick={() => onSelectHighlight(highlight)}
                title="이 하이라이트의 순위 추이 차트를 봅니다."
                type="button"
              >
                <div className="app-shell__game-leaderboard-position-copy">
                <p className="app-shell__game-leaderboard-position-title">{highlight.videoTitle}</p>
                <p className="app-shell__game-leaderboard-position-meta">
                  <span className="app-shell__game-leaderboard-position-meta-label">티어 점수</span>{' '}
                  <span className="app-shell__game-leaderboard-position-score">
                    +{formatHighlightScore(highlight.highlightScore)}
                  </span>
                  {' · '}
                  <span className="app-shell__game-leaderboard-position-meta-label">순위</span>{' '}
                  <span>{formatRank(highlight.buyRank)}</span>
                  {' → '}
                  <span>{formatRank(highlight.highlightRank)}</span>
                  {' · '}
                  <span className="app-shell__game-leaderboard-position-meta-label">손익금</span>{' '}
                  <span data-tone={getPointTone(highlight.profitPoints)}>{formatSignedPoints(highlight.profitPoints)}</span>
                  {' · '}
                  <span className="app-shell__game-leaderboard-position-meta-label">손익률</span>{' '}
                  <span data-tone={getPointTone(highlight.profitPoints)}>
                    {formatSignedPercent(highlight.profitRatePercent)}
                  </span>
                </p>
                <div className="app-shell__game-leaderboard-position-detail">
                  <span className="app-shell__game-leaderboard-position-badges">
                    {strategyBadges.map((badge) => (
                      <span
                        key={`${highlight.id}-${badge.type}`}
                        className="app-shell__game-leaderboard-position-tag"
                        data-tone={badge.tone}
                      >
                        {badge.label}
                      </span>
                    ))}
                    {strategyBadges.length === 0 ? (
                      <span
                        className="app-shell__game-leaderboard-position-tag"
                        data-tone="moonshot"
                      >
                        {getLeaderboardHighlightTypeLabel(highlight.highlightType)}
                      </span>
                    ) : null}
                  </span>
                  <p className="app-shell__game-leaderboard-position-description">{highlight.description}</p>
                </div>
              </div>
              </button>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

function LeaderboardHighlightsPanel({
  highlights,
  highlightsError,
  highlightsTitle,
  isError,
  isExpanded,
  isLoading,
  onSelectHighlight,
  onSelectHighlightVideo,
}: {
  highlights: GameHighlight[];
  highlightsError: unknown;
  highlightsTitle: string;
  isError: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  onSelectHighlight: (highlight: GameHighlight) => void;
  onSelectHighlightVideo?: (highlight: GameHighlight) => void;
}) {
  if (!isExpanded) {
    return null;
  }

  return (
    <div className="app-shell__game-leaderboard-positions" aria-label={highlightsTitle}>
      <p className="app-shell__game-leaderboard-positions-title">{highlightsTitle}</p>
      {isLoading ? (
        <p className="app-shell__game-leaderboard-positions-status">하이라이트를 불러오는 중입니다.</p>
      ) : isError ? (
        <p className="app-shell__game-leaderboard-positions-status">
          {highlightsError instanceof Error ? highlightsError.message : '하이라이트를 불러오지 못했습니다.'}
        </p>
      ) : highlights.length > 0 ? (
        <LeaderboardHighlightList
          highlights={highlights}
          onSelectHighlight={onSelectHighlight}
          onSelectHighlightVideo={onSelectHighlightVideo}
        />
      ) : (
        <p className="app-shell__game-leaderboard-positions-status">아직 하이라이트가 없습니다.</p>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  highlights,
  highlightsError,
  highlightsTitle,
  isExpanded,
  isHighlightsError,
  isHighlightsLoading,
  onSelectHighlight,
  onSelectHighlightVideo,
  onToggleUser,
}: {
  entry: GameLeaderboardEntry;
  highlights: GameHighlight[];
  highlightsError: unknown;
  highlightsTitle: string;
  isExpanded: boolean;
  isHighlightsError: boolean;
  isHighlightsLoading: boolean;
  onSelectHighlight: (highlight: GameHighlight) => void;
  onSelectHighlightVideo?: (highlight: GameHighlight) => void;
  onToggleUser: (userId: number) => void;
}) {
  return (
    <div className="app-shell__game-leaderboard-row">
      <button
        className="app-shell__game-leaderboard-item app-shell__game-leaderboard-item--button"
        data-expanded={isExpanded}
        data-me={entry.me}
        data-tier-code={entry.currentTier.tierCode}
        onClick={() => onToggleUser(entry.userId)}
        type="button"
      >
        <div className="app-shell__game-leaderboard-rank">{entry.rank}</div>
        {entry.pictureUrl ? (
          <img
            alt={`${entry.displayName} 프로필`}
            className="app-shell__game-leaderboard-avatar"
            loading="lazy"
            src={entry.pictureUrl}
          />
        ) : (
          <span
            aria-hidden="true"
            className="app-shell__game-leaderboard-avatar app-shell__game-leaderboard-avatar--fallback"
          >
            {(entry.displayName || 'A').slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="app-shell__game-leaderboard-copy">
          <div className="app-shell__game-leaderboard-head">
            <div className="app-shell__game-leaderboard-identity">
              <p className="app-shell__game-leaderboard-name">{entry.displayName}</p>
              {entry.selectedAchievementTitle ? (
                <AchievementTitleBadge title={entry.selectedAchievementTitle} />
              ) : null}
            </div>
            <p className="app-shell__game-leaderboard-total" title={formatHighlightScore(entry.highlightScore)}>
              {formatHighlightScore(entry.highlightScore)}
            </p>
          </div>
        </div>
        <span className="app-shell__game-leaderboard-expand" aria-hidden="true">
          ▾
        </span>
      </button>
      <LeaderboardHighlightsPanel
        highlights={highlights}
        highlightsError={highlightsError}
        highlightsTitle={highlightsTitle}
        isError={isHighlightsError}
        isExpanded={isExpanded}
        isLoading={isHighlightsLoading}
        onSelectHighlight={onSelectHighlight}
        onSelectHighlightVideo={onSelectHighlightVideo}
      />
    </div>
  );
}

export function RankingGamePanelShell({
  activeGameTab,
  tierProgress,
  dividendOverview,
  enablePullToRefresh = true,
  isCollapsed,
  onRefreshTab,
  onSelectTab,
  onToggleCollapse,
  season,
  selectedVideoActions,
  summary,
  tabContentById,
  walletUpdatedAt,
}: RankingGamePanelShellProps) {
  const hasDividendOverview = Boolean(dividendOverview);
  const hasSelectedVideoActions = Boolean(selectedVideoActions);
  const [trackIndex, setTrackIndex] = useState(GAME_PANEL_TABS.findIndex((tab) => tab.id === activeGameTab) + 1);
  const [isTrackAnimating, setIsTrackAnimating] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const skipNextActiveTabSyncRef = useRef(false);
  const {
    bind: pullToRefreshBind,
    isReadyToRefresh,
    isRefreshing,
    pullDistance,
  } = useGamePanelPullToRefresh({
    activeTab: activeGameTab,
    disabled: !enablePullToRefresh || !onRefreshTab || activeGameTab === 'guide',
    onRefresh: onRefreshTab,
  });
  const carouselTabs = useMemo(
    () => [GAME_PANEL_TABS[GAME_PANEL_TABS.length - 1], ...GAME_PANEL_TABS, GAME_PANEL_TABS[0]],
    [],
  );

  useEffect(() => {
    const nextIndex = GAME_PANEL_TABS.findIndex((tab) => tab.id === activeGameTab);

    if (nextIndex < 0) {
      return;
    }

    if (skipNextActiveTabSyncRef.current) {
      skipNextActiveTabSyncRef.current = false;
      return;
    }

    setIsTrackAnimating(true);
    setTrackIndex(nextIndex + 1);
  }, [activeGameTab]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || typeof window === 'undefined') {
      return;
    }

    const syncViewportWidth = () => {
      const nextWidth = Math.max(viewport.clientWidth, 1);
      setViewportWidth(nextWidth);
    };

    syncViewportWidth();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncViewportWidth);
    resizeObserver?.observe(viewport);
    window.addEventListener('resize', syncViewportWidth);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', syncViewportWidth);
    };
  }, []);

  useEffect(() => {
    viewportRef.current
      ?.querySelectorAll<HTMLElement>(`[data-game-panel-tab="${activeGameTab}"]`)
      .forEach((panel) => {
        panel.scrollTo({ top: 0 });
      });
  }, [activeGameTab]);

  const handleSelectTab = (nextTab: GameTab) => {
    const nextIndex = GAME_PANEL_TABS.findIndex((tab) => tab.id === nextTab);

    if (nextIndex < 0) {
      return;
    }

    skipNextActiveTabSyncRef.current = true;
    setIsTrackAnimating(true);
    setTrackIndex(nextIndex + 1);
    onSelectTab(nextTab);
  };

  const handleTrackTransitionEnd = () => {
    if (trackIndex === 0) {
      setIsTrackAnimating(false);
      setTrackIndex(GAME_PANEL_TABS.length);
      return;
    }

    if (trackIndex === GAME_PANEL_TABS.length + 1) {
      setIsTrackAnimating(false);
      setTrackIndex(1);
    }
  };

  const isViewportReady = viewportWidth > 1;
  const slideWidth = Math.max(viewportWidth, 1);
  const slideSpan = slideWidth + GAME_PANEL_CAROUSEL_GAP;
  const trackTranslateX = -trackIndex * slideSpan;
  const pullProgress = Math.min(pullDistance / 64, 1);

  return (
    <div className="app-shell__game-panel" data-current-tier={tierProgress?.currentTier.tierCode}>
      <div className="app-shell__game-panel-header">
        <div className="app-shell__game-panel-copy">
          <p className="app-shell__game-panel-eyebrow">Ranking Game</p>
          <div className="app-shell__game-panel-title-row">
            <h3 className="app-shell__game-panel-title">{season ? `${season.regionCode} 시즌` : '시즌 준비 중'}</h3>
            <button
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? '랭킹 게임 펼치기' : '랭킹 게임 숨기기'}
              className="app-shell__collapse-toggle"
              data-active={isCollapsed}
              onClick={onToggleCollapse}
              type="button"
            >
              <span className="app-shell__collapse-toggle-icon" aria-hidden="true">
                ▾
              </span>
            </button>
          </div>
          {season ? (
            <p className="app-shell__game-panel-subtle">종료 {formatSeasonDateTime(season.endAt)}</p>
          ) : null}
        </div>
      </div>
      {!isCollapsed ? (
        <>
          <div
            className="app-shell__game-panel-overview"
            data-has-actions={hasSelectedVideoActions}
            data-has-dividend={hasDividendOverview}
          >
            <div
              className="app-shell__game-panel-overview-pages"
              data-has-dividend={hasDividendOverview}
            >
              <div className="app-shell__game-panel-overview-side">
                <GameWalletSummary
                  computedWalletTotalAssetPoints={summary.computedWalletTotalAssetPoints}
                  currentTierCode={tierProgress?.currentTier.tierCode}
                  openPositionsBuyPoints={summary.openPositionsBuyPoints}
                  openPositionsEvaluationPoints={summary.openPositionsEvaluationPoints}
                  openPositionsProfitPoints={summary.openPositionsProfitPoints}
                  season={season}
                  walletUpdatedAt={walletUpdatedAt}
                />
              </div>
              {dividendOverview ? (
                <div className="app-shell__game-panel-overview-main app-shell__game-panel-overview-main--dividend">
                  {dividendOverview}
                </div>
              ) : null}
            </div>
            {selectedVideoActions ? (
              <div className="app-shell__game-panel-overview-main app-shell__game-panel-overview-main--actions">
                {selectedVideoActions}
              </div>
            ) : null}
          </div>
          <div aria-label="게임 패널 탭" className="app-shell__game-tabs" role="tablist">
            {GAME_PANEL_TABS.map((tab) => (
              <button
                key={tab.id}
                aria-selected={activeGameTab === tab.id}
                className="app-shell__game-tab"
                data-active={activeGameTab === tab.id}
                onClick={() => handleSelectTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div
            ref={viewportRef}
            className="app-shell__game-tab-panel app-shell__game-tab-panel--carousel"
            role="tabpanel"
          >
            {isViewportReady ? (
              <div
                className="app-shell__game-tab-track"
                data-animating={isTrackAnimating ? 'true' : 'false'}
                onTransitionEnd={handleTrackTransitionEnd}
                style={{
                  '--game-panel-carousel-gap': `${GAME_PANEL_CAROUSEL_GAP}px`,
                  '--game-panel-slide-width': `${slideWidth}px`,
                  transform: `translateX(${trackTranslateX}px)`,
                } as CSSProperties}
              >
                {carouselTabs.map((tab, index) => (
                  <div key={`${tab.id}-${index}`} className="app-shell__game-tab-slide">
                    <div
                      {...(tab.id === activeGameTab ? pullToRefreshBind : undefined)}
                      className="app-shell__game-tab-slide-panel"
                      data-game-panel-tab={tab.id}
                    >
                      {tab.id === activeGameTab ? (
                        <div
                          aria-hidden={!isRefreshing}
                          className="app-shell__game-tab-pull-indicator"
                          data-ready={isReadyToRefresh || undefined}
                          data-refreshing={isRefreshing || undefined}
                          data-visible={pullDistance > 0 || isRefreshing || undefined}
                          style={{
                            '--game-tab-pull-distance': `${pullDistance}px`,
                            '--game-tab-pull-progress': `${pullProgress}`,
                          } as CSSProperties}
                        >
                          <span className="app-shell__game-tab-pull-indicator-spinner" aria-hidden="true">
                            <GamePanelNyanRefreshIcon />
                          </span>
                        </div>
                      ) : null}
                      {tabContentById[tab.id]}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function RankingGameTierOverview({
  tierProgress,
  onOpenDetails,
  season,
}: RankingGameCoinOverviewProps) {
  if (!tierProgress && !season) {
    return null;
  }

  const highlightScoreLabel = tierProgress
    ? `${tierProgress.highlightScore.toLocaleString('ko-KR')}점`
    : '-';

  return (
    <section
      className="app-shell__game-dividend app-shell__game-dividend--preview"
      aria-label="하이라이트 티어 미리보기"
      data-current-tier={tierProgress?.currentTier.tierCode}
    >
      <GameTierSummary
        progress={tierProgress}
        showLadder={false}
        surfaceVariant="highlight-tier"
        title="현재 티어 카드"
      />
      <div className="app-shell__game-dividend-header">
        <div className="app-shell__game-dividend-copy">
          <p className="app-shell__game-dividend-eyebrow">Highlight Tier</p>
          <div className="app-shell__game-dividend-title-row">
            <h4 className="app-shell__game-dividend-title">
              하이라이트 티어
            </h4>
            <button
              className="app-shell__game-dividend-action app-shell__game-dividend-action--compact"
              onClick={onOpenDetails}
              type="button"
            >
              상세 보기
            </button>
          </div>
        </div>
      </div>
      {tierProgress ? (
        <div className="app-shell__game-dividend-metrics app-shell__game-dividend-metrics--preview" aria-label="하이라이트 티어 요약">
          <span className="app-shell__game-dividend-metric">
            <span className="app-shell__game-dividend-metric-label">점수</span>
            <strong
              className="app-shell__game-dividend-metric-value"
              title={highlightScoreLabel}
            >
              {highlightScoreLabel}
            </strong>
            <span className="app-shell__game-dividend-metric-detail" aria-hidden="true" />
          </span>
          <span className="app-shell__game-dividend-metric">
            <span className="app-shell__game-dividend-metric-label">현재 티어</span>
            <strong className="app-shell__game-dividend-metric-value">
              {tierProgress.currentTier.displayName}
            </strong>
            <span className="app-shell__game-dividend-metric-detail">
              {tierProgress.nextTier
                ? `다음 ${tierProgress.nextTier.displayName}`
                : '최고 티어'}
            </span>
          </span>
        </div>
      ) : null}
    </section>
  );
}

export function RankingGameSelectedVideoActions({
  buyActionTitle,
  canShowGameActions,
  currentVideoGamePriceSummary,
  desktopPlayerDockSlotRef,
  isDesktopMiniPlayerEnabled = false,
  mainPlayerRef,
  isBuyDisabled,
  isBuySubmitting,
  isSellDisabled,
  isSellSubmitting,
  onContentClick,
  onEyebrowClick,
  onHeaderClick,
  onOpenBuyTradeModal,
  onOpenSellTradeModal,
  panelControls,
  selectedGameActionChannelTitle,
  selectedGameActionTitle,
  selectedVideoId,
  selectedVideoTradeThumbnailUrl,
  sellActionTitle,
}: RankingGameSelectedVideoActionsProps) {
  return (
    <div className="app-shell__game-panel-actions">
      <div
        aria-expanded={onHeaderClick ? 'true' : undefined}
        className="app-shell__game-panel-actions-header"
        data-clickable={onHeaderClick ? 'true' : undefined}
        onClick={onHeaderClick}
        onKeyDown={
          onHeaderClick
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onHeaderClick();
                }
              }
            : undefined
        }
        role={onHeaderClick ? 'button' : undefined}
        tabIndex={onHeaderClick ? 0 : undefined}
      >
        <StickySelectedVideoHeaderCopy
          label="Now Playing"
          onLabelClick={onEyebrowClick}
          title={selectedGameActionTitle}
        />
        {panelControls ? (
          <div
            className="app-shell__game-panel-actions-utility"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {panelControls}
          </div>
        ) : null}
      </div>
      <div
        aria-expanded={onContentClick ? 'true' : undefined}
        className="app-shell__game-panel-actions-content"
        data-clickable={onContentClick ? 'true' : undefined}
        onClick={onContentClick}
        onKeyDown={
          onContentClick
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onContentClick();
                }
              }
            : undefined
        }
        role={onContentClick ? 'button' : undefined}
        tabIndex={onContentClick ? 0 : undefined}
      >
        <div className="app-shell__game-panel-actions-main">
          {desktopPlayerDockSlotRef ? (
            <div
              ref={desktopPlayerDockSlotRef}
              aria-hidden="true"
              className="app-shell__game-panel-actions-thumb app-shell__game-panel-actions-thumb-player app-shell__game-panel-actions-thumb-slot"
            />
          ) : isDesktopMiniPlayerEnabled && selectedVideoId ? (
            <MiniVideoPreview
              containerClassName="app-shell__game-panel-actions-thumb app-shell__game-panel-actions-thumb-player"
              frameClassName="app-shell__game-panel-actions-thumb-frame"
              mainPlayerRef={mainPlayerRef}
              selectedVideoId={selectedVideoId}
            />
          ) : selectedVideoTradeThumbnailUrl ? (
            <img
              alt=""
              className="app-shell__game-panel-actions-thumb"
              loading="lazy"
              src={selectedVideoTradeThumbnailUrl}
            />
          ) : null}
          <div className="app-shell__game-panel-actions-body">
            <p className="app-shell__game-panel-actions-title">{selectedGameActionTitle}</p>
            {selectedGameActionChannelTitle ? (
              <p className="app-shell__game-panel-actions-channel">{selectedGameActionChannelTitle}</p>
            ) : null}
            {currentVideoGamePriceSummary}
          </div>
        </div>
        <div
          className="app-shell__game-panel-actions-buttons"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <div className="app-shell__game-panel-action-item">
            <button
              aria-label={isBuySubmitting ? '선택한 영상 매수 중' : '선택한 영상 매수'}
              className="app-shell__game-panel-action"
              data-variant="buy"
              disabled={!canShowGameActions || isBuyDisabled}
              onClick={onOpenBuyTradeModal}
              title={!canShowGameActions ? '전체 카테고리에서만 매수할 수 있습니다.' : buyActionTitle}
              type="button"
            >
              <span className="app-shell__game-panel-action-icon" aria-hidden="true">
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
            <span className="app-shell__game-panel-action-caption">{isBuySubmitting ? '매수 중' : '매수'}</span>
          </div>
          <div className="app-shell__game-panel-action-item">
            <button
              aria-label={isSellSubmitting ? '선택한 영상 매도 중' : '선택한 영상 매도'}
              className="app-shell__game-panel-action"
              data-variant="sell"
              disabled={isSellDisabled}
              onClick={onOpenSellTradeModal}
              title={sellActionTitle}
              type="button"
            >
              <span className="app-shell__game-panel-action-icon" aria-hidden="true">
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
            <span className="app-shell__game-panel-action-caption">{isSellSubmitting ? '매도 중' : '매도'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RankingGameLeaderboardTab({
  entries,
  error,
  highlights,
  highlightsError,
  highlightsTitle,
  isError,
  isHighlightsError,
  isHighlightsLoading,
  isLoading,
  onSelectHighlight,
  onSelectHighlightVideo,
  selectedUserId,
  onToggleUser,
  season,
}: RankingGameLeaderboardTabProps) {
  const topEntries = entries.slice(0, 10);
  const myEntry = entries.find((entry) => entry.me);

  if (isError) {
    return (
      <p className="app-shell__game-empty">
        {error instanceof Error ? error.message : '리더보드를 불러오지 못했습니다.'}
      </p>
    );
  }

  if (topEntries.length === 0) {
    return season ? (
      <div className="app-shell__game-leaderboard-shell" data-loading={isLoading}>
        {!isLoading ? (
          <p className="app-shell__game-empty app-shell__game-leaderboard-empty">아직 리더보드에 표시할 참가자가 없습니다.</p>
        ) : null}
        {isLoading ? (
          <div className="app-shell__game-leaderboard-overlay" role="status" aria-live="polite">
            <span className="app-shell__game-leaderboard-overlay-spinner" aria-hidden="true" />
            <span className="sr-only">리더보드 불러오는 중</span>
          </div>
        ) : null}
      </div>
    ) : null;
  }

  return (
    <div className="app-shell__game-leaderboard-shell" data-loading={isLoading}>
      <div className="app-shell__game-leaderboard-stack">
        <ol className="app-shell__game-leaderboard">
          {topEntries.map((entry) => (
            <li key={entry.userId} className="app-shell__game-leaderboard-row">
              <LeaderboardRow
                entry={entry}
                highlights={highlights}
                highlightsError={highlightsError}
                highlightsTitle={highlightsTitle}
                isExpanded={selectedUserId === entry.userId}
                isHighlightsError={isHighlightsError}
                isHighlightsLoading={isHighlightsLoading}
                onSelectHighlight={onSelectHighlight}
                onSelectHighlightVideo={onSelectHighlightVideo}
                onToggleUser={onToggleUser}
              />
            </li>
          ))}
        </ol>
        {myEntry ? (
          <section className="app-shell__game-leaderboard-pinned" aria-label="내 순위">
            <p className="app-shell__game-leaderboard-pinned-label">내 순위</p>
            <LeaderboardRow
              entry={myEntry}
              highlights={highlights}
              highlightsError={highlightsError}
              highlightsTitle={highlightsTitle}
              isExpanded={selectedUserId === myEntry.userId}
              isHighlightsError={isHighlightsError}
              isHighlightsLoading={isHighlightsLoading}
              onSelectHighlight={onSelectHighlight}
              onSelectHighlightVideo={onSelectHighlightVideo}
              onToggleUser={onToggleUser}
            />
          </section>
        ) : null}
      </div>
      {isLoading ? (
        <div className="app-shell__game-leaderboard-overlay" role="status" aria-live="polite">
          <span className="app-shell__game-leaderboard-overlay-spinner" aria-hidden="true" />
          <span className="sr-only">리더보드 불러오는 중</span>
        </div>
      ) : null}
    </div>
  );
}

function RankingGamePositionsTabComponent({
  activePlaybackQueueId,
  canShowGameActions,
  emptyMessage,
  holdings,
  currentGameSeason,
  isLoading = false,
  onOpenPositionChart,
  onOpenBuyTradeModal,
  onOpenSellTradeModal,
  onSelectPosition,
  openDistinctVideoCount,
  selectedPositionId,
}: RankingGamePositionsTabProps) {
  const inventoryOpenCount =
    openDistinctVideoCount ?? new Set(holdings.map((holding) => holding.videoId)).size;
  const maxOpenPositions = currentGameSeason ? getGameInventorySlotLimit(currentGameSeason) : null;
  const sortedHoldings = useMemo(() => sortHoldingsByProfitRateDesc(holdings), [holdings]);
  const inventorySummary = (
    <GameInventoryCapacity
      currentGameSeason={currentGameSeason}
      maxOpenPositions={maxOpenPositions}
      openDistinctVideoCount={inventoryOpenCount}
    />
  );

  if (isLoading) {
    return (
      <>
        {inventorySummary}
        <div className="app-shell__game-tab-loading-shell" data-loading>
          <div className="app-shell__game-tab-loading-overlay" role="status" aria-live="polite">
            <span className="app-shell__game-tab-loading-spinner" aria-hidden="true" />
            <span className="sr-only">인벤토리 불러오는 중</span>
          </div>
        </div>
      </>
    );
  }

  if (holdings.length === 0) {
    return (
      <>
        {inventorySummary}
        {emptyMessage ? <p className="app-shell__game-empty app-shell__game-empty--panel-centered">{emptyMessage}</p> : null}
      </>
    );
  }

  return (
    <>
      {inventorySummary}
      <ul className="app-shell__game-positions">
        {sortedHoldings.map((holding) => (
          <RankingGamePositionRow
            key={holding.positionId}
            canShowGameActions={canShowGameActions}
            holding={holding}
            isSelected={activePlaybackQueueId === GAME_PORTFOLIO_QUEUE_ID && holding.positionId === selectedPositionId}
            onOpenPositionChart={onOpenPositionChart}
            onOpenBuyTradeModal={onOpenBuyTradeModal}
            onOpenSellTradeModal={onOpenSellTradeModal}
            onSelectPosition={onSelectPosition}
          />
        ))}
      </ul>
    </>
  );
}

export const RankingGamePositionsTab = memo(
  RankingGamePositionsTabComponent,
  areRankingGamePositionsTabPropsEqual,
);

function RankingGameHistoryTabComponent({
  activePlaybackQueueId,
  emptyMessage,
  historyPlaybackLoadingVideoId,
  isLoading,
  onOpenPositionChart,
  onSelectPosition,
  positions,
  resolvePlaybackQueueId,
  selectedPositionId,
  selectedVideoId,
}: RankingGameHistoryTabProps) {
  const historyListRef = useRef<HTMLUListElement | null>(null);
  const selectedHistoryItemRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const historyList = historyListRef.current;
    const selectedHistoryItem = selectedHistoryItemRef.current;

    if (!historyList || !selectedHistoryItem) {
      return;
    }

    const selectedItemTop = selectedHistoryItem.offsetTop;
    const selectedItemBottom = selectedItemTop + selectedHistoryItem.offsetHeight;
    const visibleTop = historyList.scrollTop;
    const visibleBottom = visibleTop + historyList.clientHeight;
    const selectedItemLeft = selectedHistoryItem.offsetLeft;
    const selectedItemRight = selectedItemLeft + selectedHistoryItem.offsetWidth;
    const visibleLeft = historyList.scrollLeft;
    const visibleRight = visibleLeft + historyList.clientWidth;

    if (selectedItemTop < visibleTop) {
      historyList.scrollTop = selectedItemTop;
    } else if (selectedItemBottom > visibleBottom) {
      historyList.scrollTop = selectedItemBottom - historyList.clientHeight;
    }

    if (selectedItemLeft < visibleLeft) {
      historyList.scrollLeft = selectedItemLeft;
    } else if (selectedItemRight > visibleRight) {
      historyList.scrollLeft = selectedItemRight - historyList.clientWidth;
    }
  }, [activePlaybackQueueId, positions, selectedPositionId, selectedVideoId]);

  if (isLoading) {
    return (
      <div className="app-shell__game-tab-loading-shell app-shell__game-tab-loading-shell--history" data-loading>
        <div className="app-shell__game-tab-loading-overlay" role="status" aria-live="polite">
          <span className="app-shell__game-tab-loading-spinner" aria-hidden="true" />
          <span className="sr-only">거래내역 불러오는 중</span>
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return emptyMessage ? <p className="app-shell__game-empty app-shell__game-empty--panel-centered">{emptyMessage}</p> : null;
  }

  return (
    <ul ref={historyListRef} className="app-shell__game-history">
      {positions.map((position) => {
        const isSelectedPosition =
          activePlaybackQueueId === HISTORY_PLAYBACK_QUEUE_ID &&
          position.id === selectedPositionId &&
          position.videoId === selectedVideoId;

        return (
          <RankingGameHistoryRow
            key={position.id}
            historyPlaybackLoadingVideoId={historyPlaybackLoadingVideoId}
            isSelected={isSelectedPosition}
            itemRef={isSelectedPosition ? selectedHistoryItemRef : undefined}
            onOpenPositionChart={onOpenPositionChart}
            onSelectPosition={onSelectPosition}
            position={position}
            resolvePlaybackQueueId={resolvePlaybackQueueId}
          />
        );
      })}
    </ul>
  );
}

export const RankingGameHistoryTab = memo(
  RankingGameHistoryTabComponent,
  areRankingGameHistoryTabPropsEqual,
);
