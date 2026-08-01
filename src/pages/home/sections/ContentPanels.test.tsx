import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChartPanel, CommunityPanel } from './ContentPanels';

vi.mock('../../../components/CommentSection/CommentSection', () => ({
  default: ({ videoTitle }: { videoTitle?: string }) => (
    <div data-testid="comment-section">{videoTitle ?? 'comment section'}</div>
  ),
}));

describe('CommunityPanel', () => {
  it('can collapse and expand the live chat panel', () => {
    render(<CommunityPanel selectedVideoId="video-1" selectedVideoTitle="Chat Room" />);

    expect(screen.getByTestId('comment-section')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '실시간 채팅 숨기기' }));

    expect(screen.queryByTestId('comment-section')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '실시간 채팅 펼치기' }));

    expect(screen.getByTestId('comment-section')).toBeInTheDocument();
  });
});

describe('ChartPanel', () => {
  it('renders a contextual chart action beside the sort control', () => {
    render(
      <ChartPanel
        chartHeaderAction={<button type="button">YouTube TOP 20 담기</button>}
        chartSortMode="popular-desc"
        chartSortOptions={[{ id: 'popular-desc', label: '높은 순위 순' }]}
        hasNextPage={false}
        hasResolvedTrendSignals
        isChartError={false}
        isChartLoading={false}
        isFetchingNextPage={false}
        onChangeChartSortMode={vi.fn()}
        onLoadMore={vi.fn()}
        onOpenRegionModal={vi.fn()}
        onSelectVideo={vi.fn()}
        onSelectView={vi.fn()}
        section={{
          categoryId: '10',
          description: '음악 영상',
          items: [],
          label: '음악',
        }}
        selectedCountryName="대한민국"
        selectedViewId="music"
        trendSignalsByVideoId={{}}
        viewOptions={[]}
      />,
    );

    expect(screen.getByRole('button', { name: 'YouTube TOP 20 담기' })).toBeInTheDocument();
  });
});
