import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

function buildSection(itemCount: number) {
  return {
    ...baseSection,
    items: Array.from({ length: itemCount }, (_, index) => ({
      ...baseSection.items[0],
      id: `video-${index + 1}`,
      snippet: {
        ...baseSection.items[0].snippet,
        title: `테스트 영상 ${index + 1}`,
      },
    })),
  };
}

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

  it('renders a visual play overlay on the thumbnail button', () => {
    const { container } = render(
      <VideoList
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onSelectVideo={vi.fn()}
        section={baseSection}
      />,
    );

    expect(container.querySelector('.thumbnail-play-overlay')).toBeInTheDocument();
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

  it('renders only the current 20-item page for long sections', () => {
    const { container } = render(
      <VideoList
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onSelectVideo={vi.fn()}
        section={buildSection(45)}
      />,
    );

    expect(container.querySelectorAll('.video-card')).toHaveLength(20);
    const pagination = screen.getByRole('navigation', { name: '즐겨찾기 채널 페이지 이동' });

    expect(within(pagination).getByRole('button', { name: '현재 페이지 1' })).toBeInTheDocument();
    expect(pagination).toHaveTextContent('/3');
    expect(screen.queryByText('테스트 영상 21')).not.toBeInTheDocument();
  });

  it('prefetches the next backend page on the penultimate loaded client page', () => {
    const onLoadMore = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();

    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    try {
      render(
        <VideoList
          hasNextPage
          isError={false}
          isFetchingNextPage={false}
          isLoading={false}
          onLoadMore={onLoadMore}
          onSelectVideo={vi.fn()}
          section={buildSection(50)}
        />,
      );

      expect(
        screen.getByRole('navigation', { name: '즐겨찾기 채널 페이지 이동' }),
      ).toHaveTextContent('/10');

      fireEvent.click(screen.getByRole('button', { name: '다음' }));

      expect(screen.getByRole('button', { name: '현재 페이지 2' })).toBeInTheDocument();
      expect(screen.getByText('테스트 영상 21')).toBeInTheDocument();
      expect(onLoadMore).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'start',
      });
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('starts preparing every chart page when the page dropdown opens', async () => {
    const onLoadMore = vi.fn();

    render(
      <VideoList
        hasNextPage
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={onLoadMore}
        onSelectVideo={vi.fn()}
        section={buildSection(50)}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '현재 페이지 1' }));

    expect(screen.getByRole('status')).toHaveTextContent('페이지를 준비하는 중입니다.');
    expect(screen.queryByRole('listbox', { name: '페이지 선택' })).not.toBeInTheDocument();
    await waitFor(() => expect(onLoadMore).toHaveBeenCalledTimes(1));
  });

  it('does not repeat prefetch when moving to the final loaded client page', () => {
    const onLoadMore = vi.fn();

    render(
      <VideoList
        hasNextPage
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={onLoadMore}
        onSelectVideo={vi.fn()}
        section={buildSection(50)}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(screen.getByRole('button', { name: '현재 페이지 3' })).toBeInTheDocument();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('jumps directly between loaded client pages from the page dropdown', () => {
    render(
      <VideoList
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onSelectVideo={vi.fn()}
        section={buildSection(45)}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '현재 페이지 1' }));
    fireEvent.click(screen.getByRole('option', { name: '3' }));

    expect(screen.getByRole('button', { name: '현재 페이지 3' })).toBeInTheDocument();
    expect(screen.getByText('테스트 영상 41')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '현재 페이지 3' }));
    fireEvent.click(screen.getByRole('option', { name: '1' }));

    expect(screen.getByRole('button', { name: '현재 페이지 1' })).toBeInTheDocument();
    expect(screen.getByText('테스트 영상 1')).toBeInTheDocument();
    expect(screen.queryByText('테스트 영상 41')).not.toBeInTheDocument();
  });

  it('scrolls to the section top while the next backend page is loading', () => {
    const onLoadMore = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();

    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    try {
      const { rerender } = render(
        <VideoList
          hasNextPage
          isError={false}
          isFetchingNextPage={false}
          isLoading={false}
          onLoadMore={onLoadMore}
          onSelectVideo={vi.fn()}
          section={buildSection(50)}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: '다음' }));
      fireEvent.click(screen.getByRole('button', { name: '다음' }));

      expect(onLoadMore).toHaveBeenCalledTimes(1);
      scrollIntoView.mockClear();

      rerender(
        <VideoList
          hasNextPage
          isError={false}
          isFetchingNextPage
          isLoading={false}
          onLoadMore={onLoadMore}
          onSelectVideo={vi.fn()}
          section={buildSection(50)}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: '다음' }));

      expect(screen.getByRole('button', { name: '현재 페이지 3' })).toBeInTheDocument();
      expect(onLoadMore).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'start',
      });
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });
});
