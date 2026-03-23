import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPopularVideosByCategory, fetchVideoCategories } from './api';

describe('fetchVideoCategories', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_YOUTUBE_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('excludes the shorts category from the selectable category list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: '42',
              snippet: {
                assignable: true,
                title: 'Shorts',
              },
            },
            {
              id: '20',
              snippet: {
                assignable: true,
                title: 'Gaming',
              },
            },
          ],
        }),
      }),
    );

    const categories = await fetchVideoCategories('US');

    expect(categories).toEqual([
      {
        id: '0',
        label: '전체',
        description: '카테고리 구분 없이 현재 국가 전체 인기 영상을 보여줍니다.',
      },
      {
        id: '20',
        label: '게임',
        description: '게임 방송, 리뷰, 신작 반응 등 게임 카테고리 인기 영상입니다.',
      },
    ]);
  });
});

describe('fetchPopularVideosByCategory', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_YOUTUBE_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('filters shorts-like videos out of the returned video list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'short-video',
              contentDetails: {
                duration: 'PT2M40S',
              },
              snippet: {
                title: 'quick clip',
                channelTitle: 'alpha',
                categoryId: '20',
                thumbnails: {
                  default: { url: 'https://example.com/1.jpg', width: 120, height: 90 },
                  medium: { url: 'https://example.com/1.jpg', width: 320, height: 180 },
                  high: { url: 'https://example.com/1.jpg', width: 480, height: 360 },
                },
              },
            },
            {
              id: 'normal-video',
              contentDetails: {
                duration: 'PT5M12S',
              },
              snippet: {
                title: 'full review',
                channelTitle: 'beta',
                categoryId: '20',
                thumbnails: {
                  default: { url: 'https://example.com/2.jpg', width: 120, height: 90 },
                  medium: { url: 'https://example.com/2.jpg', width: 320, height: 180 },
                  high: { url: 'https://example.com/2.jpg', width: 480, height: 360 },
                },
              },
            },
          ],
        }),
      }),
    );

    const section = await fetchPopularVideosByCategory(
      'US',
      {
        id: '20',
        label: '게임',
        description: '게임',
      },
    );

    expect(section.items.map((item) => item.id)).toEqual(['normal-video']);
  });

  it('filters title-based shorts markers even when the duration is longer than 3 minutes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'keyword-short',
              contentDetails: {
                duration: 'PT4M10S',
              },
              snippet: {
                title: 'best moments short',
                channelTitle: 'alpha',
                categoryId: '20',
                thumbnails: {
                  default: { url: 'https://example.com/1.jpg', width: 120, height: 90 },
                  medium: { url: 'https://example.com/1.jpg', width: 320, height: 180 },
                  high: { url: 'https://example.com/1.jpg', width: 480, height: 360 },
                },
              },
            },
            {
              id: 'full-video',
              contentDetails: {
                duration: 'PT6M5S',
              },
              snippet: {
                title: 'complete breakdown',
                channelTitle: 'beta',
                categoryId: '20',
                thumbnails: {
                  default: { url: 'https://example.com/2.jpg', width: 120, height: 90 },
                  medium: { url: 'https://example.com/2.jpg', width: 320, height: 180 },
                  high: { url: 'https://example.com/2.jpg', width: 480, height: 360 },
                },
              },
            },
          ],
        }),
      }),
    );

    const section = await fetchPopularVideosByCategory(
      'US',
      {
        id: '20',
        label: '게임',
        description: '게임',
      },
    );

    expect(section.items.map((item) => item.id)).toEqual(['full-video']);
  });

  it('requests the next api page when the current page only contains shorts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'shorts-only',
              contentDetails: {
                duration: 'PT12S',
              },
              snippet: {
                title: '#shorts teaser',
                channelTitle: 'alpha',
                categoryId: '24',
                thumbnails: {
                  default: { url: 'https://example.com/1.jpg', width: 120, height: 90 },
                  medium: { url: 'https://example.com/1.jpg', width: 320, height: 180 },
                  high: { url: 'https://example.com/1.jpg', width: 480, height: 360 },
                },
              },
            },
          ],
          nextPageToken: 'page-2',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              id: 'long-video',
              contentDetails: {
                duration: 'PT4M30S',
              },
              snippet: {
                title: 'episode highlight',
                channelTitle: 'beta',
                categoryId: '24',
                thumbnails: {
                  default: { url: 'https://example.com/2.jpg', width: 120, height: 90 },
                  medium: { url: 'https://example.com/2.jpg', width: 320, height: 180 },
                  high: { url: 'https://example.com/2.jpg', width: 480, height: 360 },
                },
              },
            },
          ],
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const section = await fetchPopularVideosByCategory(
      'KR',
      {
        id: '24',
        label: '예능',
        description: '예능',
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(section.items.map((item) => item.id)).toEqual(['long-video']);
  });

  it('fetches overall rankings without sending a category filter for the synthetic all category', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'overall-video',
            contentDetails: {
              duration: 'PT9M1S',
            },
            snippet: {
              title: 'global ranking video',
              channelTitle: 'gamma',
              categoryId: '10',
              thumbnails: {
                default: { url: 'https://example.com/3.jpg', width: 120, height: 90 },
                medium: { url: 'https://example.com/3.jpg', width: 320, height: 180 },
                high: { url: 'https://example.com/3.jpg', width: 480, height: 360 },
              },
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await fetchPopularVideosByCategory(
      'JP',
      {
        id: '0',
        label: '전체',
        description: '전체',
      },
    );

    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);

    expect(requestUrl.searchParams.get('videoCategoryId')).toBeNull();
  });
});
