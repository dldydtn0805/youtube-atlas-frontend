import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GameScheduledSellOrdersTab from './GameScheduledSellOrdersTab';

describe('GameScheduledSellOrdersTab', () => {
  it('shows a loading overlay instead of the old loading sentence', () => {
    render(<GameScheduledSellOrdersTab isLoading orders={[]} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('예약 매도 주문을 불러오는 중입니다.')).not.toBeInTheDocument();
  });

  it('shows pending orders by default and lets the user switch filters', async () => {
    const user = userEvent.setup();

    render(
      <GameScheduledSellOrdersTab
        isLoading={false}
        onCancelOrder={vi.fn()}
        orders={[
          {
            id: 1,
            userId: 1,
            seasonId: 1,
            positionId: 10,
            videoId: 'video-1',
            videoTitle: '대기 주문',
            channelTitle: '채널 A',
            thumbnailUrl: 'https://example.com/a.jpg',
            regionCode: 'KR',
            targetRank: 10,
            triggerDirection: 'RANK_IMPROVES_TO',
            status: 'PENDING',
            currentRank: 12,
            buyRank: 15,
            quantity: 100,
            stakePoints: 5000,
            sellPricePoints: null,
            settledPoints: null,
            pnlPoints: null,
            failureReason: null,
            triggeredAt: null,
            executedAt: null,
            canceledAt: null,
            createdAt: '2026-04-24T00:00:00.000Z',
            updatedAt: '2026-04-24T00:00:00.000Z',
          },
          {
            id: 2,
            userId: 1,
            seasonId: 1,
            positionId: 11,
            videoId: 'video-2',
            videoTitle: '취소 주문',
            channelTitle: '채널 B',
            thumbnailUrl: 'https://example.com/b.jpg',
            regionCode: 'KR',
            targetRank: 20,
            triggerDirection: 'RANK_DROPS_TO',
            status: 'CANCELED',
            currentRank: 18,
            buyRank: 16,
            quantity: 100,
            stakePoints: 4000,
            sellPricePoints: null,
            settledPoints: null,
            pnlPoints: null,
            failureReason: null,
            triggeredAt: null,
            executedAt: null,
            canceledAt: '2026-04-24T01:00:00.000Z',
            createdAt: '2026-04-24T00:30:00.000Z',
            updatedAt: '2026-04-24T01:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('대기 주문')).toBeInTheDocument();
    expect(screen.queryByText('취소 주문')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '취소' }));

    expect(screen.queryByText('대기 주문')).not.toBeInTheDocument();
    expect(screen.getByText('취소 주문')).toBeInTheDocument();
  });

  it('shows the status-specific empty message when a filter has no matching orders', async () => {
    const user = userEvent.setup();

    render(
      <GameScheduledSellOrdersTab
        isLoading={false}
        orders={[
          {
            id: 2,
            userId: 1,
            seasonId: 1,
            positionId: 11,
            videoId: 'video-2',
            videoTitle: '취소 주문',
            channelTitle: '채널 B',
            thumbnailUrl: 'https://example.com/b.jpg',
            regionCode: 'KR',
            targetRank: 20,
            triggerDirection: 'RANK_DROPS_TO',
            status: 'CANCELED',
            currentRank: 18,
            buyRank: 16,
            quantity: 100,
            stakePoints: 4000,
            sellPricePoints: null,
            settledPoints: null,
            pnlPoints: null,
            failureReason: null,
            triggeredAt: null,
            executedAt: null,
            canceledAt: '2026-04-24T01:00:00.000Z',
            createdAt: '2026-04-24T00:30:00.000Z',
            updatedAt: '2026-04-24T01:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('예약 매도 주문이 아직 없습니다.')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '완료' }));

    expect(screen.getByText('완료된 예약 매도 주문이 아직 없습니다.')).toBeInTheDocument();
  });

  it('calls cancel when the pending order cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancelOrder = vi.fn();

    render(
      <GameScheduledSellOrdersTab
        isLoading={false}
        onCancelOrder={onCancelOrder}
        orders={[
          {
            id: 1,
            userId: 1,
            seasonId: 1,
            positionId: 10,
            videoId: 'video-1',
            videoTitle: '대기 주문',
            channelTitle: '채널 A',
            thumbnailUrl: 'https://example.com/a.jpg',
            regionCode: 'KR',
            targetRank: 10,
            triggerDirection: 'RANK_IMPROVES_TO',
            status: 'PENDING',
            currentRank: 12,
            buyRank: 15,
            quantity: 100,
            stakePoints: 5000,
            sellPricePoints: null,
            settledPoints: null,
            pnlPoints: null,
            failureReason: null,
            triggeredAt: null,
            executedAt: null,
            canceledAt: null,
            createdAt: '2026-04-24T00:00:00.000Z',
            updatedAt: '2026-04-24T00:00:00.000Z',
          },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: '예약 취소' }));

    expect(onCancelOrder).toHaveBeenCalledWith(1);
  });

  it('opens the chart when the order title is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChart = vi.fn();

    render(
      <GameScheduledSellOrdersTab
        isLoading={false}
        onOpenChart={onOpenChart}
        orders={[
          {
            id: 1,
            userId: 1,
            seasonId: 1,
            positionId: 10,
            videoId: 'video-1',
            videoTitle: '대기 주문',
            channelTitle: '채널 A',
            thumbnailUrl: 'https://example.com/a.jpg',
            regionCode: 'KR',
            targetRank: 10,
            triggerDirection: 'RANK_IMPROVES_TO',
            status: 'PENDING',
            currentRank: 12,
            buyRank: 15,
            quantity: 100,
            stakePoints: 5000,
            sellPricePoints: null,
            settledPoints: null,
            pnlPoints: null,
            failureReason: null,
            triggeredAt: null,
            executedAt: null,
            canceledAt: null,
            createdAt: '2026-04-24T00:00:00.000Z',
            updatedAt: '2026-04-24T00:00:00.000Z',
          },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: '대기 주문 차트 보기' }));

    expect(onOpenChart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        videoId: 'video-1',
        videoTitle: '대기 주문',
      }),
    );
  });

  it('opens the chart when the order body is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChart = vi.fn();

    render(
      <GameScheduledSellOrdersTab
        isLoading={false}
        onOpenChart={onOpenChart}
        orders={[
          {
            id: 1,
            userId: 1,
            seasonId: 1,
            positionId: 10,
            videoId: 'video-1',
            videoTitle: '대기 주문',
            channelTitle: '채널 A',
            thumbnailUrl: 'https://example.com/a.jpg',
            regionCode: 'KR',
            targetRank: 10,
            triggerDirection: 'RANK_IMPROVES_TO',
            status: 'PENDING',
            currentRank: 12,
            buyRank: 15,
            quantity: 100,
            stakePoints: 5000,
            sellPricePoints: null,
            settledPoints: null,
            pnlPoints: null,
            failureReason: null,
            triggeredAt: null,
            executedAt: null,
            canceledAt: null,
            createdAt: '2026-04-24T00:00:00.000Z',
            updatedAt: '2026-04-24T00:00:00.000Z',
          },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: '대기 주문 본문 차트 보기' }));

    expect(onOpenChart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        videoId: 'video-1',
        videoTitle: '대기 주문',
      }),
    );
  });

  it('selects the order video when the thumbnail is clicked', async () => {
    const user = userEvent.setup();
    const onSelectOrderVideo = vi.fn();

    render(
      <GameScheduledSellOrdersTab
        isLoading={false}
        onSelectOrderVideo={onSelectOrderVideo}
        orders={[
          {
            id: 1,
            userId: 1,
            seasonId: 1,
            positionId: 10,
            videoId: 'video-1',
            videoTitle: '대기 주문',
            channelTitle: '채널 A',
            thumbnailUrl: 'https://example.com/a.jpg',
            regionCode: 'KR',
            targetRank: 10,
            triggerDirection: 'RANK_IMPROVES_TO',
            status: 'PENDING',
            currentRank: 12,
            buyRank: 15,
            quantity: 100,
            stakePoints: 5000,
            sellPricePoints: null,
            settledPoints: null,
            pnlPoints: null,
            failureReason: null,
            triggeredAt: null,
            executedAt: null,
            canceledAt: null,
            createdAt: '2026-04-24T00:00:00.000Z',
            updatedAt: '2026-04-24T00:00:00.000Z',
          },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: '대기 주문 재생' }));

    expect(onSelectOrderVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        videoId: 'video-1',
        videoTitle: '대기 주문',
      }),
    );
  });

  it('shows a failed order reason when one is provided', async () => {
    const user = userEvent.setup();

    render(
      <GameScheduledSellOrdersTab
        isLoading={false}
        orders={[
          {
            id: 3,
            userId: 1,
            seasonId: 1,
            positionId: 12,
            videoId: 'video-3',
            videoTitle: '실패 주문',
            channelTitle: '채널 C',
            thumbnailUrl: 'https://example.com/c.jpg',
            regionCode: 'KR',
            targetRank: 30,
            triggerDirection: 'RANK_IMPROVES_TO',
            status: 'FAILED',
            currentRank: 40,
            buyRank: 33,
            quantity: 100,
            stakePoints: 5000,
            sellPricePoints: null,
            settledPoints: null,
            pnlPoints: null,
            failureReason: '최소 보유 시간이 지나야 매도할 수 있습니다.',
            triggeredAt: null,
            executedAt: null,
            canceledAt: null,
            createdAt: '2026-04-24T00:00:00.000Z',
            updatedAt: '2026-04-24T00:00:00.000Z',
          },
        ]}
      />,
    );

    await user.click(screen.getByRole('tab', { name: '전체' }));

    expect(screen.getByText('최소 보유 시간이 지나야 매도할 수 있습니다.')).toBeInTheDocument();
  });
});
