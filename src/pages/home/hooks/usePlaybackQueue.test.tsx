import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VideoCategory } from '../../../constants/videoCategories';
import type { YouTubeCategorySection, YouTubeVideoItem } from '../../../features/youtube/types';
import { GAME_PORTFOLIO_QUEUE_ID, HISTORY_PLAYBACK_QUEUE_ID, getCategoryPlaybackQueueId } from '../utils';
import usePlaybackQueue from './usePlaybackQueue';

function createVideo(id: string, categoryId: string): YouTubeVideoItem {
  return {
    id,
    contentDetails: {
      duration: '',
    },
    snippet: {
      categoryId,
      channelId: 'channel-1',
      channelTitle: 'Channel',
      thumbnails: {
        default: { url: 'https://example.com/default.jpg', width: 120, height: 90 },
        high: { url: 'https://example.com/high.jpg', width: 480, height: 360 },
        medium: { url: 'https://example.com/medium.jpg', width: 320, height: 180 },
      },
      title: `Video ${id}`,
    },
  };
}

function createSection(categoryId: string, videoIds: string[]): YouTubeCategorySection {
  return {
    categoryId,
    description: 'Section',
    items: videoIds.map((videoId) => createVideo(videoId, categoryId)),
    label: categoryId,
  };
}

function createVideoIds(count: number, prefix = 'video') {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`);
}

describe('usePlaybackQueue', () => {
  const sortedVideoCategories: VideoCategory[] = [
    { id: '0', label: 'All', description: 'All videos', sourceIds: [] },
    { id: '10', label: 'Music', description: 'Music videos', sourceIds: [] },
  ];

  it('does not auto-select the top chart video on initial load by default', () => {
    const setSelectedCategoryId = vi.fn();
    const { result } = renderHook(() =>
      usePlaybackQueue({
        favoriteStreamerVideoSection: undefined,
        isMobileLayout: false,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop: vi.fn(),
        selectedCategoryId: '0',
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId,
        sortedVideoCategories,
      }),
    );

    expect(result.current.selectedVideoId).toBeUndefined();
  });

  it('auto-selects the first chart video when configured to do so', async () => {
    const setSelectedCategoryId = vi.fn();
    const { result } = renderHook(() =>
      usePlaybackQueue({
        autoSelectFirstVideoWhenEmpty: true,
        favoriteStreamerVideoSection: undefined,
        isMobileLayout: false,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop: vi.fn(),
        selectedCategoryId: '0',
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId,
        sortedVideoCategories,
      }),
    );

    await waitFor(() => {
      expect(result.current.selectedVideoId).toBe('video-top');
    });
  });

  it('auto-selects a random chart video from the top 50 on initial load', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const setSelectedCategoryId = vi.fn();

    try {
      const { result } = renderHook(() =>
        usePlaybackQueue({
          autoSelectFirstVideoWhenEmpty: true,
          favoriteStreamerVideoSection: undefined,
          isMobileLayout: false,
          realtimeSurgingSection: undefined,
          restoredPlaybackVideo: undefined,
          scrollToPlayerTop: vi.fn(),
          selectedCategoryId: '0',
          selectedSection: createSection(getCategoryPlaybackQueueId('0'), createVideoIds(60)),
          setSelectedCategoryId,
          sortedVideoCategories,
        }),
      );

      await waitFor(() => {
        expect(result.current.selectedVideoId).toBe('video-50');
      });
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('prefers the configured initial playback section when auto-selecting', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const setSelectedCategoryId = vi.fn();
    const buyableSection = createSection('buyable-market', createVideoIds(60, 'video-buyable'));

    try {
      const { result } = renderHook(() =>
        usePlaybackQueue({
          autoSelectFirstVideoWhenEmpty: true,
          extraPlaybackSections: [buyableSection],
          favoriteStreamerVideoSection: undefined,
          isMobileLayout: false,
          preferredInitialPlaybackSection: buyableSection,
          realtimeSurgingSection: undefined,
          restoredPlaybackVideo: undefined,
          scrollToPlayerTop: vi.fn(),
          selectedCategoryId: '0',
          selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
          setSelectedCategoryId,
          sortedVideoCategories,
        }),
      );

      await waitFor(() => {
        expect(result.current.activePlaybackQueueId).toBe('buyable-market');
        expect(result.current.selectedVideoId).toBe('video-buyable-50');
      });
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('applies the preferred initial section once when a selection key is provided', async () => {
    const setSelectedCategoryId = vi.fn();
    const buyableSection = createSection('buyable-market', ['video-buyable']);
    let preferredInitialPlaybackSectionSelectionKey: string | null = null;

    const { result, rerender } = renderHook(() =>
      usePlaybackQueue({
        extraPlaybackSections: [buyableSection],
        favoriteStreamerVideoSection: undefined,
        isMobileLayout: false,
        preferredInitialPlaybackSection: buyableSection,
        preferredInitialPlaybackSectionSelectionKey,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop: vi.fn(),
        selectedCategoryId: '0',
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId,
        sortedVideoCategories,
      }),
    );

    act(() => {
      result.current.handleSelectVideo('video-top', getCategoryPlaybackQueueId('0'));
    });

    expect(result.current.selectedVideoId).toBe('video-top');

    preferredInitialPlaybackSectionSelectionKey = 'login:user-1';
    rerender();

    await waitFor(() => {
      expect(result.current.activePlaybackQueueId).toBe('buyable-market');
      expect(result.current.selectedVideoId).toBe('video-buyable');
    });

    act(() => {
      result.current.handleSelectVideo('video-top', getCategoryPlaybackQueueId('0'));
    });

    rerender();

    expect(result.current.selectedVideoId).toBe('video-top');
  });

  it('falls back to the first portfolio video when the keyed preferred section is empty', async () => {
    const setSelectedCategoryId = vi.fn();
    const buyableSection = createSection('buyable-market', []);
    const portfolioSection = createSection(GAME_PORTFOLIO_QUEUE_ID, ['video-latest-position']);

    const { result } = renderHook(() =>
      usePlaybackQueue({
        extraPlaybackSections: [buyableSection],
        favoriteStreamerVideoSection: undefined,
        gamePortfolioSection: portfolioSection,
        isMobileLayout: false,
        preferredInitialPlaybackFallbackSection: portfolioSection,
        preferredInitialPlaybackSection: buyableSection,
        preferredInitialPlaybackSectionSelectionKey: 'login:user-1',
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop: vi.fn(),
        selectedCategoryId: '0',
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId,
        sortedVideoCategories,
      }),
    );

    await waitFor(() => {
      expect(result.current.activePlaybackQueueId).toBe(GAME_PORTFOLIO_QUEUE_ID);
      expect(result.current.selectedVideoId).toBe('video-latest-position');
    });
  });

  it('waits for the preferred initial playback section before falling back to the chart', async () => {
    const setSelectedCategoryId = vi.fn();
    let preferredInitialPlaybackSection = createSection('buyable-market', []);
    let preferredInitialPlaybackSectionLoading = true;

    const { result, rerender } = renderHook(() =>
      usePlaybackQueue({
        autoSelectFirstVideoWhenEmpty: true,
        extraPlaybackSections: [preferredInitialPlaybackSection],
        favoriteStreamerVideoSection: undefined,
        isMobileLayout: false,
        preferredInitialPlaybackSection,
        preferredInitialPlaybackSectionLoading,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop: vi.fn(),
        selectedCategoryId: '0',
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId,
        sortedVideoCategories,
      }),
    );

    expect(result.current.selectedVideoId).toBeUndefined();

    preferredInitialPlaybackSection = createSection('buyable-market', ['video-buyable']);
    preferredInitialPlaybackSectionLoading = false;
    rerender();

    await waitFor(() => {
      expect(result.current.activePlaybackQueueId).toBe('buyable-market');
      expect(result.current.selectedVideoId).toBe('video-buyable');
    });
  });

  it('auto-selects the first video after a user changes category', async () => {
    const setSelectedCategoryId = vi.fn();
    let selectedCategoryId = '0';
    let selectedSection = createSection(getCategoryPlaybackQueueId('0'), ['video-top']);

    const { result, rerender } = renderHook(() =>
      usePlaybackQueue({
        favoriteStreamerVideoSection: undefined,
        isMobileLayout: false,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop: vi.fn(),
        selectedCategoryId,
        selectedSection,
        setSelectedCategoryId: (categoryId) => {
          selectedCategoryId = categoryId;
          setSelectedCategoryId(categoryId);
        },
        sortedVideoCategories,
      }),
    );

    act(() => {
      result.current.handleSelectCategory('10');
    });

    rerender();

    expect(result.current.selectedVideoId).toBeUndefined();

    selectedSection = createSection(getCategoryPlaybackQueueId('10'), ['video-music']);
    rerender();

    await waitFor(() => {
      expect(result.current.selectedVideoId).toBe('video-music');
    });
  });

  it('waits for the selected category chart instead of auto-selecting an owned video', async () => {
    const setSelectedCategoryId = vi.fn();
    let selectedCategoryId = '0';
    let selectedSection = createSection(getCategoryPlaybackQueueId('0'), ['video-top']);

    const { result, rerender } = renderHook(() =>
      usePlaybackQueue({
        favoriteStreamerVideoSection: undefined,
        gamePortfolioSection: createSection(GAME_PORTFOLIO_QUEUE_ID, ['video-owned']),
        isMobileLayout: false,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop: vi.fn(),
        selectedCategoryId,
        selectedSection,
        setSelectedCategoryId: (categoryId) => {
          selectedCategoryId = categoryId;
          setSelectedCategoryId(categoryId);
        },
        sortedVideoCategories,
      }),
    );

    act(() => {
      result.current.handleSelectCategory('10');
    });

    rerender();

    expect(result.current.selectedVideoId).toBeUndefined();

    selectedSection = createSection(getCategoryPlaybackQueueId('10'), ['video-music']);
    rerender();

    await waitFor(() => {
      expect(result.current.selectedVideoId).toBe('video-music');
    });
  });

  it('scrolls to the player immediately when a category is selected', () => {
    const setSelectedCategoryId = vi.fn();
    let selectedCategoryId = '0';
    const scrollToPlayerTop = vi.fn();

    const { result } = renderHook(() =>
      usePlaybackQueue({
        favoriteStreamerVideoSection: undefined,
        isMobileLayout: false,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop,
        selectedCategoryId,
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId: (categoryId) => {
          selectedCategoryId = categoryId;
          setSelectedCategoryId(categoryId);
        },
        sortedVideoCategories,
      }),
    );

    act(() => {
      result.current.handleSelectCategory('10');
    });

    expect(scrollToPlayerTop).toHaveBeenCalledTimes(1);
  });

  it('does not scroll to the player on mobile when a category is selected', () => {
    const setSelectedCategoryId = vi.fn();
    let selectedCategoryId = '0';
    const scrollToPlayerTop = vi.fn();

    const { result } = renderHook(() =>
      usePlaybackQueue({
        favoriteStreamerVideoSection: undefined,
        isMobileLayout: true,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop,
        selectedCategoryId,
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId: (categoryId) => {
          selectedCategoryId = categoryId;
          setSelectedCategoryId(categoryId);
        },
        sortedVideoCategories,
      }),
    );

    act(() => {
      result.current.handleSelectCategory('10');
    });

    expect(scrollToPlayerTop).not.toHaveBeenCalled();
  });

  it('does not scroll to the player on mobile when a video is selected', () => {
    const setSelectedCategoryId = vi.fn();
    const scrollToPlayerTop = vi.fn();

    const { result } = renderHook(() =>
      usePlaybackQueue({
        favoriteStreamerVideoSection: undefined,
        isMobileLayout: true,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop,
        selectedCategoryId: '0',
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId,
        sortedVideoCategories,
      }),
    );

    act(() => {
      result.current.handleSelectVideo('video-top', getCategoryPlaybackQueueId('0'));
    });

    expect(scrollToPlayerTop).not.toHaveBeenCalled();
  });

  it('keeps a history playback selection instead of falling back to the first chart video', async () => {
    const setSelectedCategoryId = vi.fn();

    const { result } = renderHook(() =>
      usePlaybackQueue({
        favoriteStreamerVideoSection: undefined,
        historyPlaybackSection: createSection(HISTORY_PLAYBACK_QUEUE_ID, ['video-history']),
        isMobileLayout: false,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop: vi.fn(),
        selectedCategoryId: '0',
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId,
        sortedVideoCategories,
      }),
    );

    act(() => {
      result.current.handleSelectVideo('video-history', HISTORY_PLAYBACK_QUEUE_ID);
    });

    await waitFor(() => {
      expect(result.current.activePlaybackQueueId).toBe(HISTORY_PLAYBACK_QUEUE_ID);
      expect(result.current.selectedVideoId).toBe('video-history');
    });
  });

  it('plays the next history video when the history playback queue has multiple items', async () => {
    const setSelectedCategoryId = vi.fn();

    const { result } = renderHook(() =>
      usePlaybackQueue({
        favoriteStreamerVideoSection: undefined,
        historyPlaybackSection: createSection(HISTORY_PLAYBACK_QUEUE_ID, ['video-history-1', 'video-history-2']),
        isMobileLayout: false,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop: vi.fn(),
        selectedCategoryId: '0',
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId,
        sortedVideoCategories,
      }),
    );

    act(() => {
      result.current.handleSelectVideo('video-history-1', HISTORY_PLAYBACK_QUEUE_ID);
    });

    await waitFor(() => {
      expect(result.current.selectedVideoId).toBe('video-history-1');
    });

    act(() => {
      result.current.handlePlayNextVideo();
    });

    await waitFor(() => {
      expect(result.current.activePlaybackQueueId).toBe(HISTORY_PLAYBACK_QUEUE_ID);
      expect(result.current.selectedVideoId).toBe('video-history-2');
    });
  });

  it('keeps a selection from an extra playback section', async () => {
    const setSelectedCategoryId = vi.fn();
    const buyableSection = createSection('buyable-market', ['video-buyable']);

    const { result } = renderHook(() =>
      usePlaybackQueue({
        extraPlaybackSections: [buyableSection],
        favoriteStreamerVideoSection: undefined,
        isMobileLayout: false,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop: vi.fn(),
        selectedCategoryId: '0',
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId,
        sortedVideoCategories,
      }),
    );

    act(() => {
      result.current.handleSelectVideo('video-buyable', buyableSection.categoryId);
    });

    await waitFor(() => {
      expect(result.current.activePlaybackQueueId).toBe(buyableSection.categoryId);
      expect(result.current.selectedVideoId).toBe('video-buyable');
    });
  });

  it('keeps a selected extra-section video when that queue refreshes without it', async () => {
    const setSelectedCategoryId = vi.fn();
    let buyableSection = createSection('buyable-market', ['video-buyable', 'video-next']);

    const { result, rerender } = renderHook(() =>
      usePlaybackQueue({
        extraPlaybackSections: [buyableSection],
        favoriteStreamerVideoSection: undefined,
        isMobileLayout: false,
        preserveSelectedVideoWhenQueueChanges: true,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop: vi.fn(),
        selectedCategoryId: '0',
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId,
        sortedVideoCategories,
      }),
    );

    act(() => {
      result.current.handleSelectVideo('video-buyable', buyableSection.categoryId);
    });

    await waitFor(() => {
      expect(result.current.selectedVideoId).toBe('video-buyable');
    });

    buyableSection = createSection('buyable-market', ['video-next']);
    rerender();

    await waitFor(() => {
      expect(result.current.activePlaybackQueueId).toBe(buyableSection.categoryId);
      expect(result.current.selectedVideoId).toBe('video-buyable');
    });
  });

  it('keeps a selected portfolio video when the portfolio queue refreshes empty', async () => {
    const setSelectedCategoryId = vi.fn();
    let portfolioSection = createSection(GAME_PORTFOLIO_QUEUE_ID, ['video-owned']);

    const { result, rerender } = renderHook(() =>
      usePlaybackQueue({
        favoriteStreamerVideoSection: undefined,
        gamePortfolioSection: portfolioSection,
        isMobileLayout: false,
        preserveSelectedVideoWhenQueueChanges: true,
        realtimeSurgingSection: undefined,
        restoredPlaybackVideo: undefined,
        scrollToPlayerTop: vi.fn(),
        selectedCategoryId: '0',
        selectedSection: createSection(getCategoryPlaybackQueueId('0'), ['video-top']),
        setSelectedCategoryId,
        sortedVideoCategories,
      }),
    );

    act(() => {
      result.current.handleSelectVideo('video-owned', GAME_PORTFOLIO_QUEUE_ID);
    });

    await waitFor(() => {
      expect(result.current.activePlaybackQueueId).toBe(GAME_PORTFOLIO_QUEUE_ID);
      expect(result.current.selectedVideoId).toBe('video-owned');
    });

    portfolioSection = createSection(GAME_PORTFOLIO_QUEUE_ID, []);
    rerender();

    await waitFor(() => {
      expect(result.current.activePlaybackQueueId).toBe(GAME_PORTFOLIO_QUEUE_ID);
      expect(result.current.selectedVideoId).toBe('video-owned');
    });
  });
});
