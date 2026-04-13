import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RankingGameSelectedVideoActions } from './RankingGamePanel';

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
        isChartDisabled={false}
        isSellDisabled={false}
        isSellSubmitting={false}
        onContentClick={onContentClick}
        onEyebrowClick={onEyebrowClick}
        onHeaderClick={onHeaderClick}
        onOpenBuyTradeModal={vi.fn()}
        onOpenRankHistory={vi.fn()}
        onOpenSellTradeModal={vi.fn()}
        selectedGameActionChannelTitle="Channel"
        selectedGameActionTitle="Video Title"
        selectedVideoId="video-1"
        selectedVideoOpenPositionCount={0}
        sellActionTitle="매도"
      />,
    );

    fireEvent.click(screen.getByText('Now Playing'));

    expect(onEyebrowClick).toHaveBeenCalledTimes(1);
    expect(onHeaderClick).not.toHaveBeenCalled();
    expect(onContentClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Video Title', { selector: 'p' }));

    expect(onContentClick).toHaveBeenCalledTimes(1);
    expect(onEyebrowClick).toHaveBeenCalledTimes(1);
    expect(onHeaderClick).not.toHaveBeenCalled();
  });
});
