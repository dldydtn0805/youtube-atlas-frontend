import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GameSelectedVideoPriceSummary, SelectedVideoGameActionsBundle } from './GameActionContent';

describe('GameSelectedVideoPriceSummary', () => {
  it('shows fallback rank and view count metadata when market data is unavailable', () => {
    render(
      <GameSelectedVideoPriceSummary
        fallbackRankLabel="3위"
        fallbackViewCountLabel="12.5만"
        preferMarketSummary
        selectedVideoCurrentChartRank={3}
        selectedVideoId="video-1"
        selectedVideoIsChartOut={false}
        selectedVideoOpenPositionCount={0}
        selectedVideoOpenPositionSummary={{
          evaluationPoints: 0,
          profitPoints: 0,
          quantity: 0,
          stakePoints: 0,
        }}
        selectedVideoTrendBadges={[]}
      />,
    );

    expect(screen.getByLabelText('선택한 영상 메타데이터')).toHaveTextContent('순위 3위 · 조회수 12.5만');
  });

  it('shows view count next to rank when market data is available', () => {
    render(
      <GameSelectedVideoPriceSummary
        fallbackRankLabel="3위"
        fallbackViewCountLabel="12.5만"
        preferMarketSummary
        selectedVideoCurrentChartRank={3}
        selectedVideoId="video-1"
        selectedVideoIsChartOut={false}
        selectedVideoMarketEntry={{
          buyBlockedReason: null,
          canBuy: true,
          basePricePoints: 1000,
          capturedAt: '2026-04-13T00:00:00.000Z',
          channelTitle: '배도',
          currentPricePoints: 1128,
          currentRank: 3,
          currentViewCount: 125000,
          isNew: false,
          momentumPriceDeltaPercent: 12.8,
          momentumPriceDeltaPoints: 128,
          momentumPriceType: 'PREMIUM',
          previousRank: 4,
          rankChange: 1,
          thumbnailUrl: 'https://example.com/thumb.jpg',
          title: '테스트 영상',
          videoId: 'video-1',
          viewCountDelta: 1000,
        }}
        selectedVideoOpenPositionCount={0}
        selectedVideoOpenPositionSummary={{
          evaluationPoints: 0,
          profitPoints: 0,
          quantity: 0,
          stakePoints: 0,
        }}
        selectedVideoTrendBadges={[]}
      />,
    );

    expect(screen.getByLabelText('선택한 영상 현재 가격')).toHaveTextContent(
      '순위 3위 · 조회수 12.5만 · 현재 단가',
    );
    expect(screen.getByText('프리미엄 +12.8%')).toBeInTheDocument();
    expect(screen.queryByText('하이라이트 점수')).not.toBeInTheDocument();
  });

  it('shows discount badge next to selected video metadata', () => {
    render(
      <GameSelectedVideoPriceSummary
        fallbackRankLabel="3위"
        preferMarketSummary
        selectedVideoCurrentChartRank={3}
        selectedVideoId="video-1"
        selectedVideoIsChartOut={false}
        selectedVideoMarketEntry={{
          buyBlockedReason: null,
          canBuy: true,
          basePricePoints: 1000,
          capturedAt: '2026-04-13T00:00:00.000Z',
          channelTitle: '배도',
          currentPricePoints: 942,
          currentRank: 3,
          currentViewCount: 125000,
          isNew: false,
          momentumPriceDeltaPercent: -5.8,
          momentumPriceDeltaPoints: -58,
          momentumPriceType: 'DISCOUNT',
          previousRank: 2,
          rankChange: -1,
          thumbnailUrl: 'https://example.com/thumb.jpg',
          title: '테스트 영상',
          videoId: 'video-1',
          viewCountDelta: 1000,
        }}
        selectedVideoOpenPositionCount={0}
        selectedVideoOpenPositionSummary={{
          evaluationPoints: 0,
          profitPoints: 0,
          quantity: 0,
          stakePoints: 0,
        }}
        selectedVideoTrendBadges={[]}
      />,
    );

    expect(screen.getByText('세일 -5.8%')).toBeInTheDocument();
  });

  it('shows fallback trend badges when market data is unavailable', () => {
    render(
      <GameSelectedVideoPriceSummary
        fallbackRankLabel="3위"
        preferMarketSummary
        selectedVideoCurrentChartRank={3}
        selectedVideoId="video-1"
        selectedVideoIsChartOut={false}
        selectedVideoOpenPositionCount={0}
        selectedVideoOpenPositionSummary={{
          evaluationPoints: 0,
          profitPoints: 0,
          quantity: 0,
          stakePoints: 0,
        }}
        selectedVideoTrendBadges={[{ label: '+2', tone: 'up' }]}
      />,
    );

    expect(screen.getByText('2위 상승')).toBeInTheDocument();
  });

  it('shows fallback rank and view count in the now playing panel bundle', () => {
    render(
      <SelectedVideoGameActionsBundle
        buyActionTitle="매수"
        canShowGameActions
        fallbackRankLabel="3위"
        fallbackViewCountLabel="12.5만"
        isBuySubmitting={false}
        isChartDisabled={false}
        isSelectedVideoBuyDisabled={false}
        isSelectedVideoSellDisabled={false}
        isSellSubmitting={false}
        mode="panel"
        onOpenBuyTradeModal={() => {}}
        onOpenRankHistory={() => {}}
        onOpenSellTradeModal={() => {}}
        selectedGameActionChannelTitle="배도"
        selectedGameActionTitle="테스트 영상"
        selectedVideoCurrentChartRank={3}
        selectedVideoId="video-1"
        selectedVideoIsChartOut={false}
        selectedVideoOpenPositionCount={0}
        selectedVideoOpenPositionSummary={{
          evaluationPoints: 0,
          profitPoints: 0,
          quantity: 0,
          stakePoints: 0,
        }}
        selectedVideoTrendBadges={[]}
        sellActionTitle="매도"
      />,
    );

    expect(screen.getByText('순위')).toBeInTheDocument();
    expect(screen.getByText('3위')).toBeInTheDocument();
    expect(screen.getByText('조회수')).toBeInTheDocument();
    expect(screen.getByText('12.5만')).toBeInTheDocument();
  });

  it('shows view count in the now playing panel bundle when market data is available', () => {
    render(
      <SelectedVideoGameActionsBundle
        buyActionTitle="매수"
        canShowGameActions
        fallbackRankLabel="3위"
        fallbackViewCountLabel="12.5만"
        isBuySubmitting={false}
        isChartDisabled={false}
        isSelectedVideoBuyDisabled={false}
        isSelectedVideoSellDisabled={false}
        isSellSubmitting={false}
        mode="panel"
        onOpenBuyTradeModal={() => {}}
        onOpenRankHistory={() => {}}
        onOpenSellTradeModal={() => {}}
        selectedGameActionChannelTitle="배도"
        selectedGameActionTitle="테스트 영상"
        selectedVideoCurrentChartRank={3}
        selectedVideoId="video-1"
        selectedVideoIsChartOut={false}
        selectedVideoMarketEntry={{
          buyBlockedReason: null,
          canBuy: true,
          capturedAt: '2026-04-13T00:00:00.000Z',
          channelTitle: '배도',
          currentPricePoints: 1200,
          currentRank: 3,
          currentViewCount: 125000,
          isNew: false,
          previousRank: 4,
          rankChange: 1,
          thumbnailUrl: 'https://example.com/thumb.jpg',
          title: '테스트 영상',
          videoId: 'video-1',
          viewCountDelta: 1000,
        }}
        selectedVideoOpenPositionCount={0}
        selectedVideoOpenPositionSummary={{
          evaluationPoints: 0,
          profitPoints: 0,
          quantity: 0,
          stakePoints: 0,
        }}
        selectedVideoTrendBadges={[]}
        sellActionTitle="매도"
      />,
    );

    expect(screen.getByLabelText('선택한 영상 현재 가격')).toHaveTextContent(
      '순위 3위 · 조회수 12.5만 · 현재 단가',
    );
    expect(screen.queryByText('하이라이트 점수')).not.toBeInTheDocument();
  });

  it('does not show legacy reward badges on selected positions', () => {
    render(
      <GameSelectedVideoPriceSummary
        selectedVideoCurrentChartRank={3}
        selectedVideoId="video-1"
        selectedVideoIsChartOut={false}
        selectedVideoOpenPositionCount={1}
        selectedVideoOpenPositionSummary={{
          evaluationPoints: 1000,
          profitPoints: 0,
          quantity: 1,
          stakePoints: 1000,
        }}
        selectedVideoTrendBadges={[]}
      />,
    );

    expect(screen.queryByText(/채굴/)).not.toBeInTheDocument();
    expect(screen.queryByText(/코인/)).not.toBeInTheDocument();
  });
});
