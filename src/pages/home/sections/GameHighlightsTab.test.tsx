import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
    vi.restoreAllMocks();
  });

  it('hides the empty message while highlights are loading', () => {
    render(<GameHighlightsTab highlights={[]} isLoading onSelectHighlight={vi.fn()} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('하이라이트가 없습니다.')).not.toBeInTheDocument();
  });

  it('sorts highlights by latest first by default', () => {
    render(
      <GameHighlightsTab
        highlights={[
          createHighlight({ id: 'old', videoTitle: '오래된 하이라이트', createdAt: '2026-01-01T00:00:00.000Z' }),
          createHighlight({ id: 'new', videoTitle: '최신 하이라이트', createdAt: '2026-01-03T00:00:00.000Z' }),
          createHighlight({ id: 'mid', videoTitle: '중간 하이라이트', createdAt: '2026-01-02T00:00:00.000Z' }),
        ]}
        isLoading={false}
        onSelectHighlight={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('최신 하이라이트'),
      expect.stringContaining('중간 하이라이트'),
      expect.stringContaining('오래된 하이라이트'),
    ]);
  });

  it('sorts highlights by tier score when selected', () => {
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

    fireEvent.click(screen.getByRole('button', { name: '티어 점수순' }));

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('높은 점수'),
      expect.stringContaining('중간 점수'),
      expect.stringContaining('낮은 점수'),
    ]);
  });

  it('renders the tier score breakdown when the backend includes it', () => {
    render(
      <GameHighlightsTab
        highlights={[
          createHighlight({
            highlightScore: 5_360,
            scoreBreakdown: {
              totalScore: 5_360,
              strategyScores: [
                {
                  strategyType: 'SNIPE',
                  baseScore: 5_000,
                  rankDiff: 8,
                  rankDiffMultiplier: 20,
                  rankDiffBonus: 160,
                  profitRatePercent: 20,
                  profitRateMultiplier: 10,
                  maxProfitRateBonus: 5_000,
                  profitRateBonus: 200,
                  profitPoints: 100,
                  minProfitPointsForBonus: 5_000,
                  maxProfitPointsBonus: 15_000,
                  profitPointsBonus: 0,
                  totalScore: 5_360,
                },
              ],
            },
          }),
        ]}
        isLoading={false}
        onSelectHighlight={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('티어 점수 산식')).toHaveTextContent('스나이프');
    expect(screen.getByLabelText('티어 점수 산식')).toHaveTextContent('기본 +5,000점');
    expect(screen.getByLabelText('티어 점수 산식')).toHaveTextContent('순위 +160점');
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

  it('scrolls the matching highlight into view', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(
      <GameHighlightsTab
        highlights={[
          createHighlight({ id: 'one', positionId: 1, videoTitle: '첫 번째' }),
          createHighlight({ id: 'target', positionId: 42, videoTitle: '대상' }),
        ]}
        isLoading={false}
        onSelectHighlight={vi.fn()}
        scrollTarget={{ positionId: 42, videoId: 'video-target' }}
      />,
    );

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' });
    });
    expect(screen.getByText('대상').closest('.app-shell__game-highlight')).toHaveAttribute(
      'data-scroll-target',
      'true',
    );
  });
});
