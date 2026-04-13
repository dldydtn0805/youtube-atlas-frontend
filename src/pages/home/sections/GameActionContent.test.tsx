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
});
