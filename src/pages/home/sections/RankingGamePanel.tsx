import './RankingGamePanel.css';
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
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
import type { VideoTrendSignal } from '../../../features/trending/types';
import {
  calculateGameUnitPricePoints,
  formatGameQuantity,
  formatGameTimestamp,
  formatHoldCountdown,
  formatMaybePoints,
  formatPercent,
  formatPoints,
  formatRank,
  formatSeasonDateTime,
  getPointTone,
  type OpenGameHolding,
} from '../gameHelpers';
import { buildGameStrategyBadges, buildPositionStrategyBadges } from '../gameStrategyTags';
import {
  calculateSellFeePoints,
  formatSignedProfitRate,
  GAME_PORTFOLIO_QUEUE_ID,
  HISTORY_PLAYBACK_QUEUE_ID,
} from '../utils';
import AchievementTitleBadge from './AchievementTitleBadge';
import GameTierSummary from './GameTierSummary';
import GameWalletSummary from './GameWalletSummary';
import MiniVideoPreview from './MiniVideoPreview';
import StickySelectedVideoHeaderCopy from './StickySelectedVideoHeaderCopy';
import { lockSwipeScroll } from '../hooks/swipeScrollLock';
import { resolveSwipeDirection } from '../hooks/swipeDirection';

type GameTab = 'positions' | 'scheduledOrders' | 'history' | 'guide';

const GAME_PANEL_TABS: ReadonlyArray<{ id: GameTab; label: string }> = [
  { id: 'positions', label: '인벤토리' },
  { id: 'scheduledOrders', label: '대기열' },
  { id: 'history', label: '로그' },
  { id: 'guide', label: '튜토리얼' },
];

const GAME_PANEL_SWIPE_THRESHOLD = 56;
const GAME_PANEL_DIRECTION_LOCK_THRESHOLD = 10;
const GAME_PANEL_CAROUSEL_GAP = 10;
const GAME_PANEL_INTERACTIVE_SWIPE_SELECTOR = 'input, textarea, select';

function getWrappedGamePanelTabIndex(index: number) {
  return (index + GAME_PANEL_TABS.length) % GAME_PANEL_TABS.length;
}

function shouldIgnoreGamePanelSwipeTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && target.closest(GAME_PANEL_INTERACTIVE_SWIPE_SELECTOR);
}

function inferGrossSellPointsFromSettled(settledPoints?: number | null) {
  if (typeof settledPoints !== 'number' || !Number.isFinite(settledPoints) || settledPoints < 0) {
    return null;
  }

  return Math.floor((settledPoints * 1000) / 997);
}

interface RankingGamePanelShellProps {
  activeGameTab: GameTab;
  tierProgress?: GameTierProgress;
  dividendOverview?: ReactNode;
  isCollapsed: boolean;
  onSelectTab: (tab: GameTab) => void;
  onToggleCollapse: () => void;
  season?: GameCurrentSeason;
  selectedVideoActions?: ReactNode;
  summary: {
    computedWalletTotalAssetPoints: number | null;
    openDistinctVideoCount: number;
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
  isLoading?: boolean;
  onOpenPositionChart?: (position: GamePosition) => void;
  onOpenBuyTradeModal?: (position: GamePosition) => void;
  onOpenSellTradeModal?: (position: GamePosition) => void;
  onSelectPosition: (position: GamePosition) => void;
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

function LeaderboardHighlightList({
  highlights,
  onSelectHighlight,
}: {
  highlights: GameHighlight[];
  onSelectHighlight: (highlight: GameHighlight) => void;
}) {
  return (
    <ul className="app-shell__game-leaderboard-position-list">
      {highlights.map((highlight) => {
        const strategyBadges = buildGameStrategyBadges(highlight.strategyTags, highlight.highlightType);

        return (
          <li key={highlight.id} className="app-shell__game-leaderboard-position-item">
            <button
              className="app-shell__game-leaderboard-position-select"
              onClick={() => onSelectHighlight(highlight)}
              title="이 하이라이트의 순위 추이 차트를 봅니다."
              type="button"
            >
              <img
                alt=""
                className="app-shell__game-leaderboard-position-thumb"
                loading="lazy"
                src={highlight.thumbnailUrl}
              />
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
}: {
  highlights: GameHighlight[];
  highlightsError: unknown;
  highlightsTitle: string;
  isError: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  onSelectHighlight: (highlight: GameHighlight) => void;
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
        <LeaderboardHighlightList highlights={highlights} onSelectHighlight={onSelectHighlight} />
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
      />
    </div>
  );
}

export function RankingGamePanelShell({
  activeGameTab,
  tierProgress,
  dividendOverview,
  isCollapsed,
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
  const [dragOffset, setDragOffset] = useState(0);
  const [trackIndex, setTrackIndex] = useState(GAME_PANEL_TABS.findIndex((tab) => tab.id === activeGameTab) + 1);
  const [isTrackAnimating, setIsTrackAnimating] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const skipNextActiveTabSyncRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const directionLockRef = useRef<'horizontal' | 'vertical' | null>(null);
  const shouldSuppressClickRef = useRef(false);
  const viewportWidthRef = useRef(0);
  const releaseScrollLockRef = useRef<(() => void) | null>(null);
  const activeIndex = GAME_PANEL_TABS.findIndex((tab) => tab.id === activeGameTab);
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
    setDragOffset(0);
    setTrackIndex(nextIndex + 1);
  }, [activeGameTab]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || typeof window === 'undefined') {
      return;
    }

    const syncViewportWidth = () => {
      const nextWidth = Math.max(viewport.clientWidth, 1);
      viewportWidthRef.current = nextWidth;
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
    setDragOffset(0);
    setTrackIndex(nextIndex + 1);
    onSelectTab(nextTab);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.pointerType === 'mouse' && event.button !== 0) || shouldIgnoreGamePanelSwipeTarget(event.target)) {
      return;
    }

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    directionLockRef.current = null;
    shouldSuppressClickRef.current = false;
    viewportWidthRef.current = event.currentTarget.clientWidth;
    releaseScrollLockRef.current?.();
    releaseScrollLockRef.current = null;
    setIsTrackAnimating(false);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - startXRef.current;
    const deltaY = event.clientY - startYRef.current;

    if (directionLockRef.current === null) {
      directionLockRef.current = resolveSwipeDirection(
        deltaX,
        deltaY,
        GAME_PANEL_DIRECTION_LOCK_THRESHOLD,
      );
    }

    if (directionLockRef.current === null) {
      return;
    }

    if (directionLockRef.current !== 'horizontal') {
      return;
    }

    if (releaseScrollLockRef.current === null) {
      releaseScrollLockRef.current = lockSwipeScroll(event.currentTarget);
    }

    shouldSuppressClickRef.current = true;

    if (event.cancelable) {
      event.preventDefault();
    }

    setDragOffset(deltaX);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - startXRef.current;
    const nextViewportWidth = viewportWidthRef.current || event.currentTarget.clientWidth;
    const swipeDirection =
      directionLockRef.current ??
      resolveSwipeDirection(deltaX, event.clientY - startYRef.current, GAME_PANEL_DIRECTION_LOCK_THRESHOLD);
    const shouldChangeTab =
      swipeDirection === 'horizontal' &&
      (Math.abs(deltaX) >= GAME_PANEL_SWIPE_THRESHOLD || Math.abs(deltaX) >= nextViewportWidth * 0.18);

    setIsTrackAnimating(true);
    setDragOffset(0);

    if (shouldChangeTab) {
      const nextIndex = deltaX < 0 ? activeIndex + 1 : activeIndex - 1;
      const wrappedIndex = getWrappedGamePanelTabIndex(nextIndex);
      const nextTrackIndex =
        deltaX < 0 && activeIndex === GAME_PANEL_TABS.length - 1
          ? GAME_PANEL_TABS.length + 1
          : deltaX > 0 && activeIndex === 0
            ? 0
            : wrappedIndex + 1;

      skipNextActiveTabSyncRef.current = true;
      setTrackIndex(nextTrackIndex);
      onSelectTab(GAME_PANEL_TABS[wrappedIndex].id);
    }

    pointerIdRef.current = null;
    directionLockRef.current = null;
    releaseScrollLockRef.current?.();
    releaseScrollLockRef.current = null;
  };

  const handlePointerCancel = () => {
    releaseScrollLockRef.current?.();
    releaseScrollLockRef.current = null;
    pointerIdRef.current = null;
    directionLockRef.current = null;
    setDragOffset(0);
    setIsTrackAnimating(true);
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

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!shouldSuppressClickRef.current) {
      return;
    }

    shouldSuppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const isViewportReady = viewportWidth > 1;
  const slideWidth = Math.max(viewportWidth, 1);
  const slideSpan = slideWidth + GAME_PANEL_CAROUSEL_GAP;
  const trackTranslateX = -trackIndex * slideSpan + dragOffset;

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
                  openDistinctVideoCount={summary.openDistinctVideoCount}
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
            className="app-shell__game-tab-panel app-shell__game-tab-panel--carousel app-shell__swipeable-tab-panel"
            onClickCapture={handleClickCapture}
            onPointerCancel={handlePointerCancel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
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
                    <div className="app-shell__game-tab-slide-panel" data-game-panel-tab={tab.id}>
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

export function RankingGamePositionsTab({
  activePlaybackQueueId,
  canShowGameActions,
  emptyMessage,
  holdings,
  isLoading = false,
  onOpenPositionChart,
  onOpenBuyTradeModal,
  onOpenSellTradeModal,
  onSelectPosition,
  selectedPositionId,
}: RankingGamePositionsTabProps) {
  if (isLoading) {
    return (
      <div className="app-shell__game-tab-loading-shell" data-loading>
        <div className="app-shell__game-tab-loading-overlay" role="status" aria-live="polite">
          <span className="app-shell__game-tab-loading-spinner" aria-hidden="true" />
          <span className="sr-only">인벤토리 불러오는 중</span>
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return emptyMessage ? <p className="app-shell__game-empty">{emptyMessage}</p> : null;
  }

  return (
    <ul className="app-shell__game-positions">
      {holdings.map((holding) => {
        const isSelectedPosition =
          activePlaybackQueueId === GAME_PORTFOLIO_QUEUE_ID && holding.positionId === selectedPositionId;
        const holdingRankTrendBadge = getHoldingRankDiffBadge(holding);
        const strategyBadges = buildPositionStrategyBadges(holding.achievedStrategyTags, holding.targetStrategyTags);
        const currentUnitPricePoints =
          typeof holding.currentPricePoints === 'number'
            ? calculateGameUnitPricePoints(holding.currentPricePoints, holding.quantity)
            : null;
        const positionStatusBadge = holding.chartOut ? '차트 아웃' : null;
        const reservedStatusBadge = holding.reservedForSell
          ? `${formatGameQuantity(holding.scheduledSellQuantity)} 예약`
          : null;
        const sellableStatusBadge = !canShowGameActions
          ? '전체 카테고리에서 매도 가능'
          : holding.sellableQuantity > 0
            ? `${formatGameQuantity(holding.sellableQuantity)} 매도 가능`
            : holding.nextSellableInSeconds !== null
              ? `매도 대기 · ${formatHoldCountdown(holding.nextSellableInSeconds)}`
              : '아직 매도 가능 수량 없음';
        const hasDetailBadges = Boolean(
          strategyBadges.length || holdingRankTrendBadge || positionStatusBadge || reservedStatusBadge || sellableStatusBadge,
        );
        const projectedHighlightScoreValue = formatHighlightScore(holding.projectedHighlightScore);
        const projectedHighlightStateText =
          strategyBadges.length === 0 ? '아직 노리는 하이라이트 조건이 없어요.' : null;
        const position = mapHoldingToGamePosition(holding);
        const canOpenBuyTrade = canShowGameActions && Boolean(onOpenBuyTradeModal);
        const canOpenSellTrade =
          canShowGameActions && holding.sellableQuantity > 0 && Boolean(onOpenSellTradeModal);

        return (
          <li key={holding.positionId} className="app-shell__game-position" data-selected={isSelectedPosition}>
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
                    onClick={() => onOpenPositionChart?.(position)}
                    type="button"
                  >
                    <p className="app-shell__game-position-title">{holding.title}</p>
                  </button>
                </div>
                <button
                  className="app-shell__game-position-body-button"
                  onClick={() => onSelectPosition(position)}
                  type="button"
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
                            <span
                              className="app-shell__game-position-trend"
                              data-tone={holdingRankTrendBadge.tone}
                            >
                              {holdingRankTrendBadge.label}
                            </span>
                          ) : null}
                          {positionStatusBadge ? (
                            <span className="app-shell__game-position-trend" data-tone="steady">
                              {positionStatusBadge}
                            </span>
                          ) : null}
                          {reservedStatusBadge ? (
                            <span className="app-shell__game-position-trend" data-tone="steady">
                              {reservedStatusBadge}
                            </span>
                          ) : null}
                          {sellableStatusBadge ? (
                            <span className="app-shell__game-position-trend" data-tone="steady">
                              {sellableStatusBadge}
                            </span>
                          ) : null}
                        </span>
                        {projectedHighlightStateText ? (
                          <p className="app-shell__game-position-detail-copy">{projectedHighlightStateText}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </button>
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
      })}
    </ul>
  );
}

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
    return emptyMessage ? <p className="app-shell__game-empty">{emptyMessage}</p> : null;
  }

  return (
    <ul ref={historyListRef} className="app-shell__game-history">
      {positions.map((position) => {
        const playbackQueueId = resolvePlaybackQueueId(position.videoId);
        const isSelectable = Boolean(playbackQueueId);
        const isSelectedPosition =
          activePlaybackQueueId === HISTORY_PLAYBACK_QUEUE_ID &&
          position.id === selectedPositionId &&
          position.videoId === selectedVideoId;
        const isLoadingHistoryPlayback = historyPlaybackLoadingVideoId === position.videoId;
        const isClosedPosition = position.status !== 'OPEN';
        const historyStatusTone =
          position.status === 'OPEN' ? 'open' : position.status === 'AUTO_CLOSED' ? 'auto' : 'closed';
        const historyStatusLabel =
          position.status === 'OPEN' ? '보유중' : position.status === 'AUTO_CLOSED' ? '자동 청산' : '매도 완료';
        const grossSellPoints = isClosedPosition ? inferGrossSellPointsFromSettled(position.currentPricePoints) : null;
        const sellFeePoints = grossSellPoints !== null ? calculateSellFeePoints(grossSellPoints) : null;

        return (
          <li
            key={position.id}
            ref={isSelectedPosition ? selectedHistoryItemRef : null}
            className="app-shell__game-history-item"
            data-selected={isSelectedPosition}
          >
            <div className="app-shell__game-history-select">
              <button
                className="app-shell__game-history-thumb-button"
                disabled={isLoadingHistoryPlayback}
                onClick={() => onSelectPosition(position, playbackQueueId)}
                title={
                  isLoadingHistoryPlayback
                    ? '영상 정보를 다시 불러오는 중입니다.'
                    : isSelectable
                      ? '이 영상을 플레이어에서 엽니다.'
                      : '영상 정보를 다시 불러와 플레이어에서 엽니다.'
                }
                type="button"
              >
                <img
                  alt=""
                  className="app-shell__game-history-thumb"
                  loading="lazy"
                  src={position.thumbnailUrl}
                />
              </button>
              <div className="app-shell__game-history-copy">
                <div className="app-shell__game-history-heading">
                  <button
                    aria-label={`${position.title} 순위 추이 차트`}
                    className="app-shell__game-history-title-button"
                    onClick={() => onOpenPositionChart?.(position)}
                    type="button"
                  >
                    <p className="app-shell__game-history-title">{position.title}</p>
                  </button>
                </div>
                <button
                  className="app-shell__game-history-body-button"
                  disabled={isLoadingHistoryPlayback}
                  onClick={() => onSelectPosition(position, playbackQueueId)}
                  title={
                    isLoadingHistoryPlayback
                      ? '영상 정보를 다시 불러오는 중입니다.'
                      : isSelectable
                        ? '이 영상을 플레이어에서 엽니다.'
                        : '영상 정보를 다시 불러와 플레이어에서 엽니다.'
                  }
                  type="button"
                >
                  <p className="app-shell__game-history-channel">{position.channelTitle}</p>
                  {isLoadingHistoryPlayback ? (
                    <p className="app-shell__game-history-meta">YouTube에서 영상 정보를 다시 불러오는 중입니다.</p>
                  ) : null}
                  <div className="app-shell__game-history-body">
                    {isClosedPosition ? (
                      <p className="app-shell__game-history-meta">
                        <span className="app-shell__game-history-meta-label">순위</span>{' '}
                        <span className="app-shell__game-history-rank">{formatRank(position.buyRank)}</span>
                        {' → '}
                        <span className="app-shell__game-history-rank">
                          {formatRank(position.currentRank, {
                            chartOut: position.chartOut,
                            unavailableAsChartOut: isClosedPosition,
                          })}
                        </span>
                        {' · '}<span className="app-shell__game-history-meta-label">정산금</span>{' '}
                        {formatMaybePoints(position.currentPricePoints)}
                        {' · '}<span className="app-shell__game-history-meta-label">손익금</span>{' '}
                        <span data-tone={getPointTone(position.profitPoints)}>
                          {formatSignedPoints(position.profitPoints)}
                        </span>
                        {' · '}<span className="app-shell__game-history-meta-label">손익률</span>{' '}
                        <span data-tone={getPointTone(position.profitPoints)}>
                          {formatSignedProfitRate(position.profitPoints, position.stakePoints)}
                        </span>
                        {' · '}<span className="app-shell__game-history-meta-label">수수료</span>{' '}
                        {sellFeePoints !== null ? formatPoints(sellFeePoints) : '집계 중'}
                      </p>
                    ) : (
                      <p className="app-shell__game-history-meta">
                        <span className="app-shell__game-history-meta-label">순위</span>{' '}
                        <span className="app-shell__game-history-rank">{formatRank(position.buyRank)}</span>
                        {' · '}<span className="app-shell__game-history-meta-label">매수금</span> {formatPoints(position.stakePoints)}
                      </p>
                    )}
                    <div className="app-shell__game-history-detail">
                      <div className="app-shell__game-history-detail-badges">
                        <span
                          className="app-shell__game-history-badge app-shell__game-history-badge--status"
                          data-status={historyStatusTone}
                        >
                          {historyStatusLabel}
                        </span>
                        <span className="app-shell__game-history-badge">
                          {position.closedAt
                            ? `종료 ${formatGameTimestamp(position.closedAt)}`
                            : `진입 ${formatGameTimestamp(position.createdAt)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const RankingGameHistoryTab = memo(
  RankingGameHistoryTabComponent,
  areRankingGameHistoryTabPropsEqual,
);
