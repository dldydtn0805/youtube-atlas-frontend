import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GameHighlight } from '../../../features/game/types';
import GameHighlightsTab from './GameHighlightsTab';

function createHighlight(overrides: Partial<GameHighlight> = {}): GameHighlight {
  return {
    id: 'highlight-1',
    highlightType: 'SNIPE',
    title: 'Highlight',
    description: '설명',
    positionId: 1,
    videoId: 'video-1',
    videoTitle: '하이라이트 1',
    channelTitle: '채널',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    buyRank: 10,
    highlightRank: 2,
    sellRank: null,
    rankDiff: 8,
    quantity: 1,
    stakePoints: 100,
    currentPricePoints: 200,
    profitPoints: 100,
    profitRatePercent: 20,
    strategyTags: ['SNIPE'],
    highlightScore: 1000,
    status: 'OPEN',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('GameHighlightsTab', () => {
  it('hides the empty message while highlights are loading', () => {
    render(<GameHighlightsTab highlights={[]} isLoading onSelectHighlight={vi.fn()} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('하이라이트가 없습니다.')).not.toBeInTheDocument();
  });

  it('sorts highlights by tier score descending', () => {
    render(
      <GameHighlightsTab
        highlights={[
          createHighlight({ id: 'low', videoTitle: '낮은 점수', highlightScore: 1200 }),
          createHighlight({ id: 'high', videoTitle: '높은 점수', highlightScore: 5400 }),
          createHighlight({ id: 'mid', videoTitle: '중간 점수', highlightScore: 3300 }),
        ]}
        isLoading={false}
        onSelectHighlight={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('높은 점수'),
      expect.stringContaining('중간 점수'),
      expect.stringContaining('낮은 점수'),
    ]);
  });

  it('selects the highlight video from the thumbnail without opening the chart', () => {
    const highlight = createHighlight();
    const onSelectHighlight = vi.fn();
    const onSelectHighlightVideo = vi.fn();

    render(
      <GameHighlightsTab
        highlights={[highlight]}
        isLoading={false}
        onSelectHighlight={onSelectHighlight}
        onSelectHighlightVideo={onSelectHighlightVideo}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '하이라이트 1 재생' }));

    expect(onSelectHighlightVideo).toHaveBeenCalledWith(highlight);
    expect(onSelectHighlight).not.toHaveBeenCalled();
  });
});
