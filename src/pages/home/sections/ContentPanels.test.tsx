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
        onSelectRegion={vi.fn()}
        onSelectVideo={vi.fn()}
        onSelectView={vi.fn()}
        regionOptions={[
          { label: '한국', value: 'KR' },
          { label: '미국', value: 'US' },
          { label: '일본', value: 'JP' },
        ]}
        section={{
          categoryId: '10',
          description: '음악 영상',
          items: [],
          label: '음악',
        }}
        selectedCountryName="대한민국"
        selectedRegionCode="KR"
        selectedViewId="music"
        trendSignalsByVideoId={{}}
        viewOptions={[]}
      />,
    );

    expect(screen.getByRole('button', { name: 'YouTube TOP 20 담기' })).toBeInTheDocument();
  });

  it('changes the country immediately from the video-list filter', () => {
    const onSelectRegion = vi.fn();

    render(
      <ChartPanel
        chartSortMode="popular-desc"
        chartSortOptions={[{ id: 'popular-desc', label: '높은 순위 순' }]}
        hasNextPage={false}
        hasResolvedTrendSignals
        isChartError={false}
        isChartLoading={false}
        isFetchingNextPage={false}
        onChangeChartSortMode={vi.fn()}
        onLoadMore={vi.fn()}
        onSelectRegion={onSelectRegion}
        onSelectVideo={vi.fn()}
        onSelectView={vi.fn()}
        regionOptions={[
          { label: '한국', value: 'KR' },
          { label: '미국', value: 'US' },
          { label: '일본', value: 'JP' },
        ]}
        selectedCountryName="한국"
        selectedRegionCode="KR"
        selectedViewId="top200"
        trendSignalsByVideoId={{}}
        viewOptions={[]}
      />,
    );

    expect(screen.getByRole('button', { name: '한국' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '미국' }));

    expect(onSelectRegion).toHaveBeenCalledWith('US');
    expect(screen.getAllByRole('button', { name: /^(한국|미국|일본)$/ })).toHaveLength(3);
  });
});
