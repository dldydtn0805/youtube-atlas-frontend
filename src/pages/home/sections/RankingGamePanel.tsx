import './RankingGamePanel.css';
import { memo, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { VideoPlayerHandle } from '../../../components/VideoPlayer/VideoPlayer';
import type {
  GameCoinOverview,
  GameCoinPosition,
  GameCoinTierProgress,
  GameCurrentSeason,
  GameLeaderboardEntry,
  GamePosition,
} from '../../../features/game/types';
import type { VideoTrendSignal } from '../../../features/trending/types';
import {
  calculateGameUnitPricePoints,
  formatCoins,
  formatFullCoins,
  formatFullPoints,
  formatGameQuantity,
  formatGameTimestamp,
  formatHoldCountdown,
  formatMiningStatusLabel,
  formatMaybePoints,
  formatPercent,
  formatPercentValue,
  formatPoints,
  formatRank,
  formatSeasonDateTime,
  getPointTone,
  type OpenGameHolding,
} from '../gameHelpers';
import { calculateSellFeePoints, formatSignedProfitRate } from '../utils';
import GameCoinTierSummary from './GameCoinTierSummary';

type GameTab = 'positions' | 'history' | 'leaderboard';

const walletRefreshTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: 'numeric',
  hour12: false,
  minute: '2-digit',
});

function inferGrossSellPointsFromSettled(settledPoints?: number | null) {
  if (typeof settledPoints !== 'number' || !Number.isFinite(settledPoints) || settledPoints < 0) {
    return null;
  }

  return Math.floor((settledPoints * 1000) / 997);
}

interface RankingGamePanelShellProps {
  activeGameTab: GameTab;
  coinTierProgress?: GameCoinTierProgress;
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
  tabContent?: ReactNode;
  walletUpdatedAt?: number;
}

interface RankingGameSelectedVideoActionsProps {
  buyActionTitle: string;
  canShowGameActions: boolean;
  currentVideoGamePriceSummary: ReactNode;
  isDesktopMiniPlayerEnabled?: boolean;
  mainPlayerRef?: RefObject<VideoPlayerHandle | null>;
  isBuyDisabled: boolean;
  isBuySubmitting: boolean;
  isChartDisabled: boolean;
  isSellDisabled: boolean;
  isSellSubmitting: boolean;
  onContentClick?: () => void;
  onHeaderClick?: () => void;
  onOpenBuyTradeModal: () => void;
  onOpenRankHistory: () => void;
  onOpenSellTradeModal: () => void;
  panelControls?: ReactNode;
  selectedGameActionChannelTitle?: string;
  selectedGameActionTitle: string;
  selectedVideoId?: string;
  selectedVideoOpenPositionCount: number;
  selectedVideoTradeThumbnailUrl?: string | null;
  sellActionTitle: string;
}

let selectedVideoMiniPlayerApiPromise: Promise<void> | undefined;

function loadSelectedVideoMiniPlayerApi() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (selectedVideoMiniPlayerApiPromise) {
    return selectedVideoMiniPlayerApiPromise;
  }

  selectedVideoMiniPlayerApiPromise = new Promise<void>((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.append(script);
    }

    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };
  });

  return selectedVideoMiniPlayerApiPromise;
}

function SelectedVideoMiniPlayer({
  mainPlayerRef,
  selectedVideoId,
}: {
  mainPlayerRef?: RefObject<VideoPlayerHandle | null>;
  selectedVideoId: string;
}) {
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const isReadyRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    async function initializePlayer() {
      await loadSelectedVideoMiniPlayerApi();

      if (
        isCancelled ||
        !selectedVideoId ||
        !playerHostRef.current ||
        !window.YT?.Player ||
        playerRef.current
      ) {
        return;
      }

      playerRef.current = new window.YT.Player(playerHostRef.current, {
        height: '100%',
        width: '100%',
        videoId: selectedVideoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          loop: 1,
          modestbranding: 1,
          mute: 1,
          playsinline: 1,
          playlist: selectedVideoId,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            isReadyRef.current = true;
            const readyPlayer = event.target as YT.Player & { mute?: () => void };
            readyPlayer.mute?.();
          },
        },
      });
    }

    void initializePlayer();

    return () => {
      isCancelled = true;
    };
  }, [selectedVideoId]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player || !isReadyRef.current || typeof player.loadVideoById !== 'function') {
      return;
    }

    player.loadVideoById({
      startSeconds: 0,
      videoId: selectedVideoId,
    });
    (player as YT.Player & { mute?: () => void }).mute?.();
  }, [selectedVideoId]);

  useEffect(() => {
    if (
      !selectedVideoId ||
      !mainPlayerRef?.current
    ) {
      return;
    }

    const syncPlayback = () => {
      const miniPlayer = playerRef.current;
      const snapshot = mainPlayerRef.current?.readPlaybackSnapshot();

      if (
        !miniPlayer ||
        !isReadyRef.current ||
        !snapshot ||
        snapshot.videoId !== selectedVideoId ||
        typeof miniPlayer.getCurrentTime !== 'function' ||
        typeof miniPlayer.seekTo !== 'function'
      ) {
        return;
      }

      const miniPlayerPosition = miniPlayer.getCurrentTime();
      const positionDelta = Math.abs(snapshot.positionSeconds - miniPlayerPosition);

      if (positionDelta >= 1.5) {
        miniPlayer.seekTo(Math.max(0, snapshot.positionSeconds), true);
      }
    };

    syncPlayback();
    const intervalId = window.setInterval(syncPlayback, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [mainPlayerRef, selectedVideoId]);

  useEffect(() => {
    return () => {
      isReadyRef.current = false;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  return (
    <div className="app-shell__game-panel-actions-thumb app-shell__game-panel-actions-thumb-player">
      <div ref={playerHostRef} className="app-shell__game-panel-actions-thumb-frame" />
    </div>
  );
}

interface RankingGameLeaderboardTabProps {
  entries: GameLeaderboardEntry[];
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  loadingVideoId: string | null;
  onSelectPosition: (position: GamePosition, playbackQueueId?: string) => void;
  positions: GamePosition[];
  positionsError: unknown;
  positionsTitle: string;
  resolvePlaybackQueueId: (videoId: string) => string | undefined;
  selectedUserId: number | null;
  isPositionsError: boolean;
  isPositionsLoading: boolean;
  onToggleUser: (userId: number) => void;
  season?: GameCurrentSeason;
}

interface RankingGamePositionsTabProps {
  canShowGameActions: boolean;
  coinOverview?: GameCoinOverview;
  emptyMessage?: string | null;
  favoriteTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  gameMarketSignalsByVideoId: Record<string, VideoTrendSignal>;
  holdings: OpenGameHolding[];
  onSelectPosition: (position: GamePosition) => void;
  selectedPositionId?: number | null;
  trendSignalsByVideoId: Record<string, VideoTrendSignal>;
}

interface RankingGameHistoryTabProps {
  emptyMessage?: string | null;
  historyPlaybackLoadingVideoId: string | null;
  isLoading: boolean;
  onSelectPosition: (position: GamePosition, playbackQueueId?: string) => void;
  positions: GamePosition[];
  resolvePlaybackQueueId: (videoId: string) => string | undefined;
  selectedVideoId?: string;
}

interface RankingGameCoinOverviewProps {
  coinTierProgress?: GameCoinTierProgress;
  onOpenDetails: () => void;
  overview?: GameCoinOverview;
  season?: GameCurrentSeason;
}

function areRankingGameHistoryTabPropsEqual(
  prevProps: RankingGameHistoryTabProps,
  nextProps: RankingGameHistoryTabProps,
) {
  return (
    prevProps.emptyMessage === nextProps.emptyMessage &&
    prevProps.historyPlaybackLoadingVideoId === nextProps.historyPlaybackLoadingVideoId &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.positions === nextProps.positions &&
    prevProps.resolvePlaybackQueueId === nextProps.resolvePlaybackQueueId &&
    prevProps.selectedVideoId === nextProps.selectedVideoId
  );
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

function formatWalletUpdatedLabel(updatedAt?: number) {
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt) || updatedAt <= 0) {
    return null;
  }

  return `${walletRefreshTimeFormatter.format(new Date(updatedAt))} 갱신`;
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

function getCoinProductionSummary(positions: GameCoinPosition[]) {
  const activePositions = positions.filter((position) => position.productionActive);
  const warmingPositions = positions.filter((position) => !position.productionActive);
  const activeCoinYield = activePositions.reduce((sum, position) => sum + position.estimatedCoinYield, 0);
  const activePositionWithHighestBoost = activePositions.reduce<GameCoinPosition | null>((selected, position) => {
    if (!selected) {
      return position;
    }

    return position.effectiveCoinRatePercent > selected.effectiveCoinRatePercent ? position : selected;
  }, null);
  const nextPayoutInSeconds = activePositions.reduce<number | null>((nearest, position) => {
    if (typeof position.nextPayoutInSeconds !== 'number') {
      return nearest;
    }

    return nearest === null ? position.nextPayoutInSeconds : Math.min(nearest, position.nextPayoutInSeconds);
  }, null);
  const nextProductionInSeconds = warmingPositions.reduce<number | null>((nearest, position) => {
    if (typeof position.nextProductionInSeconds !== 'number') {
      return nearest;
    }

    return nearest === null ? position.nextProductionInSeconds : Math.min(nearest, position.nextProductionInSeconds);
  }, null);

  return {
    activeCoinYield,
    activeRatePercent: activePositionWithHighestBoost?.effectiveCoinRatePercent ?? null,
    activeHoldBoostPercent: activePositionWithHighestBoost?.holdBoostPercent ?? 0,
    activeRemainingSeconds: nextPayoutInSeconds,
    activeMetricDetail:
      activePositions.length > 0
        ? formatMiningStatusLabel('active', nextPayoutInSeconds)
        : null,
    warmingMetricDetail:
      warmingPositions.length > 0
        ? formatMiningStatusLabel('warming', nextProductionInSeconds)
        : null,
    warmingRemainingSeconds: nextProductionInSeconds,
    hasActiveProduction: activeCoinYield > 0,
    hasWarmingPositions: warmingPositions.length > 0,
    baseRatePercent: positions[0]?.coinRatePercent ?? null,
  };
}

function LeaderboardPositionList({
  loadingVideoId,
  onSelectPosition,
  positions,
  resolvePlaybackQueueId,
}: {
  loadingVideoId: string | null;
  onSelectPosition: (position: GamePosition, playbackQueueId?: string) => void;
  positions: GamePosition[];
  resolvePlaybackQueueId: (videoId: string) => string | undefined;
}) {
  return (
    <ul className="app-shell__game-leaderboard-position-list">
      {positions.map((position) => {
        const playbackQueueId = resolvePlaybackQueueId(position.videoId);
        const isLoadingPlayback = loadingVideoId === position.videoId;

        return (
          <li key={position.id} className="app-shell__game-leaderboard-position-item">
            <button
              className="app-shell__game-leaderboard-position-select"
              disabled={isLoadingPlayback}
              onClick={() => onSelectPosition(position, playbackQueueId)}
              title={
                isLoadingPlayback
                  ? '영상 정보를 다시 불러오는 중입니다.'
                  : playbackQueueId
                    ? '이 영상을 플레이어에서 엽니다.'
                    : '영상 정보를 다시 불러와 플레이어에서 엽니다.'
              }
              type="button"
            >
              <img
                alt=""
                className="app-shell__game-leaderboard-position-thumb"
                loading="lazy"
                src={position.thumbnailUrl}
              />
              <div className="app-shell__game-leaderboard-position-copy">
                <p className="app-shell__game-leaderboard-position-title">{position.title}</p>
                {isLoadingPlayback ? (
                  <p className="app-shell__game-leaderboard-position-meta">
                    YouTube에서 영상 정보를 다시 불러오는 중입니다.
                  </p>
                ) : null}
                <p className="app-shell__game-leaderboard-position-meta">
                  현재{' '}
                  <span className="app-shell__game-rank-emphasis">
                    {formatRank(position.currentRank, { chartOut: position.chartOut })}
                  </span>{' '}
                  · 손익률{' '}
                  <span data-tone={getPointTone(position.profitPoints)}>
                    {formatSignedProfitRate(position.profitPoints, position.stakePoints)}
                  </span>
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function LeaderboardPositionsPanel({
  isError,
  isExpanded,
  isLoading,
  loadingVideoId,
  onSelectPosition,
  positions,
  positionsError,
  positionsTitle,
  resolvePlaybackQueueId,
}: {
  isError: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  loadingVideoId: string | null;
  onSelectPosition: (position: GamePosition, playbackQueueId?: string) => void;
  positions: GamePosition[];
  positionsError: unknown;
  positionsTitle: string;
  resolvePlaybackQueueId: (videoId: string) => string | undefined;
}) {
  if (!isExpanded) {
    return null;
  }

  return (
    <div className="app-shell__game-leaderboard-positions" aria-label={positionsTitle}>
      <p className="app-shell__game-leaderboard-positions-title">{positionsTitle}</p>
      {isLoading ? (
        <p className="app-shell__game-leaderboard-positions-status">보유 포지션을 불러오는 중입니다.</p>
      ) : isError ? (
        <p className="app-shell__game-leaderboard-positions-status">
          {positionsError instanceof Error ? positionsError.message : '보유 포지션을 불러오지 못했습니다.'}
        </p>
      ) : positions.length > 0 ? (
        <LeaderboardPositionList
          loadingVideoId={loadingVideoId}
          onSelectPosition={onSelectPosition}
          positions={positions}
          resolvePlaybackQueueId={resolvePlaybackQueueId}
        />
      ) : (
        <p className="app-shell__game-leaderboard-positions-status">보유 중인 포지션이 없습니다.</p>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  isExpanded,
  loadingVideoId,
  onSelectPosition,
  onToggleUser,
  positions,
  positionsError,
  positionsTitle,
  resolvePlaybackQueueId,
  isPositionsError,
  isPositionsLoading,
}: {
  entry: GameLeaderboardEntry;
  isExpanded: boolean;
  loadingVideoId: string | null;
  onSelectPosition: (position: GamePosition, playbackQueueId?: string) => void;
  onToggleUser: (userId: number) => void;
  positions: GamePosition[];
  positionsError: unknown;
  positionsTitle: string;
  resolvePlaybackQueueId: (videoId: string) => string | undefined;
  isPositionsError: boolean;
  isPositionsLoading: boolean;
}) {
  return (
    <div className="app-shell__game-leaderboard-row">
      <button
        className="app-shell__game-leaderboard-item app-shell__game-leaderboard-item--button"
        data-expanded={isExpanded}
        data-me={entry.me}
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
              <span
                className="app-shell__game-leaderboard-tier"
                data-tier-code={entry.currentTier.tierCode}
                title={`${entry.currentTier.displayName} 티어`}
              >
                {entry.currentTier.displayName}
              </span>
            </div>
            <p className="app-shell__game-leaderboard-total" title={formatFullCoins(entry.coinBalance)}>
              {formatCoins(entry.coinBalance)}
            </p>
          </div>
          <p className="app-shell__game-leaderboard-meta">
            실시간 수익률 <span data-tone={getPointTone(entry.unrealizedPnlPoints)}>{formatSignedPercent(entry.profitRatePercent)}</span>
          </p>
        </div>
        <span className="app-shell__game-leaderboard-expand" aria-hidden="true">
          ▾
        </span>
      </button>
      <LeaderboardPositionsPanel
        isError={isPositionsError}
        isExpanded={isExpanded}
        isLoading={isPositionsLoading}
        loadingVideoId={loadingVideoId}
        onSelectPosition={onSelectPosition}
        positions={positions}
        positionsError={positionsError}
        positionsTitle={positionsTitle}
        resolvePlaybackQueueId={resolvePlaybackQueueId}
      />
    </div>
  );
}

export function RankingGamePanelShell({
  activeGameTab,
  coinTierProgress,
  dividendOverview,
  isCollapsed,
  onSelectTab,
  onToggleCollapse,
  season,
  selectedVideoActions,
  summary,
  tabContent,
  walletUpdatedAt,
}: RankingGamePanelShellProps) {
  const maxOpenPositions = season?.maxOpenPositions ?? null;
  const hasDividendOverview = Boolean(dividendOverview);
  const hasSelectedVideoActions = Boolean(selectedVideoActions);
  const remainingOpenSlots =
    typeof maxOpenPositions === 'number' ? Math.max(0, maxOpenPositions - summary.openDistinctVideoCount) : null;
  const holdingCapacityPercent =
    typeof maxOpenPositions === 'number' && maxOpenPositions > 0
      ? Math.min((summary.openDistinctVideoCount / maxOpenPositions) * 100, 100)
      : 0;
  const profitPointsTone = getPointTone(summary.openPositionsProfitPoints);
  const walletUpdatedLabel = season ? formatWalletUpdatedLabel(walletUpdatedAt) : null;

  return (
    <div className="app-shell__game-panel">
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
            <div className="app-shell__game-panel-overview-side">
              <section
                className="app-shell__game-wallet"
                aria-label="지갑 현황"
                data-current-tier={coinTierProgress?.currentTier.tierCode}
              >
                <div className="app-shell__game-wallet-copy">
                  <div className="app-shell__game-wallet-copy-main">
                    <p className="app-shell__game-wallet-eyebrow">Wallet</p>
                    <h4 className="app-shell__game-wallet-title">지갑</h4>
                  </div>
                  {walletUpdatedLabel ? (
                    <p className="app-shell__game-wallet-status" aria-label={`최근 갱신 시각 ${walletUpdatedLabel}`}>
                      {walletUpdatedLabel}
                    </p>
                  ) : null}
                </div>
                <div className="app-shell__game-panel-metrics">
                  <span className="app-shell__game-panel-metric app-shell__game-panel-metric--hero">
                    <span className="app-shell__game-panel-metric-label">잔액</span>
                    <span
                      className="app-shell__game-panel-metric-value"
                      title={season ? formatFullPoints(season.wallet.balancePoints) : undefined}
                    >
                      {season ? formatPoints(season.wallet.balancePoints) : '-'}
                    </span>
                    <span className="app-shell__game-panel-metric-meta">즉시 매수 가능 포인트</span>
                  </span>
                  <span className="app-shell__game-panel-metric app-shell__game-panel-metric--hero">
                    <span className="app-shell__game-panel-metric-label">총자산</span>
                    <span
                      className="app-shell__game-panel-metric-value"
                      title={
                        summary.computedWalletTotalAssetPoints !== null
                          ? formatFullPoints(summary.computedWalletTotalAssetPoints)
                          : undefined
                      }
                    >
                      {summary.computedWalletTotalAssetPoints !== null
                        ? formatPoints(summary.computedWalletTotalAssetPoints)
                        : '-'}
                    </span>
                    <span className="app-shell__game-panel-metric-meta">잔액 + 현재 평가 금액</span>
                  </span>
                  <span className="app-shell__game-panel-metric">
                    <span className="app-shell__game-panel-metric-label">손익률</span>
                    <span className="app-shell__game-panel-metric-value" data-tone={profitPointsTone}>
                      {season
                        ? formatSignedProfitRate(summary.openPositionsProfitPoints, summary.openPositionsBuyPoints)
                        : '-'}
                    </span>
                    <span className="app-shell__game-panel-metric-meta">현재 평가 기준 수익률</span>
                  </span>
                  <span className="app-shell__game-panel-metric">
                    <span className="app-shell__game-panel-metric-label">평가 손익</span>
                    <span className="app-shell__game-panel-metric-value" data-tone={profitPointsTone}>
                      {season ? formatSignedPoints(summary.openPositionsProfitPoints) : '-'}
                    </span>
                    <span className="app-shell__game-panel-metric-meta">현재 평가 금액 - 총 매수 금액</span>
                  </span>
                  <span className="app-shell__game-panel-metric">
                    <span className="app-shell__game-panel-metric-label">총 매수 금액</span>
                    <span
                      className="app-shell__game-panel-metric-value"
                      title={season ? formatFullPoints(summary.openPositionsBuyPoints) : undefined}
                    >
                      {season ? formatPoints(summary.openPositionsBuyPoints) : '-'}
                    </span>
                    <span className="app-shell__game-panel-metric-meta">현재 보유 포지션 원금</span>
                  </span>
                  <span className="app-shell__game-panel-metric">
                    <span className="app-shell__game-panel-metric-label">총 평가 금액</span>
                    <span
                      className="app-shell__game-panel-metric-value"
                      title={season ? formatFullPoints(summary.openPositionsEvaluationPoints) : undefined}
                    >
                      {season ? formatPoints(summary.openPositionsEvaluationPoints) : '-'}
                    </span>
                    <span className="app-shell__game-panel-metric-meta">최신 시세 기준 평가</span>
                  </span>
                  <span className="app-shell__game-panel-metric app-shell__game-panel-metric--hero app-shell__game-panel-metric--capacity">
                    <span className="app-shell__game-panel-metric-label">보유</span>
                    <span className="app-shell__game-panel-metric-value">
                      {`${summary.openDistinctVideoCount}/${season?.maxOpenPositions ?? '-'}`}
                    </span>
                    <span className="app-shell__game-panel-metric-meta">
                      {remainingOpenSlots !== null ? `남은 슬롯 ${remainingOpenSlots}개` : '보유 가능한 슬롯 집계 중'}
                    </span>
                    <span className="app-shell__game-panel-metric-meter" aria-hidden="true">
                      <span style={{ width: `${holdingCapacityPercent}%` }} />
                    </span>
                  </span>
                </div>
              </section>
            </div>
            {selectedVideoActions ? (
              <div className="app-shell__game-panel-overview-main app-shell__game-panel-overview-main--actions">
                {selectedVideoActions}
              </div>
            ) : null}
            {dividendOverview ? (
              <div className="app-shell__game-panel-overview-main app-shell__game-panel-overview-main--dividend">
                {dividendOverview}
              </div>
            ) : null}
          </div>
          <div aria-label="게임 패널 탭" className="app-shell__game-tabs" role="tablist">
            <button
              aria-selected={activeGameTab === 'positions'}
              className="app-shell__game-tab"
              data-active={activeGameTab === 'positions'}
              onClick={() => onSelectTab('positions')}
              role="tab"
              type="button"
            >
              내 포지션
            </button>
            <button
              aria-selected={activeGameTab === 'history'}
              className="app-shell__game-tab"
              data-active={activeGameTab === 'history'}
              onClick={() => onSelectTab('history')}
              role="tab"
              type="button"
            >
              거래내역
            </button>
            <button
              aria-selected={activeGameTab === 'leaderboard'}
              className="app-shell__game-tab"
              data-active={activeGameTab === 'leaderboard'}
              onClick={() => onSelectTab('leaderboard')}
              role="tab"
              type="button"
            >
              리더보드
            </button>
          </div>
          <div className="app-shell__game-tab-panel" role="tabpanel">
            {tabContent}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function RankingGameCoinOverview({
  coinTierProgress,
  onOpenDetails,
  overview,
  season,
}: RankingGameCoinOverviewProps) {
  if (!overview && !coinTierProgress) {
    return null;
  }

  const productionSummary = overview ? getCoinProductionSummary(overview.positions) : null;

  return (
    <section
      className="app-shell__game-dividend app-shell__game-dividend--preview"
      aria-label="시즌 코인 미리보기"
      data-current-tier={coinTierProgress?.currentTier.tierCode}
    >
      <GameCoinTierSummary progress={coinTierProgress} showLadder={false} surfaceVariant="season-coin" title="현재 티어" />
      <div className="app-shell__game-dividend-header">
        <div className="app-shell__game-dividend-copy">
          <p className="app-shell__game-dividend-eyebrow">Season Coin</p>
          <h4 className="app-shell__game-dividend-title">
            {overview ? `Top ${overview.eligibleRankCutoff} 코인 채굴 현황` : '시즌 코인 티어'}
          </h4>
        </div>
        <button className="app-shell__game-dividend-action" onClick={onOpenDetails} type="button">
          상세 보기
        </button>
      </div>
      {overview ? (
        <div className="app-shell__game-dividend-metrics app-shell__game-dividend-metrics--preview" aria-label="코인 요약">
          <span className="app-shell__game-dividend-metric">
            <span className="app-shell__game-dividend-metric-label">채굴량</span>
            <strong
              className="app-shell__game-dividend-metric-value"
              title={formatFullCoins(overview.myEstimatedCoinYield)}
            >
              {formatCoins(overview.myEstimatedCoinYield)}
            </strong>
            <span className="app-shell__game-dividend-metric-detail" aria-hidden="true" />
          </span>
          <span className="app-shell__game-dividend-metric">
            <span className="app-shell__game-dividend-metric-label">보유 코인</span>
            <strong
              className="app-shell__game-dividend-metric-value"
              title={formatFullCoins(coinTierProgress?.coinBalance ?? season?.wallet.coinBalance ?? 0)}
            >
              {typeof (coinTierProgress?.coinBalance ?? season?.wallet.coinBalance) === 'number'
                ? formatCoins(coinTierProgress?.coinBalance ?? season?.wallet.coinBalance ?? 0)
                : '-'}
            </strong>
            <span className="app-shell__game-dividend-metric-detail" aria-hidden="true" />
          </span>
          <span className="app-shell__game-dividend-metric">
            <span className="app-shell__game-dividend-metric-label">채굴 진행 중</span>
            <strong className="app-shell__game-dividend-metric-value">{overview.myActiveProducerCount}개</strong>
            <span className="app-shell__game-dividend-metric-detail">
              {typeof productionSummary?.activeRemainingSeconds === 'number'
                ? formatHoldCountdown(productionSummary.activeRemainingSeconds)
                : ''}
            </span>
          </span>
          <span className="app-shell__game-dividend-metric">
            <span className="app-shell__game-dividend-metric-label">채굴 대기</span>
            <strong className="app-shell__game-dividend-metric-value">{overview.myWarmingUpPositionCount}개</strong>
            <span className="app-shell__game-dividend-metric-detail">
              {typeof productionSummary?.warmingRemainingSeconds === 'number'
                ? formatHoldCountdown(productionSummary.warmingRemainingSeconds)
                : ''}
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
  isDesktopMiniPlayerEnabled = false,
  mainPlayerRef,
  isBuyDisabled,
  isBuySubmitting,
  isChartDisabled,
  isSellDisabled,
  isSellSubmitting,
  onContentClick,
  onHeaderClick,
  onOpenBuyTradeModal,
  onOpenRankHistory,
  onOpenSellTradeModal,
  panelControls,
  selectedGameActionChannelTitle,
  selectedGameActionTitle,
  selectedVideoOpenPositionCount,
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
        <p className="app-shell__game-panel-actions-eyebrow">
          {selectedVideoOpenPositionCount > 0 ? 'Selected Positions' : 'Selected Video'}
        </p>
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
          {isDesktopMiniPlayerEnabled && selectedVideoId ? (
            <SelectedVideoMiniPlayer mainPlayerRef={mainPlayerRef} selectedVideoId={selectedVideoId} />
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
          {selectedVideoOpenPositionCount === 0 ? (
            <div className="app-shell__game-panel-action-item">
              <button
                aria-label="선택한 영상 차트"
                className="app-shell__game-panel-action"
                data-variant="chart"
                disabled={isChartDisabled}
                onClick={onOpenRankHistory}
                title={
                  !canShowGameActions
                    ? '전체 카테고리에서만 차트를 볼 수 있습니다.'
                    : '선택한 영상의 랭킹 차트를 엽니다.'
                }
                type="button"
              >
                <span className="app-shell__game-panel-action-icon" aria-hidden="true">
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
              <span className="app-shell__game-panel-action-caption">차트</span>
            </div>
          ) : null}
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
          {selectedVideoOpenPositionCount > 0 ? (
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
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RankingGameLeaderboardTab({
  entries,
  error,
  isError,
  isLoading,
  loadingVideoId,
  onSelectPosition,
  positions,
  positionsError,
  positionsTitle,
  resolvePlaybackQueueId,
  selectedUserId,
  isPositionsError,
  isPositionsLoading,
  onToggleUser,
  season,
}: RankingGameLeaderboardTabProps) {
  const topEntries = entries.slice(0, 10);
  const myEntry = entries.find((entry) => entry.me);

  if (isLoading && !isError) {
    return <p className="app-shell__game-empty">리더보드를 불러오는 중입니다.</p>;
  }

  if (isError) {
    return (
      <p className="app-shell__game-empty">
        {error instanceof Error ? error.message : '리더보드를 불러오지 못했습니다.'}
      </p>
    );
  }

  if (topEntries.length === 0) {
    return season ? <p className="app-shell__game-empty">아직 리더보드에 표시할 참가자가 없습니다.</p> : null;
  }

  return (
    <div className="app-shell__game-leaderboard-stack">
      <ol className="app-shell__game-leaderboard">
        {topEntries.map((entry) => (
          <li key={entry.userId} className="app-shell__game-leaderboard-row">
            <LeaderboardRow
              entry={entry}
              isExpanded={selectedUserId === entry.userId}
              isPositionsError={isPositionsError}
              isPositionsLoading={isPositionsLoading}
              loadingVideoId={loadingVideoId}
              onSelectPosition={onSelectPosition}
              onToggleUser={onToggleUser}
              positions={positions}
              positionsError={positionsError}
              positionsTitle={positionsTitle}
              resolvePlaybackQueueId={resolvePlaybackQueueId}
            />
          </li>
        ))}
      </ol>
      {myEntry ? (
        <section className="app-shell__game-leaderboard-pinned" aria-label="내 순위">
          <p className="app-shell__game-leaderboard-pinned-label">내 순위</p>
          <LeaderboardRow
            entry={myEntry}
            isExpanded={selectedUserId === myEntry.userId}
            isPositionsError={isPositionsError}
            isPositionsLoading={isPositionsLoading}
            loadingVideoId={loadingVideoId}
            onSelectPosition={onSelectPosition}
            onToggleUser={onToggleUser}
            positions={positions}
            positionsError={positionsError}
            positionsTitle={positionsTitle}
            resolvePlaybackQueueId={resolvePlaybackQueueId}
          />
        </section>
      ) : null}
    </div>
  );
}

export function RankingGamePositionsTab({
  canShowGameActions,
  coinOverview,
  emptyMessage,
  favoriteTrendSignalsByVideoId: _favoriteTrendSignalsByVideoId,
  gameMarketSignalsByVideoId: _gameMarketSignalsByVideoId,
  holdings,
  onSelectPosition,
  selectedPositionId,
  trendSignalsByVideoId: _trendSignalsByVideoId,
}: RankingGamePositionsTabProps) {
  if (holdings.length === 0) {
    return emptyMessage ? <p className="app-shell__game-empty">{emptyMessage}</p> : null;
  }

  return (
    <ul className="app-shell__game-positions">
      {holdings.map((holding) => {
        const isSelectedPosition = holding.positionId === selectedPositionId;
        const holdingRankTrendBadge = getHoldingRankDiffBadge(holding);
        const coinPositions = coinOverview?.positions.filter((position) => position.positionId === holding.positionId) ?? [];
        const coinSummary = getCoinProductionSummary(coinPositions);
        const hasCoinBoostBadge = !holding.chartOut && coinPositions.length > 0;
        const maxHoldBoostPercent = coinPositions.reduce(
          (highest, position) => Math.max(highest, position.holdBoostPercent),
          0,
        );
        const activeCoinYieldText = coinSummary.hasActiveProduction ? formatCoins(coinSummary.activeCoinYield) : null;
        const currentUnitPricePoints =
          typeof holding.currentPricePoints === 'number'
            ? calculateGameUnitPricePoints(holding.currentPricePoints, holding.quantity)
            : null;
        const positionStatusBadge = holding.chartOut
          ? '차트 아웃'
          : coinSummary.hasActiveProduction
            ? coinSummary.activeMetricDetail ?? '채굴 진행 중'
            : coinSummary.hasWarmingPositions
              ? coinSummary.warmingMetricDetail ?? '채굴 대기'
              : coinPositions.length > 0
                ? '채굴 대상'
                : null;
        const positionDetailCopy = holding.chartOut
          ? null
          : coinSummary.hasActiveProduction
            ? null
            : coinSummary.hasWarmingPositions
              ? null
              : coinPositions.length > 0
                ? `기본 채굴률 ${formatPercent(coinSummary.baseRatePercent)}`
                : null;
        const sellableStatusBadge = !canShowGameActions
          ? '전체 카테고리에서 매도 가능'
          : holding.sellableQuantity > 0
            ? `${formatGameQuantity(holding.sellableQuantity)} 매도 가능`
            : holding.nextSellableInSeconds !== null
              ? `매도 대기 · ${formatHoldCountdown(holding.nextSellableInSeconds)}`
              : '아직 매도 가능 수량 없음';
        const hasDetailBadges = Boolean(
          holdingRankTrendBadge || positionStatusBadge || hasCoinBoostBadge || sellableStatusBadge,
        );
        const holdStatusText =
          canShowGameActions && holding.sellableQuantity > 0 && holding.lockedQuantity > 0 && holding.nextSellableInSeconds !== null
            ? `잠금 ${formatGameQuantity(holding.lockedQuantity)} · ${formatHoldCountdown(holding.nextSellableInSeconds)}`
            : null;

        return (
          <li key={holding.positionId} className="app-shell__game-position" data-selected={isSelectedPosition}>
            <button
              className="app-shell__game-position-select"
              onClick={() =>
                onSelectPosition({
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
                  chartOut: holding.chartOut,
                  status: 'OPEN',
                  buyCapturedAt: holding.createdAt,
                  createdAt: holding.createdAt,
                  closedAt: null,
                })
              }
              type="button"
            >
              <img
                alt=""
                className="app-shell__game-position-thumb"
                loading="lazy"
                src={holding.thumbnailUrl}
              />
              <div className="app-shell__game-position-copy">
                <div className="app-shell__game-position-heading">
                  <p className="app-shell__game-position-title">{holding.title}</p>
                </div>
                <p className="app-shell__game-position-channel">{holding.channelTitle}</p>
                <div className="app-shell__game-position-body">
                  <p className="app-shell__game-position-meta">
                    <span className="app-shell__game-position-meta-label">순위</span>{' '}
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
                  {activeCoinYieldText ? (
                    <>
                      {' · '}<span className="app-shell__game-position-meta-label">채굴량</span> {activeCoinYieldText}
                    </>
                  ) : null}
                </p>
                  {hasDetailBadges || positionDetailCopy ? (
                    <div className="app-shell__game-position-detail">
                      {hasDetailBadges ? (
                        <span className="app-shell__game-position-detail-badges">
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
                          {sellableStatusBadge ? (
                            <span className="app-shell__game-position-trend" data-tone="steady">
                              {sellableStatusBadge}
                            </span>
                          ) : null}
                          {hasCoinBoostBadge ? (
                            <span
                              className="app-shell__coin-boost-badge"
                              title={`채굴 부스트 ${formatPercent(maxHoldBoostPercent)}`}
                            >
                              <span className="app-shell__coin-boost-badge-label">채굴 부스트</span>
                              <span className="app-shell__coin-boost-badge-rate">{formatPercentValue(maxHoldBoostPercent)}</span>
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                      <p className="app-shell__game-position-detail-copy">{positionDetailCopy}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </button>
            <div className="app-shell__game-position-side">
              {holdStatusText ? <span className="app-shell__game-position-hold">{holdStatusText}</span> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RankingGameHistoryTabComponent({
  emptyMessage,
  historyPlaybackLoadingVideoId,
  isLoading,
  onSelectPosition,
  positions,
  resolvePlaybackQueueId,
  selectedVideoId,
}: RankingGameHistoryTabProps) {
  if (isLoading) {
    return <p className="app-shell__game-empty">거래내역을 불러오는 중입니다.</p>;
  }

  if (positions.length === 0) {
    return emptyMessage ? <p className="app-shell__game-empty">{emptyMessage}</p> : null;
  }

  return (
    <ul className="app-shell__game-history">
      {positions.map((position) => {
        const playbackQueueId = resolvePlaybackQueueId(position.videoId);
        const isSelectable = Boolean(playbackQueueId);
        const isSelectedPosition = position.videoId === selectedVideoId;
        const isLoadingHistoryPlayback = historyPlaybackLoadingVideoId === position.videoId;
        const isClosedPosition = position.status !== 'OPEN';
        const historyStatusTone =
          position.status === 'OPEN' ? 'open' : position.status === 'AUTO_CLOSED' ? 'auto' : 'closed';
        const historyStatusLabel =
          position.status === 'OPEN' ? '보유중' : position.status === 'AUTO_CLOSED' ? '자동 청산' : '매도 완료';
        const grossSellPoints = isClosedPosition ? inferGrossSellPointsFromSettled(position.currentPricePoints) : null;
        const sellFeePoints = grossSellPoints !== null ? calculateSellFeePoints(grossSellPoints) : null;

        return (
          <li key={position.id} className="app-shell__game-history-item" data-selected={isSelectedPosition}>
            <button
              className="app-shell__game-history-select"
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
              <div className="app-shell__game-history-copy">
                <div className="app-shell__game-history-heading">
                  <p className="app-shell__game-history-title">{position.title}</p>
                </div>
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
              </div>
            </button>
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
