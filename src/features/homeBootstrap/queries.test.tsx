import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { YouTubeCategorySection } from '../youtube/types';
import type { PublicHomeBootstrap } from './api';
import { usePublicHomeBootstrap } from './queries';

const { fetchPublicHomeBootstrapMock } = vi.hoisted(() => ({
  fetchPublicHomeBootstrapMock: vi.fn(),
}));

vi.mock('./api', () => ({
  fetchPublicHomeBootstrap: fetchPublicHomeBootstrapMock,
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('usePublicHomeBootstrap', () => {
  afterEach(() => {
    fetchPublicHomeBootstrapMock.mockReset();
  });

  it('hydrates every initial public home cache from one request', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const topVideos = {
      availableCategories: [],
      categoryId: '0',
      description: '전체 인기 영상',
      items: [],
      label: '전체',
      nextPageToken: undefined,
    } satisfies YouTubeCategorySection;
    const musicTopVideos = {
      ...topVideos,
      categoryId: '10',
      label: '음악',
    };
    const bootstrap = {
      categories: [
        {
          description: '전체 인기 영상',
          id: '0',
          label: '전체',
          sourceIds: [],
        },
      ],
      gameMarket: [],
      musicTopVideos,
      newEntries: { categoryId: '0', items: [], regionCode: 'KR' },
      realtimeSurging: { categoryId: '0', items: [], regionCode: 'KR' },
      regionCode: 'KR',
      topRankRisers: { categoryId: '0', items: [], regionCode: 'KR' },
      topVideos,
    } as unknown as PublicHomeBootstrap;
    fetchPublicHomeBootstrapMock.mockResolvedValue(bootstrap);

    const { result } = renderHook(() => usePublicHomeBootstrap('KR'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    expect(fetchPublicHomeBootstrapMock).toHaveBeenCalledTimes(1);
    expect(fetchPublicHomeBootstrapMock).toHaveBeenCalledWith('KR');
    expect(queryClient.getQueryData(['videoCategories', 'KR'])).toEqual(
      bootstrap.categories,
    );
    expect(
      queryClient.getQueryData<InfiniteData<YouTubeCategorySection>>([
        'popularVideosByCategory',
        'KR',
        '0',
      ]),
    ).toEqual({ pageParams: [undefined], pages: [topVideos] });
    expect(
      queryClient.getQueryData<InfiniteData<YouTubeCategorySection>>([
        'musicTopVideos',
        'KR',
      ]),
    ).toEqual({ pageParams: [undefined], pages: [musicTopVideos] });
    expect(queryClient.getQueryData(['game', 'market', null, 'KR'])).toEqual(
      bootstrap.gameMarket,
    );
  });
});
