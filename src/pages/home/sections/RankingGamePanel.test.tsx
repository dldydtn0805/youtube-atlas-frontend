import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GamePosition } from '../../../features/game/types';
import { HISTORY_PLAYBACK_QUEUE_ID } from '../utils';
import { RankingGameHistoryTab, RankingGameSelectedVideoActions } from './RankingGamePanel';

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

describe('RankingGameHistoryTab', () => {
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
