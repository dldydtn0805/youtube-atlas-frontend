import type { ReactNode } from 'react';
import type {
  GameCurrentSeason,
  GameDividendOverview,
  GameLeaderboardEntry,
  GamePosition,
} from '../../../features/game/types';
import type { VideoTrendSignal } from '../../../features/trending/types';
import { getPrimaryVideoTrendBadge } from '../../../features/trending/presentation';
import {
  formatGameQuantity,
  formatGameTimestamp,
  formatHoldCountdown,
  formatMaybePoints,
  formatPoints,
  formatRank,
  formatSeasonDateTime,
  getPointTone,
  type OpenGameHolding,
} from '../gameHelpers';
import { formatSignedProfitRate } from '../utils';

type GameTab = 'positions' | 'history' | 'leaderboard';

interface RankingGamePanelShellProps {
  activeGameTab: GameTab;
  dividendOverview?: ReactNode;
  helperText: string;
  isCollapsed: boolean;
  isHelperWarning: boolean;
  onSelectTab: (tab: GameTab) => void;
  onToggleCollapse: () => void;
  season?: GameCurrentSeason;
  selectedVideoActions?: ReactNode;
  statusMessage?: string | null;
  summary: {
    computedWalletTotalAssetPoints: number | null;
    openDistinctVideoCount: number;
    openPositionsBuyPoints: number;
    openPositionsEvaluationPoints: number;
    openPositionsProfitPoints: number;
  };
  tabContent?: ReactNode;
}

interface RankingGameSelectedVideoActionsProps {
  buyActionTitle: string;
  canShowGameActions: boolean;
  currentVideoGamePriceSummary: ReactNode;
  isBuyDisabled: boolean;
  isBuySubmitting: boolean;
  isChartDisabled: boolean;
  isSellDisabled: boolean;
  isSellSubmitting: boolean;
  onOpenBuyTradeModal: () => void;
  onOpenRankHistory: () => void;
  onOpenSellTradeModal: () => void;
  selectedGameActionTitle: string;
  selectedVideoOpenPositionCount: number;
  selectedVideoTradeThumbnailUrl?: string | null;
  sellActionTitle: string;
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
  emptyMessage?: string | null;
  favoriteTrendSignalsByVideoId: Record<string, VideoTrendSignal>;
  gameMarketSignalsByVideoId: Record<string, VideoTrendSignal>;
  holdings: OpenGameHolding[];
  onSelectVideo: (videoId: string) => void;
  selectedVideoId?: string;
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

interface RankingGameDividendOverviewProps {
  onOpenDetails: () => void;
  overview?: GameDividendOverview;
  season?: GameCurrentSeason;
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
                  · 평가 금액 {formatMaybePoints(position.currentPricePoints)}
                </p>
                <p className="app-shell__game-leaderboard-position-meta">
                  매수 금액 {formatPoints(position.stakePoints)} · 손익률{' '}
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
            <p className="app-shell__game-leaderboard-name">{entry.displayName}</p>
            <p className="app-shell__game-leaderboard-total">총자산 {formatPoints(entry.totalAssetPoints)}</p>
          </div>
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
  dividendOverview,
  helperText,
  isCollapsed,
  isHelperWarning,
  onSelectTab,
  onToggleCollapse,
  season,
  selectedVideoActions,
  statusMessage,
  summary,
  tabContent,
}: RankingGamePanelShellProps) {
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
          <div className="app-shell__game-panel-metrics">
            <span className="app-shell__game-panel-metric">
              <span className="app-shell__game-panel-metric-label">잔액</span>
              <span className="app-shell__game-panel-metric-value">
                {season ? formatPoints(season.wallet.balancePoints) : '-'}
              </span>
            </span>
            <span className="app-shell__game-panel-metric">
              <span className="app-shell__game-panel-metric-label">총자산</span>
              <span className="app-shell__game-panel-metric-value">
                {summary.computedWalletTotalAssetPoints !== null ? formatPoints(summary.computedWalletTotalAssetPoints) : '-'}
              </span>
            </span>
            <span className="app-shell__game-panel-metric">
              <span className="app-shell__game-panel-metric-label">보유</span>
              <span className="app-shell__game-panel-metric-value">
                {`${summary.openDistinctVideoCount}/${season?.maxOpenPositions ?? '-'}`}
              </span>
            </span>
            <span className="app-shell__game-panel-metric">
              <span className="app-shell__game-panel-metric-label">손익률</span>
              <span
                className="app-shell__game-panel-metric-value"
                data-tone={getPointTone(summary.openPositionsProfitPoints)}
              >
                {season ? formatSignedProfitRate(summary.openPositionsProfitPoints, summary.openPositionsBuyPoints) : '-'}
              </span>
            </span>
            <span className="app-shell__game-panel-metric">
              <span className="app-shell__game-panel-metric-label">총 매수 금액</span>
              <span className="app-shell__game-panel-metric-value">
                {season ? formatPoints(summary.openPositionsBuyPoints) : '-'}
              </span>
            </span>
            <span className="app-shell__game-panel-metric">
              <span className="app-shell__game-panel-metric-label">총 평가 금액</span>
              <span className="app-shell__game-panel-metric-value">
                {season ? formatPoints(summary.openPositionsEvaluationPoints) : '-'}
              </span>
            </span>
          </div>
          <p className="app-shell__game-panel-helper" data-tone={isHelperWarning ? 'warning' : undefined}>
            {helperText}
          </p>
          {statusMessage ? <p className="app-shell__game-panel-status">{statusMessage}</p> : null}
          {dividendOverview}
          {selectedVideoActions}
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

export function RankingGameDividendOverview({ onOpenDetails, overview, season }: RankingGameDividendOverviewProps) {
  if (!overview) {
    return null;
  }

  return (
    <section className="app-shell__game-dividend" aria-label="배당 미리보기">
      <div className="app-shell__game-dividend-header">
        <div className="app-shell__game-dividend-copy">
          <p className="app-shell__game-dividend-eyebrow">Dividend Preview</p>
          <h4 className="app-shell__game-dividend-title">Top {overview.eligibleRankCutoff} 배당 구간</h4>
          <p className="app-shell__game-dividend-helper">
            현재 평가금액 기준 예상 배당입니다. 최소 {formatHoldCountdown(overview.minimumHoldSeconds)} 보유한
            포지션만 반영돼요.
          </p>
        </div>
        <div className="app-shell__game-dividend-metrics" aria-label="배당 요약">
          <span className="app-shell__game-dividend-metric">
            <span className="app-shell__game-dividend-metric-label">내 예상 배당</span>
            <strong className="app-shell__game-dividend-metric-value">
              {formatPoints(overview.myEstimatedDividendPoints)}
            </strong>
          </span>
          <span className="app-shell__game-dividend-metric">
            <span className="app-shell__game-dividend-metric-label">누적 배당</span>
            <strong className="app-shell__game-dividend-metric-value">
              {season ? formatPoints(season.wallet.bonusPoints) : '-'}
            </strong>
          </span>
          <span className="app-shell__game-dividend-metric">
            <span className="app-shell__game-dividend-metric-label">배당 대상</span>
            <strong className="app-shell__game-dividend-metric-value">{overview.myEligiblePositionCount}개</strong>
          </span>
        </div>
      </div>
      <div className="app-shell__game-dividend-actions">
        <p className="app-shell__game-dividend-action-copy">
          1위~20위 고정 배당률과 내 배당 대상 포지션은 상세 모달에서 확인할 수 있어요.
        </p>
        <button className="app-shell__game-panel-action" onClick={onOpenDetails} type="button">
          배당 표 보기
        </button>
      </div>
    </section>
  );
}

export function RankingGameSelectedVideoActions({
  buyActionTitle,
  canShowGameActions,
  currentVideoGamePriceSummary,
  isBuyDisabled,
  isBuySubmitting,
  isChartDisabled,
  isSellDisabled,
  isSellSubmitting,
  onOpenBuyTradeModal,
  onOpenRankHistory,
  onOpenSellTradeModal,
  selectedGameActionTitle,
  selectedVideoOpenPositionCount,
  selectedVideoTradeThumbnailUrl,
  sellActionTitle,
}: RankingGameSelectedVideoActionsProps) {
  return (
    <div className="app-shell__game-panel-actions">
      <div className="app-shell__game-panel-actions-copy">
        <p className="app-shell__game-panel-actions-eyebrow">
          {selectedVideoOpenPositionCount > 0 ? 'Selected Positions' : 'Selected Video'}
        </p>
        <div className="app-shell__game-panel-actions-main">
          {selectedVideoTradeThumbnailUrl ? (
            <img
              alt=""
              className="app-shell__game-panel-actions-thumb"
              loading="lazy"
              src={selectedVideoTradeThumbnailUrl}
            />
          ) : null}
          <div className="app-shell__game-panel-actions-body">
            <p className="app-shell__game-panel-actions-title">{selectedGameActionTitle}</p>
            {currentVideoGamePriceSummary}
          </div>
        </div>
      </div>
      <div className="app-shell__game-panel-actions-buttons">
        <button
          className="app-shell__game-panel-action"
          disabled={isChartDisabled}
          onClick={onOpenRankHistory}
          title={
            !canShowGameActions
              ? '전체 카테고리에서만 차트를 볼 수 있습니다.'
              : '선택한 영상의 랭킹 차트를 엽니다.'
          }
          type="button"
        >
          차트
        </button>
        <button
          className="app-shell__game-panel-action"
          data-variant="buy"
          disabled={!canShowGameActions || isBuyDisabled}
          onClick={onOpenBuyTradeModal}
          title={!canShowGameActions ? '전체 카테고리에서만 매수할 수 있습니다.' : buyActionTitle}
          type="button"
        >
          {isBuySubmitting ? '매수 중...' : '매수'}
        </button>
        {selectedVideoOpenPositionCount > 0 ? (
          <button
            className="app-shell__game-panel-action"
            data-variant="sell"
            disabled={isSellDisabled}
            onClick={onOpenSellTradeModal}
            title={sellActionTitle}
            type="button"
          >
            {isSellSubmitting ? '매도 중...' : '매도'}
          </button>
        ) : null}
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
  emptyMessage,
  favoriteTrendSignalsByVideoId,
  gameMarketSignalsByVideoId,
  holdings,
  onSelectVideo,
  selectedVideoId,
  trendSignalsByVideoId,
}: RankingGamePositionsTabProps) {
  if (holdings.length === 0) {
    return emptyMessage ? <p className="app-shell__game-empty">{emptyMessage}</p> : null;
  }

  return (
    <ul className="app-shell__game-positions">
      {holdings.map((holding) => {
        const isSelectedPosition = holding.videoId === selectedVideoId;
        const holdingRankTrendBadge = getPrimaryVideoTrendBadge(
          gameMarketSignalsByVideoId[holding.videoId] ??
            trendSignalsByVideoId[holding.videoId] ??
            favoriteTrendSignalsByVideoId[holding.videoId],
        );

        return (
          <li key={holding.videoId} className="app-shell__game-position" data-selected={isSelectedPosition}>
            <button
              className="app-shell__game-position-select"
              onClick={() => onSelectVideo(holding.videoId)}
              type="button"
            >
              <img
                alt=""
                className="app-shell__game-position-thumb"
                loading="lazy"
                src={holding.thumbnailUrl}
              />
              <div className="app-shell__game-position-copy">
                <p className="app-shell__game-position-title">{holding.title}</p>
                <p className="app-shell__game-position-meta">
                  보유 수량 {formatGameQuantity(holding.quantity)} · 현재 순위{' '}
                  <span className="app-shell__game-rank-emphasis">
                    {formatRank(holding.currentRank, {
                      chartOut: holding.chartOut,
                    })}
                  </span>
                  {holdingRankTrendBadge ? (
                    <span className="app-shell__game-position-trends">
                      <span
                        className="app-shell__game-panel-actions-trend app-shell__game-position-trend"
                        data-tone={holdingRankTrendBadge.tone}
                      >
                        {holdingRankTrendBadge.label}
                      </span>
                    </span>
                  ) : null}
                </p>
                <p className="app-shell__game-position-meta">
                  총 매수 {formatPoints(holding.stakePoints)} · 총 평가 {formatMaybePoints(holding.currentPricePoints)} · 손익률{' '}
                  <span data-tone={getPointTone(holding.profitPoints)}>
                    {formatSignedProfitRate(holding.profitPoints, holding.stakePoints)}
                  </span>
                </p>
              </div>
            </button>
            <div className="app-shell__game-position-side">
              <span className="app-shell__game-position-hold">
                {canShowGameActions
                  ? holding.sellableQuantity > 0
                    ? holding.lockedQuantity > 0 && holding.nextSellableInSeconds !== null
                      ? `지금 ${formatGameQuantity(holding.sellableQuantity)} 매도 가능 · ${formatGameQuantity(holding.lockedQuantity)}는 ${formatHoldCountdown(holding.nextSellableInSeconds)} 후`
                      : `지금 ${formatGameQuantity(holding.sellableQuantity)} 매도 가능`
                    : holding.nextSellableInSeconds !== null
                      ? `${formatHoldCountdown(holding.nextSellableInSeconds)} 후 매도 가능`
                      : '아직 매도 가능 수량 없음'
                  : '전체 카테고리에서 매도 가능'}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RankingGameHistoryTab({
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
        const historyStatusTone =
          position.status === 'OPEN' ? 'open' : position.status === 'AUTO_CLOSED' ? 'auto' : 'closed';
        const historyStatusLabel =
          position.status === 'OPEN' ? '보유 중' : position.status === 'AUTO_CLOSED' ? '자동 청산' : '매도 완료';

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
                <p className="app-shell__game-history-title">{position.title}</p>
                {isLoadingHistoryPlayback ? (
                  <p className="app-shell__game-history-meta">YouTube에서 영상 정보를 다시 불러오는 중입니다.</p>
                ) : null}
                <p className="app-shell__game-history-meta">
                  매수 <span className="app-shell__game-rank-emphasis">{formatRank(position.buyRank)}</span> · 매수 금액{' '}
                  {formatPoints(position.stakePoints)}
                </p>
                <p className="app-shell__game-history-meta">
                  {position.status === 'OPEN' ? '현재' : position.status === 'AUTO_CLOSED' ? '자동청산' : '매도'}{' '}
                  <span className="app-shell__game-rank-emphasis">
                    {formatRank(position.currentRank, {
                      chartOut: position.chartOut,
                    })}
                  </span>{' '}
                  · {position.status === 'OPEN' ? '평가 금액' : '정산 금액'} {formatMaybePoints(position.currentPricePoints)}
                </p>
                <p className="app-shell__game-history-meta">
                  손익률{' '}
                  <span data-tone={getPointTone(position.profitPoints)}>
                    {formatSignedProfitRate(position.profitPoints, position.stakePoints)}
                  </span>
                </p>
              </div>
            </button>
            <div className="app-shell__game-history-side">
              <span className="app-shell__game-history-status" data-status={historyStatusTone}>
                {historyStatusLabel}
              </span>
              <p className="app-shell__game-history-time">
                {position.closedAt
                  ? `종료 ${formatGameTimestamp(position.closedAt)}`
                  : `진입 ${formatGameTimestamp(position.createdAt)}`}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
