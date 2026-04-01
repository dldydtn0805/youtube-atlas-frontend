import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VideoList from './VideoList';

const baseSection = {
  categoryId: 'favorite-streamers',
  description: '즐겨찾기 채널 영상',
  items: [
    {
      contentDetails: {
        duration: 'PT1M',
      },
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
      statistics: {
        viewCount: '1500',
      },
    },
  ],
  label: '즐겨찾기 채널',
};

describe('VideoList', () => {
  it('uses a custom rank label for the main section when provided', () => {
    const onSelectVideo = vi.fn();

    render(
      <VideoList
        getRankLabel={() => '현재 12위'}
        hasNextPage={false}
        isError={false}
        isFetchingNextPage={false}
        isLoading={false}
        onLoadMore={vi.fn()}
        onSelectVideo={onSelectVideo}
        section={baseSection}
      />,
    );

    expect(screen.getByText('현재 12위')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /테스트 영상/i }));

    expect(onSelectVideo).toHaveBeenCalledWith('video-1', expect.any(HTMLButtonElement));
  });
});
