import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { GameCurrentSeason, GameHighlight, GameLeaderboardEntry, GamePosition } from '../../../features/game/types';
import type { OpenGameHolding } from '../gameHelpers';
import { HISTORY_PLAYBACK_QUEUE_ID } from '../utils';
import {
  RankingGameHistoryTab,
  RankingGameLeaderboardTab,
  RankingGamePanelShell,
  RankingGamePositionsTab,
  RankingGameSelectedVideoActions,
} from './RankingGamePanel';

type GameTab = 'positions' | 'scheduledOrders' | 'history' | 'guide';

function createGamePosition(overrides: Partial<GamePosition>): GamePosition {
  return {
    id: 1,
    videoId: 'video-1',
    title: 'Video Title',
    channelTitle: 'Channel',
    thumbnailUrl: '',
    buyRank: 1,
    currentRank: 1,
    rankDiff: null,
    quantity: 1,
    stakePoints: 100,
    currentPricePoints: 120,
    profitPoints: 20,
    chartOut: false,
    status: 'OPEN',
    buyCapturedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    closedAt: null,
    ...overrides,
  };
}

function createCurrentSeason(overrides: Partial<GameCurrentSeason> = {}): GameCurrentSeason {
  return {
    endAt: '2026-04-30T00:00:00.000Z',
    maxOpenPositions: 3,
    minHoldSeconds: 60,
    rankPointMultiplier: 1,
    regionCode: 'KR',
    seasonId: 1,
    seasonName: '테스트 시즌',
    startingBalancePoints: 1000,
    startAt: '2026-04-01T00:00:00.000Z',
    status: 'ACTIVE',
    wallet: {
      balancePoints: 1000,
      realizedPnlPoints: 0,
      reservedPoints: 0,
      seasonId: 1,
      totalAssetPoints: 1000,
    },
    ...overrides,
  };
}

function createGameHighlight(overrides: Partial<GameHighlight> = {}): GameHighlight {
  return {
    id: 'highlight-1',
    highlightType: 'SNIPE',
    title: 'Highlight',
    description: '수익률 359.2% 플레이가 기록됐습니다.',
    positionId: 1,
    videoId: 'video-1',
    videoTitle: '하이라이트 영상 제목',
    channelTitle: '채널',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    buyRank: 96,
    highlightRank: 47,
    sellRank: null,
    rankDiff: 49,
    quantity: 1,
    stakePoints: 100,
    currentPricePoints: 200,
    profitPoints: 100,
    profitRatePercent: 359.2,
    strategyTags: ['SMALL_CASHOUT'],
    highlightScore: 37072,
    status: 'OPEN',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createLeaderboardEntry(overrides: Partial<GameLeaderboardEntry> = {}): GameLeaderboardEntry {
  return {
    rank: 1,
    userId: 7,
    displayName: '소몰 캐시아웃',
    pictureUrl: null,
    currentTier: {
      tierCode: 'PLATINUM',
      displayName: '플래티넘',
      minScore: 1000,
      badgeCode: 'badge',
      titleCode: 'title',
      profileThemeCode: 'theme',
    },
    selectedAchievementTitle: null,
    highlightScore: 37072,
    highlightCount: 3,
    topHighlightType: 'SMALL_CASHOUT',
    totalAssetPoints: 2000,
    balancePoints: 1000,
    reservedPoints: 0,
    totalStakePoints: 1000,
    totalEvaluationPoints: 1200,
    profitRatePercent: 25,
    realizedPnlPoints: 100,
    unrealizedPnlPoints: 100,
    openPositionCount: 1,
    me: false,
    ...overrides,
  };
}

function createOpenGameHolding(overrides: Partial<OpenGameHolding> = {}): OpenGameHolding {
  return {
    positionId: 1,
    videoId: 'video-1',
    title: 'Holding Video',
    channelTitle: 'Channel',
    thumbnailUrl: '',
    buyRank: 96,
    currentRank: 47,
    chartOut: false,
    quantity: 1,
    sellableQuantity: 1,
    lockedQuantity: 0,
    nextSellableInSeconds: null,
    stakePoints: 100,
    currentPricePoints: 200,
    profitPoints: 100,
    strategyTags: [],
    achievedStrategyTags: [],
    targetStrategyTags: [],
    projectedHighlightScore: 2500,
    createdAt: '2026-01-01T00:00:00.000Z',
    reservedForSell: false,
    scheduledSellOrderId: null,
    scheduledSellTargetRank: null,
    scheduledSellTriggerDirection: null,
    scheduledSellQuantity: 0,
    ...overrides,
  };
}

function setGamePanelViewportWidth(width = 320) {
  const panel = screen.getByRole('tabpanel');

  Object.defineProperty(panel, 'clientWidth', { configurable: true, value: width });
  fireEvent(window, new Event('resize'));

  return panel;
}

describe('RankingGameSelectedVideoActions', () => {
  it('keeps the now playing label and selected title click targets separate', () => {
    const onContentClick = vi.fn();
    const onEyebrowClick = vi.fn();
    const onHeaderClick = vi.fn();

    render(
      <RankingGameSelectedVideoActions
        buyActionTitle="매수"
        canShowGameActions
        currentVideoGamePriceSummary={<span>1위</span>}
        isBuyDisabled={false}
        isBuySubmitting={false}
        isSellDisabled={false}
        isSellSubmitting={false}
        onContentClick={onContentClick}
        onEyebrowClick={onEyebrowClick}
        onHeaderClick={onHeaderClick}
        onOpenBuyTradeModal={vi.fn()}
        onOpenSellTradeModal={vi.fn()}
        selectedGameActionChannelTitle="Channel"
        selectedGameActionTitle="Video Title"
        selectedVideoId="video-1"
        sellActionTitle="매도"
      />,
    );

    fireEvent.click(screen.getByText('Now Playing'));

    expect(onEyebrowClick).toHaveBeenCalledTimes(1);
    expect(onHeaderClick).not.toHaveBeenCalled();
    expect(onContentClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Video Title', { selector: '.app-shell__game-panel-actions-title' }));

    expect(onContentClick).toHaveBeenCalledTimes(1);
    expect(onEyebrowClick).toHaveBeenCalledTimes(1);
    expect(onHeaderClick).not.toHaveBeenCalled();
  });

  it('uses the header title click for header actions', () => {
    const onContentClick = vi.fn();
    const onHeaderClick = vi.fn();

    render(
      <RankingGameSelectedVideoActions
        buyActionTitle="매수"
        canShowGameActions
        currentVideoGamePriceSummary={<span>1위</span>}
        isBuyDisabled={false}
        isBuySubmitting={false}
        isSellDisabled={false}
        isSellSubmitting={false}
        onContentClick={onContentClick}
        onHeaderClick={onHeaderClick}
        onOpenBuyTradeModal={vi.fn()}
        onOpenSellTradeModal={vi.fn()}
        selectedGameActionChannelTitle="Channel"
        selectedGameActionTitle="Video Title"
        selectedVideoId="video-1"
        sellActionTitle="매도"
      />,
    );

    fireEvent.click(screen.getByText('Video Title', { selector: '.app-shell__game-panel-actions-header-title' }));

    expect(onHeaderClick).toHaveBeenCalledTimes(1);
    expect(onContentClick).not.toHaveBeenCalled();
  });

  it('shows buy and sell actions even when there is no open position', () => {
    render(
      <RankingGameSelectedVideoActions
        buyActionTitle="매수"
        canShowGameActions
        currentVideoGamePriceSummary={<span>1위</span>}
        isBuyDisabled={false}
        isBuySubmitting={false}
        isSellDisabled
        isSellSubmitting={false}
        onOpenBuyTradeModal={vi.fn()}
        onOpenSellTradeModal={vi.fn()}
        selectedGameActionChannelTitle="Channel"
        selectedGameActionTitle="Video Title"
        selectedVideoId="video-1"
        sellActionTitle="매도"
      />,
    );

    expect(screen.getByRole('button', { name: '선택한 영상 매수' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '선택한 영상 매도' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '선택한 영상 차트' })).not.toBeInTheDocument();
  });
});

describe('RankingGamePositionsTab', () => {
  it('shows a loading overlay instead of the empty holdings message while loading', () => {
    render(
      <RankingGamePositionsTab
        canShowGameActions
        emptyMessage="아직 보유 중인 영상이 없어요. 지금 보는 영상에서 바로 시작할 수 있습니다."
        favoriteTrendSignalsByVideoId={{}}
        gameMarketSignalsByVideoId={{}}
        holdings={[]}
        isLoading
        onSelectPosition={vi.fn()}
        trendSignalsByVideoId={{}}
      />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('아직 보유 중인 영상이 없어요. 지금 보는 영상에서 바로 시작할 수 있습니다.')).not.toBeInTheDocument();
  });

  it('shows slot capacity at the top of the inventory tab', () => {
    render(
      <RankingGamePositionsTab
        canShowGameActions
        favoriteTrendSignalsByVideoId={{}}
        gameMarketSignalsByVideoId={{}}
        holdings={[createOpenGameHolding()]}
        maxOpenPositions={3}
        onSelectPosition={vi.fn()}
        openDistinctVideoCount={2}
        trendSignalsByVideoId={{}}
      />,
    );

    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('남은 슬롯 1개')).toBeInTheDocument();
    expect(screen.queryByText('인벤토리')).not.toBeInTheDocument();
  });

  it('shows buy rank into current rank for open positions', () => {
    render(
      <RankingGamePositionsTab
        canShowGameActions
        favoriteTrendSignalsByVideoId={{}}
        gameMarketSignalsByVideoId={{}}
        holdings={[createOpenGameHolding()]}
        onSelectPosition={vi.fn()}
        trendSignalsByVideoId={{}}
      />,
    );

    expect(screen.getByText('순위')).toBeInTheDocument();
    expect(screen.getByText('96위')).toBeInTheDocument();
    expect(screen.getByText('47위')).toBeInTheDocument();
  });

  it('opens position trade actions from the holding card', () => {
    const onOpenBuyTradeModal = vi.fn();
    const onOpenSellTradeModal = vi.fn();

    render(
      <RankingGamePositionsTab
        canShowGameActions
        favoriteTrendSignalsByVideoId={{}}
        gameMarketSignalsByVideoId={{}}
        holdings={[createOpenGameHolding()]}
        onOpenBuyTradeModal={onOpenBuyTradeModal}
        onOpenSellTradeModal={onOpenSellTradeModal}
        onSelectPosition={vi.fn()}
        trendSignalsByVideoId={{}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Holding Video 추가 매수' }));
    fireEvent.click(screen.getByRole('button', { name: 'Holding Video 매도' }));

    expect(onOpenBuyTradeModal).toHaveBeenCalledWith(expect.objectContaining({ id: 1, videoId: 'video-1' }));
    expect(onOpenSellTradeModal).toHaveBeenCalledWith(expect.objectContaining({ id: 1, videoId: 'video-1' }));
  });

  it('opens the chart from the holding title without selecting playback', () => {
    const onOpenPositionChart = vi.fn();
    const onSelectPosition = vi.fn();

    render(
      <RankingGamePositionsTab
        canShowGameActions
        favoriteTrendSignalsByVideoId={{}}
        gameMarketSignalsByVideoId={{}}
        holdings={[createOpenGameHolding()]}
        onOpenPositionChart={onOpenPositionChart}
        onSelectPosition={onSelectPosition}
        trendSignalsByVideoId={{}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Holding Video 순위 추이 차트' }));

    expect(onOpenPositionChart).toHaveBeenCalledWith(expect.objectContaining({ id: 1, videoId: 'video-1' }));
    expect(onSelectPosition).not.toHaveBeenCalled();
  });

  it('opens the chart from the holding body without selecting playback', () => {
    const onOpenPositionChart = vi.fn();
    const onSelectPosition = vi.fn();

    render(
      <RankingGamePositionsTab
        canShowGameActions
        favoriteTrendSignalsByVideoId={{}}
        gameMarketSignalsByVideoId={{}}
        holdings={[createOpenGameHolding()]}
        onOpenPositionChart={onOpenPositionChart}
        onSelectPosition={onSelectPosition}
        trendSignalsByVideoId={{}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Holding Video 본문 차트 보기' }));

    expect(onOpenPositionChart).toHaveBeenCalledWith(expect.objectContaining({ id: 1, videoId: 'video-1' }));
    expect(onSelectPosition).not.toHaveBeenCalled();
  });

  it('disables sell action until a holding has sellable quantity', () => {
    render(
      <RankingGamePositionsTab
        canShowGameActions
        favoriteTrendSignalsByVideoId={{}}
        gameMarketSignalsByVideoId={{}}
        holdings={[createOpenGameHolding({ sellableQuantity: 0 })]}
        onOpenSellTradeModal={vi.fn()}
        onSelectPosition={vi.fn()}
        trendSignalsByVideoId={{}}
      />,
    );

    expect(screen.getByLabelText('Holding Video 매도')).toBeDisabled();
  });

  it('does not show a zero-second sell wait badge when sellable quantity is zero', () => {
    render(
      <RankingGamePositionsTab
        canShowGameActions
        favoriteTrendSignalsByVideoId={{}}
        gameMarketSignalsByVideoId={{}}
        holdings={[createOpenGameHolding({ sellableQuantity: 0, nextSellableInSeconds: 0 })]}
        onSelectPosition={vi.fn()}
        trendSignalsByVideoId={{}}
      />,
    );

    expect(screen.queryByText('매도 대기 · 0초')).not.toBeInTheDocument();
    expect(screen.getByText('매도 가능 수량 없음')).toBeInTheDocument();
  });

  it('shows a reserved sell badge when a holding is already queued for scheduled sell', () => {
    render(
      <RankingGamePositionsTab
        canShowGameActions
        favoriteTrendSignalsByVideoId={{}}
        gameMarketSignalsByVideoId={{}}
        holdings={[createOpenGameHolding({ quantity: 100, sellableQuantity: 0, reservedForSell: true, scheduledSellQuantity: 100 })]}
        onSelectPosition={vi.fn()}
        trendSignalsByVideoId={{}}
      />,
    );

    expect(screen.getByText('1개 예약 중')).toBeInTheDocument();
  });
});

describe('RankingGamePanelShell', () => {
  function ControlledRankingGamePanelShell({
    initialTab = 'positions',
    onRefreshTab,
  }: {
    initialTab?: GameTab;
    onRefreshTab?: (tab: GameTab) => Promise<void> | void;
  }) {
    const [activeGameTab, setActiveGameTab] = useState<GameTab>(initialTab);

    return (
      <RankingGamePanelShell
        activeGameTab={activeGameTab}
        isCollapsed={false}
        onRefreshTab={onRefreshTab}
        onSelectTab={setActiveGameTab}
        onToggleCollapse={vi.fn()}
        summary={{
          computedWalletTotalAssetPoints: 1000,
          openPositionsBuyPoints: 100,
          openPositionsEvaluationPoints: 120,
          openPositionsProfitPoints: 20,
        }}
        tabContentById={{
          guide: <div>튜토리얼 패널</div>,
          history: <div>로그 패널</div>,
          positions: <div>인벤토리 패널</div>,
          scheduledOrders: <div>대기열 패널</div>,
        }}
      />
    );
  }

  it('changes tabs when a tab button is clicked', () => {
    render(<ControlledRankingGamePanelShell initialTab="positions" />);
    setGamePanelViewportWidth();

    fireEvent.click(screen.getByRole('tab', { name: '대기열' }));

    expect(screen.getByRole('tab', { name: '대기열' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('대기열 패널')).toBeInTheDocument();
  });

  it('renders the carousel track after measuring the panel width', () => {
    const { container } = render(<ControlledRankingGamePanelShell initialTab="positions" />);
    setGamePanelViewportWidth();
    const track = container.querySelector('.app-shell__game-tab-track');

    expect(track).toBeInTheDocument();
  });

  it('refetches the active tab when the user scrolls upward at the top of the panel', () => {
    vi.useFakeTimers();
    const onRefreshTab = vi.fn().mockResolvedValue(undefined);

    try {
      const { container } = render(<ControlledRankingGamePanelShell initialTab="positions" onRefreshTab={onRefreshTab} />);
      setGamePanelViewportWidth();
      const panel = container.querySelector('[data-game-panel-tab="positions"]') as HTMLDivElement;

      Object.defineProperty(panel, 'scrollTop', { configurable: true, value: 0 });
      fireEvent.wheel(panel, { deltaY: -72 });

      expect(onRefreshTab).not.toHaveBeenCalled();

      Array.from({ length: 7 }).forEach(() => {
        fireEvent.wheel(panel, { deltaY: -72 });
      });
      vi.advanceTimersByTime(150);

      expect(onRefreshTab).toHaveBeenCalledWith('positions');
    } finally {
      vi.useRealTimers();
    }
  });

  it('refetches the active tab when the user pulls down from the top of the panel', () => {
    const onRefreshTab = vi.fn().mockResolvedValue(undefined);

    const { container } = render(<ControlledRankingGamePanelShell initialTab="history" onRefreshTab={onRefreshTab} />);
    setGamePanelViewportWidth();
    const panel = container.querySelector('[data-game-panel-tab="history"]') as HTMLDivElement;

    Object.defineProperty(panel, 'scrollTop', { configurable: true, value: 0 });
    fireEvent.touchStart(panel, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(panel, { touches: [{ clientY: 240 }] });
    fireEvent.touchEnd(panel);

    expect(onRefreshTab).toHaveBeenCalledWith('history');
  });
});

describe('RankingGameHistoryTab', () => {
  it('shows a loading overlay instead of the old loading sentence', () => {
    render(
      <RankingGameHistoryTab
        emptyMessage={null}
        historyPlaybackLoadingVideoId={null}
        isLoading
        onSelectPosition={vi.fn()}
        positions={[]}
        resolvePlaybackQueueId={() => undefined}
      />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('거래내역을 불러오는 중입니다.')).not.toBeInTheDocument();
  });

  it('opens the chart from the history title without selecting playback', () => {
    const onOpenPositionChart = vi.fn();
    const onSelectPosition = vi.fn();

    render(
      <RankingGameHistoryTab
        activePlaybackQueueId={HISTORY_PLAYBACK_QUEUE_ID}
        emptyMessage={null}
        historyPlaybackLoadingVideoId={null}
        isLoading={false}
        onOpenPositionChart={onOpenPositionChart}
        onSelectPosition={onSelectPosition}
        positions={[createGamePosition({ title: 'History position' })]}
        resolvePlaybackQueueId={() => HISTORY_PLAYBACK_QUEUE_ID}
        selectedPositionId={1}
        selectedVideoId="video-1"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'History position 순위 추이 차트' }));

    expect(onOpenPositionChart).toHaveBeenCalledWith(expect.objectContaining({ id: 1, videoId: 'video-1' }));
    expect(onSelectPosition).not.toHaveBeenCalled();
  });

  it('opens the chart from the history body without selecting playback', () => {
    const onOpenPositionChart = vi.fn();
    const onSelectPosition = vi.fn();

    render(
      <RankingGameHistoryTab
        activePlaybackQueueId={HISTORY_PLAYBACK_QUEUE_ID}
        emptyMessage={null}
        historyPlaybackLoadingVideoId={null}
        isLoading={false}
        onOpenPositionChart={onOpenPositionChart}
        onSelectPosition={onSelectPosition}
        positions={[createGamePosition({ title: 'History position' })]}
        resolvePlaybackQueueId={() => HISTORY_PLAYBACK_QUEUE_ID}
        selectedPositionId={1}
        selectedVideoId="video-1"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'History position 본문 차트 보기' }));

    expect(onOpenPositionChart).toHaveBeenCalledWith(expect.objectContaining({ id: 1, videoId: 'video-1' }));
    expect(onSelectPosition).not.toHaveBeenCalled();
  });

  it('tracks the selected history row by position id when the same video appears twice', () => {
    render(
      <RankingGameHistoryTab
        activePlaybackQueueId={HISTORY_PLAYBACK_QUEUE_ID}
        emptyMessage={null}
        historyPlaybackLoadingVideoId={null}
        isLoading={false}
        onSelectPosition={vi.fn()}
        positions={[
          createGamePosition({
            id: 1,
            title: 'First position',
            videoId: 'same-video',
          }),
          createGamePosition({
            id: 2,
            title: 'Second position',
            videoId: 'same-video',
            createdAt: '2026-01-02T00:00:00.000Z',
          }),
        ]}
        resolvePlaybackQueueId={() => HISTORY_PLAYBACK_QUEUE_ID}
        selectedPositionId={2}
        selectedVideoId="same-video"
      />,
    );

    expect(screen.getByText('First position').closest('li')).toHaveAttribute('data-selected', 'false');
    expect(screen.getByText('Second position').closest('li')).toHaveAttribute('data-selected', 'true');
  });

  it('adjusts only the history list scroll when the selected history row is below view', () => {
    const originalOffsetTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
    const windowScrollTo = vi.fn();
    vi.stubGlobal('scrollTo', windowScrollTo);

    Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
      configurable: true,
      get() {
        return this.textContent?.includes('Selected position') ? 200 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        return this.textContent?.includes('Selected position') ? 80 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get() {
        return this.classList.contains('app-shell__game-history') ? 100 : 0;
      },
    });

    try {
      render(
        <RankingGameHistoryTab
          activePlaybackQueueId={HISTORY_PLAYBACK_QUEUE_ID}
          emptyMessage={null}
          historyPlaybackLoadingVideoId={null}
          isLoading={false}
          onSelectPosition={vi.fn()}
          positions={[
            createGamePosition({
              id: 1,
              title: 'First position',
              videoId: 'video-1',
            }),
            createGamePosition({
              id: 2,
              title: 'Selected position',
              videoId: 'video-2',
              createdAt: '2026-01-02T00:00:00.000Z',
            }),
          ]}
          resolvePlaybackQueueId={() => HISTORY_PLAYBACK_QUEUE_ID}
          selectedPositionId={2}
          selectedVideoId="video-2"
        />,
      );

      expect(document.querySelector('.app-shell__game-history')).toHaveProperty('scrollTop', 180);
      expect(windowScrollTo).not.toHaveBeenCalled();
    } finally {
      if (originalOffsetTop) {
        Object.defineProperty(HTMLElement.prototype, 'offsetTop', originalOffsetTop);
      }
      if (originalOffsetHeight) {
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
      }
      if (originalClientHeight) {
        Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
      }
      vi.unstubAllGlobals();
    }
  });
});

describe('RankingGameLeaderboardTab', () => {
  it('hides the empty leaderboard message while ranking is loading', () => {
    render(
      <RankingGameLeaderboardTab
        entries={[]}
        error={null}
        highlights={[]}
        highlightsError={null}
        highlightsTitle="하이라이트"
        isError={false}
        isHighlightsError={false}
        isHighlightsLoading={false}
        isLoading
        onSelectHighlight={vi.fn()}
        onToggleUser={vi.fn()}
        season={createCurrentSeason()}
        selectedUserId={null}
      />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('아직 리더보드에 표시할 참가자가 없습니다.')).not.toBeInTheDocument();
  });

  it('keeps highlight summary metadata out of the tier ranking row', () => {
    render(
      <RankingGameLeaderboardTab
        entries={[createLeaderboardEntry()]}
        error={null}
        highlights={[]}
        highlightsError={null}
        highlightsTitle="소몰 캐시아웃님의 하이라이트"
        isError={false}
        isHighlightsError={false}
        isHighlightsLoading={false}
        isLoading={false}
        onSelectHighlight={vi.fn()}
        onToggleUser={vi.fn()}
        selectedUserId={null}
      />,
    );

    const row = screen.getByRole('button', { name: /소몰 캐시아웃/ });

    expect(row).toHaveAttribute('data-tier-code', 'PLATINUM');
    expect(within(row).queryByText('플래티넘')).not.toBeInTheDocument();
    expect(within(row).queryByText('하이라이트 3개')).not.toBeInTheDocument();
    expect(within(row).queryByText(/실시간 수익률/)).not.toBeInTheDocument();
    expect(within(row).queryByText('스몰 캐시아웃')).not.toBeInTheDocument();
  });

  it('renders the selected achievement title with its full name in the leaderboard row', () => {
    render(
      <RankingGameLeaderboardTab
        entries={[
          createLeaderboardEntry({
            selectedAchievementTitle: {
              code: 'ATLAS_SNIPER',
              displayName: 'Atlas Sniper',
              shortName: 'A. Sniper',
              grade: 'ULTIMATE',
              description: '150위 밖에서 잡은 영상이 1위까지 올라온 전 구간 복합 하이라이트 달성자입니다.',
            },
          }),
        ]}
        error={null}
        highlights={[]}
        highlightsError={null}
        highlightsTitle="소몰 캐시아웃님의 하이라이트"
        isError={false}
        isHighlightsError={false}
        isHighlightsLoading={false}
        isLoading={false}
        onSelectHighlight={vi.fn()}
        onToggleUser={vi.fn()}
        selectedUserId={null}
      />,
    );

    const row = screen.getByRole('button', { name: /소몰 캐시아웃/ });
    const badge = within(row).getByText('Atlas Sniper').closest('.app-shell__achievement-title-badge');

    expect(within(row).getByText('Atlas Sniper')).toBeInTheDocument();
    expect(badge).toHaveAttribute(
      'title',
      '얼티밋 Atlas Sniper: 150위 밖에서 잡은 영상이 1위까지 올라온 전 구간 복합 하이라이트 달성자입니다.',
    );
  });

  it('renders expanded leaderboard highlights with the richer card metadata', () => {
    const onSelectHighlight = vi.fn();
    const highlight = createGameHighlight();

    render(
      <RankingGameLeaderboardTab
        entries={[createLeaderboardEntry()]}
        error={null}
        highlights={[highlight]}
        highlightsError={null}
        highlightsTitle="소몰 캐시아웃님의 하이라이트"
        isError={false}
        isHighlightsError={false}
        isHighlightsLoading={false}
        isLoading={false}
        onSelectHighlight={onSelectHighlight}
        onToggleUser={vi.fn()}
        selectedUserId={7}
      />,
    );

    expect(screen.getByText('하이라이트 영상 제목')).toBeInTheDocument();
    expect(screen.getByText('+37,072점')).toBeInTheDocument();
    expect(screen.getByText('수익률 359.2% 플레이가 기록됐습니다.')).toBeInTheDocument();
    expect(screen.getByText('스몰 캐시아웃')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('이 하이라이트의 순위 추이 차트를 봅니다.'));

    expect(onSelectHighlight).toHaveBeenCalledWith(highlight);
  });
});
