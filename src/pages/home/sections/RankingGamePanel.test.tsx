import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GameHighlight, GameLeaderboardEntry, GamePosition } from '../../../features/game/types';
import type { OpenGameHolding } from '../gameHelpers';
import { HISTORY_PLAYBACK_QUEUE_ID } from '../utils';
import {
  RankingGameHistoryTab,
  RankingGameLeaderboardTab,
  RankingGamePositionsTab,
  RankingGameSelectedVideoActions,
} from './RankingGamePanel';

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
    scheduledSellQuantity: 0,
    ...overrides,
  };
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

    expect(screen.getByRole('button', { name: 'Holding Video 매도' })).toBeDisabled();
  });
});

describe('RankingGameHistoryTab', () => {
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
              grade: 'SUPER',
              description: '150위 밖에서 잡은 영상이 10위 안까지 올라온 복합 하이라이트 달성자입니다.',
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
      '슈퍼 Atlas Sniper: 150위 밖에서 잡은 영상이 10위 안까지 올라온 복합 하이라이트 달성자입니다.',
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
