import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getAllByText('▲6')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 매수' }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 매도' }));

    expect(onOpenBuyTradeModal).toHaveBeenCalledWith('video-1', 'popular', expect.any(HTMLButtonElement));
    expect(onOpenSellTradeModal).toHaveBeenCalledWith('video-1', 'popular', expect.any(HTMLButtonElement));
  });
});
