import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GameScheduledSellOrdersTab from './GameScheduledSellOrdersTab';

describe('GameScheduledSellOrdersTab', () => {
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
});
