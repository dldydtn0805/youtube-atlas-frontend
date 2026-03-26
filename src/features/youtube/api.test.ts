import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createMockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('fetchVideoCategories', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requests categories from the backend catalog endpoint', async () => {
    const { fetchVideoCategories } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse([
        {
          id: '0',
          label: '전체',
          description: '전체',
          sourceIds: [],
        },
      ]),
    );

    vi.stubGlobal('fetch', fetchMock);

    const categories = await fetchVideoCategories('KR');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/catalog/regions/KR/categories',
      undefined,
    );
    expect(categories).toEqual([
      {
        id: '0',
        label: '전체',
        description: '전체',
        sourceIds: [],
      },
    ]);
  });
});

describe('fetchPopularVideosByCategory', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requests the selected category page from the backend', async () => {
    const { fetchPopularVideosByCategory } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(
      createMockResponse({
        categoryId: '20',
        label: '게임',
        description: '게임',
        items: [
          {
            id: 'video-1',
            contentDetails: {
              duration: 'PT5M12S',
            },
            statistics: {
              viewCount: '125000',
            },
            snippet: {
              title: 'full review',
              channelTitle: 'beta',
              categoryId: '20',
              thumbnails: {
                default: { url: 'https://example.com/1.jpg', width: 120, height: 90 },
                medium: { url: 'https://example.com/1.jpg', width: 320, height: 180 },
                high: { url: 'https://example.com/1.jpg', width: 480, height: 360 },
              },
            },
          },
        ],
        nextPageToken: 'next-page',
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const section = await fetchPopularVideosByCategory(
      'US',
      {
        id: '20',
        label: '게임',
        description: '게임',
        sourceIds: ['20'],
      },
      'cursor-1',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/catalog/regions/US/categories/20/videos?pageToken=cursor-1',
      undefined,
    );
    expect(section.nextPageToken).toBe('next-page');
    expect(section.items.map((item) => item.id)).toEqual(['video-1']);
  });
});
