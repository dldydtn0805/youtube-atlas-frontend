import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VideoList from './VideoList';

const baseSection = {
  categoryId: 'favorite-streamers',
  description: '즐겨찾기 채널 영상',
  items: [
    {
      contentDetails: {
        duration: 'PT1M',
      },
      id: 'video-1',
      snippet: {
        categoryId: '0',
        channelId: 'channel-1',
        channelTitle: '테스트 채널',
        thumbnails: {
          default: { height: 90, url: 'https://example.com/default.jpg', width: 120 },
          high: { height: 360, url: 'https://example.com/high.jpg', width: 480 },
          medium: { height: 180, url: 'https://example.com/medium.jpg', width: 320 },
        },
        title: '테스트 영상',
      },
      statistics: {
        viewCount: '1500',
      },
    },
  ],
  label: '즐겨찾기 채널',
};

describe('VideoList', () => {
  it('uses a custom rank label for the main section when provided', () => {
    const onSelectVideo = vi.fn();

    render(
      <VideoList
        getRankLabel={() => '현재 12위'}
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onSelectVideo={onSelectVideo}
        section={baseSection}
      />,
    );

    expect(screen.getByText('현재 12위')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 재생' }));

    expect(onSelectVideo).toHaveBeenCalledWith(
      'video-1',
      'favorite-streamers',
      expect.any(HTMLButtonElement),
    );
  });

  it('opens the rank chart from the title while the thumbnail selects the video', () => {
    const onOpenChart = vi.fn();
    const onSelectVideo = vi.fn();

    render(
      <VideoList
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onOpenChart={onOpenChart}
        onSelectVideo={onSelectVideo}
        section={baseSection}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 차트 보기' }));

    expect(onOpenChart).toHaveBeenCalledWith(
      'video-1',
      'favorite-streamers',
      expect.any(HTMLButtonElement),
    );
    expect(onSelectVideo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 재생' }));

    expect(onSelectVideo).toHaveBeenCalledWith(
      'video-1',
      'favorite-streamers',
      expect.any(HTMLButtonElement),
    );
  });

  it('shows a static playing badge for the selected video card', () => {
    const { container } = render(
      <VideoList
        activePlaybackQueueId="favorite-streamers"
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onSelectVideo={vi.fn()}
        section={baseSection}
        selectedVideoId="video-1"
      />,
    );

    expect(container.querySelector('.video-card')?.getAttribute('data-active')).toBe('true');
  });

  it('shows both price and view count when price data exists', () => {
    render(
      <VideoList
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        marketPriceByVideoId={{ 'video-1': 12345 }}
        onLoadMore={vi.fn()}
        onSelectVideo={vi.fn()}
        section={baseSection}
      />,
    );

    expect(screen.getByText('가격 12,345P · 조회수 1.5천')).toBeInTheDocument();
  });

  it('renders item trade actions and opens the selected trade flow', () => {
    const onOpenBuyTradeModal = vi.fn();
    const onOpenSellTradeModal = vi.fn();

    render(
      <VideoList
        getTradeActionState={() => ({
          buyTitle: '매수 가능',
          canBuy: true,
          canSell: true,
          sellTitle: '매도 가능',
        })}
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onOpenBuyTradeModal={onOpenBuyTradeModal}
        onOpenSellTradeModal={onOpenSellTradeModal}
        onSelectVideo={vi.fn()}
        section={baseSection}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 매수' }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 매도' }));

    expect(onOpenBuyTradeModal).toHaveBeenCalledWith(
      'video-1',
      'favorite-streamers',
      expect.any(HTMLButtonElement),
    );
    expect(onOpenSellTradeModal).toHaveBeenCalledWith(
      'video-1',
      'favorite-streamers',
      expect.any(HTMLButtonElement),
    );
  });

  it('uses item trend data when no separate trend signal map is provided', () => {
    render(
      <VideoList
        hasNextPage={false}
        hasResolvedTrendSignals
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onSelectVideo={vi.fn()}
        section={{
          ...baseSection,
          items: [
            {
              ...baseSection.items[0],
              trend: {
                capturedAt: '2026-04-17T00:00:00.000Z',
                currentRank: 12,
                currentViewCount: 1500,
                isNew: false,
                previousRank: 18,
                previousViewCount: 1200,
                rankChange: 6,
                viewCountDelta: 300,
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('▲ 6')).toBeInTheDocument();
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it('uses inline rank change badges even when the snapshot is missing current rank', () => {
    render(
      <VideoList
        hasNextPage={false}
        hasResolvedTrendSignals
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onSelectVideo={vi.fn()}
        section={{
          ...baseSection,
          items: [
            {
              ...baseSection.items[0],
              trend: {
                isNew: false,
                previousRank: 18,
                rankChange: 6,
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('▲ 6')).toBeInTheDocument();
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it('prefers snapshot-backed item trend data over stale separate trend signals', () => {
    render(
      <VideoList
        hasNextPage={false}
        hasResolvedTrendSignals
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onSelectVideo={vi.fn()}
        section={{
          ...baseSection,
          items: [
            {
              ...baseSection.items[0],
              trend: {
                capturedAt: '2026-04-17T09:00:00.000Z',
                currentRank: 15,
                currentViewCount: 1500,
                isNew: false,
                previousRank: 9,
                previousViewCount: 1200,
                rankChange: -6,
                viewCountDelta: 300,
              },
            },
          ],
        }}
        trendSignalsByVideoId={{
          'video-1': {
            categoryId: '0',
            categoryLabel: '전체',
            capturedAt: '2026-04-17T08:00:00.000Z',
            currentRank: 9,
            currentViewCount: 1200,
            isNew: false,
            previousRank: 9,
            previousViewCount: 1100,
            rankChange: 0,
            regionCode: 'KR',
            videoId: 'video-1',
            viewCountDelta: 100,
          },
        }}
      />,
    );

    expect(screen.getByText('▼ 6')).toBeInTheDocument();
    expect(screen.queryByText('• 유지')).not.toBeInTheDocument();
  });

  it('re-renders the main section with the updated item order after the section changes', () => {
    const { container, rerender } = render(
      <VideoList
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onSelectVideo={vi.fn()}
        section={{
          ...baseSection,
          items: [
            {
              ...baseSection.items[0],
              id: 'video-1',
              snippet: {
                ...baseSection.items[0].snippet,
                title: '첫 번째 영상',
              },
            },
            {
              ...baseSection.items[0],
              id: 'video-2',
              snippet: {
                ...baseSection.items[0].snippet,
                title: '두 번째 영상',
              },
            },
          ],
        }}
      />,
    );

    expect(Array.from(container.querySelectorAll('.video-card__title')).map((element) => element.textContent)).toEqual([
      expect.stringContaining('첫 번째 영상'),
      expect.stringContaining('두 번째 영상'),
    ]);

    rerender(
      <VideoList
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onSelectVideo={vi.fn()}
        section={{
          ...baseSection,
          items: [
            {
              ...baseSection.items[0],
              id: 'video-3',
              snippet: {
                ...baseSection.items[0].snippet,
                title: '세 번째 영상',
              },
            },
            {
              ...baseSection.items[0],
              id: 'video-1',
              snippet: {
                ...baseSection.items[0].snippet,
                title: '첫 번째 영상',
              },
            },
            {
              ...baseSection.items[0],
              id: 'video-2',
              snippet: {
                ...baseSection.items[0].snippet,
                title: '두 번째 영상',
              },
            },
          ],
        }}
      />,
    );

    expect(Array.from(container.querySelectorAll('.video-card__title')).map((element) => element.textContent)).toEqual([
      expect.stringContaining('세 번째 영상'),
      expect.stringContaining('첫 번째 영상'),
      expect.stringContaining('두 번째 영상'),
    ]);
  });
});
