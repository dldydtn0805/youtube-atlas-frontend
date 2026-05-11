import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChartRankingBoard from '.';

const baseItem = {
  contentDetails: { duration: 'PT1M' },
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
  statistics: { viewCount: '1500' },
  trend: {
    currentRank: 2,
    currentViewCount: 1500,
    isNew: false,
    previousRank: 8,
    rankChange: 6,
  },
};

const baseSection = {
  categoryId: 'popular',
  description: '인기 영상',
  items: [baseItem],
  label: '인기 영상',
};

function makeItem(position: number, idPrefix = 'video') {
  return {
    ...baseItem,
    id: `${idPrefix}-${position}`,
    snippet: {
      ...baseItem.snippet,
      channelId: `channel-${position}`,
      title: `테스트 영상 ${position}`,
    },
    statistics: { viewCount: String(1500 + position) },
    trend: {
      ...baseItem.trend,
      currentRank: position,
    },
  };
}

function makeSection(itemCount: number, idPrefix = 'video') {
  return {
    ...baseSection,
    items: Array.from({ length: itemCount }, (_, index) => makeItem(index + 1, idPrefix)),
  };
}

describe('ChartRankingBoard', () => {
  it('plays from thumbnail and title, then opens the chart from rank change', () => {
    const onOpenChart = vi.fn();
    const onSelectVideo = vi.fn();

    render(
      <ChartRankingBoard
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

    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 재생' }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 재생하기' }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 등락 차트 보기' }));

    expect(onSelectVideo).toHaveBeenCalledTimes(2);
    expect(onSelectVideo).toHaveBeenNthCalledWith(1, 'video-1', 'popular', expect.any(HTMLButtonElement));
    expect(onSelectVideo).toHaveBeenNthCalledWith(2, 'video-1', 'popular', expect.any(HTMLButtonElement));
    expect(onOpenChart).toHaveBeenCalledWith('video-1', 'popular', expect.any(HTMLButtonElement));
  });

  it('opens buy and sell flows from table action buttons', () => {
    const onOpenBuyTradeModal = vi.fn();
    const onOpenSellTradeModal = vi.fn();

    render(
      <ChartRankingBoard
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
        marketPriceByVideoId={{ 'video-1': 12345 }}
        onLoadMore={vi.fn()}
        onOpenBuyTradeModal={onOpenBuyTradeModal}
        onOpenSellTradeModal={onOpenSellTradeModal}
        onSelectVideo={vi.fn()}
        section={baseSection}
      />,
    );

    expect(screen.getByText('12,345P')).toBeInTheDocument();
    expect(screen.getByText('1.5천')).toBeInTheDocument();
    expect(screen.getAllByText('▲6')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 매수' }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 매도' }));

    expect(onOpenBuyTradeModal).toHaveBeenCalledWith('video-1', 'popular', expect.any(HTMLButtonElement));
    expect(onOpenSellTradeModal).toHaveBeenCalledWith('video-1', 'popular', expect.any(HTMLButtonElement));
  });

  it('opens mobile trade actions from a ranking row sheet', () => {
    const onOpenBuyTradeModal = vi.fn();
    const onOpenSellTradeModal = vi.fn();

    render(
      <ChartRankingBoard
        enableMobileTradeSheet
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
        marketPriceByVideoId={{ 'video-1': 12345 }}
        onLoadMore={vi.fn()}
        onOpenBuyTradeModal={onOpenBuyTradeModal}
        onOpenSellTradeModal={onOpenSellTradeModal}
        onSelectVideo={vi.fn()}
        section={baseSection}
      />,
    );

    fireEvent.click(screen.getByText('테스트 영상').closest('tr')!);

    const sheet = screen.getByRole('dialog', { name: '테스트 영상' });

    expect(within(sheet).getByText('12,345P')).toBeInTheDocument();
    expect(within(sheet).getByText('1.5천')).toBeInTheDocument();
    expect(within(sheet).getByText('▲6')).toBeInTheDocument();

    fireEvent.click(within(sheet).getByRole('button', { name: '테스트 영상 매수' }));

    expect(onOpenBuyTradeModal).toHaveBeenCalledWith('video-1', 'popular', expect.any(HTMLButtonElement));

    fireEvent.click(screen.getByText('테스트 영상').closest('tr')!);
    fireEvent.click(within(screen.getByRole('dialog', { name: '테스트 영상' })).getByRole('button', { name: '테스트 영상 매도' }));

    expect(onOpenSellTradeModal).toHaveBeenCalledWith('video-1', 'popular', expect.any(HTMLButtonElement));
  });

  it('keeps the requested page after fetching more ranking items', () => {
    const onLoadMore = vi.fn();
    const initialSection = makeSection(20, 'initial-video');
    const fetchedSection = makeSection(40, 'fetched-video');

    const { rerender } = render(
      <ChartRankingBoard
        hasNextPage
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={onLoadMore}
        onSelectVideo={vi.fn()}
        section={initialSection}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(
      <ChartRankingBoard
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={onLoadMore}
        onSelectVideo={vi.fn()}
        section={fetchedSection}
      />,
    );

    expect(screen.getByRole('button', { name: '현재 페이지 2' })).toBeInTheDocument();
    expect(screen.getByText('테스트 영상 21')).toBeInTheDocument();
    expect(screen.queryByText('테스트 영상 1')).not.toBeInTheDocument();
  });
});
