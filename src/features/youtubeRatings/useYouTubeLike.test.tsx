import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../../lib/api';
import { writePendingYouTubeRating } from './pendingRating';
import useYouTubeLike from './useYouTubeLike';

const useAuthMock = vi.fn();
const fetchYouTubeVideoRatingMock = vi.fn();
const updateYouTubeVideoRatingMock = vi.fn();

vi.mock('../auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('./api', () => ({
  fetchYouTubeVideoRating: (...args: unknown[]) => fetchYouTubeVideoRatingMock(...args),
  updateYouTubeVideoRating: (...args: unknown[]) => updateYouTubeVideoRatingMock(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useYouTubeLike', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useAuthMock.mockReset();
    fetchYouTubeVideoRatingMock.mockReset();
    updateYouTubeVideoRatingMock.mockReset();
  });

  it('sets a YouTube like directly when contextual access is already available', async () => {
    useAuthMock.mockReturnValue({
      accessToken: 'app-token',
      googleProviderAccessToken: 'youtube-token',
      requestYouTubeAccess: vi.fn(),
      status: 'authenticated',
    });
    fetchYouTubeVideoRatingMock.mockResolvedValue({ rating: 'none', videoId: 'video-1' });
    updateYouTubeVideoRatingMock.mockResolvedValue({ rating: 'like', videoId: 'video-1' });
    const { result } = renderHook(() => useYouTubeLike('video-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(fetchYouTubeVideoRatingMock).toHaveBeenCalled());
    act(() => result.current.toggleLike());
    await waitFor(() => expect(result.current.phase).toBe('success'));

    expect(updateYouTubeVideoRatingMock).toHaveBeenCalledWith(
      'app-token',
      'youtube-token',
      'video-1',
      'like',
    );
    expect(result.current.isLiked).toBe(true);
    expect(result.current.message).toContain('좋아요 표시한 동영상');
  });

  it('preserves the like and requests contextual access when no Google token is available', async () => {
    const requestYouTubeAccess = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      accessToken: 'app-token',
      googleProviderAccessToken: null,
      requestYouTubeAccess,
      status: 'authenticated',
    });
    const { result } = renderHook(() => useYouTubeLike('video-1'), { wrapper: createWrapper() });

    act(() => result.current.toggleLike());
    await waitFor(() => expect(requestYouTubeAccess).toHaveBeenCalledWith(window.location.origin));

    expect(JSON.parse(window.sessionStorage.getItem('youtube-atlas-pending-youtube-rating') ?? '{}')).toEqual(
      expect.objectContaining({ rating: 'like', videoId: 'video-1' }),
    );
    expect(result.current.phase).toBe('authorizing');
  });

  it('requests the expanded scope when an identity-only token lacks YouTube permission', async () => {
    const requestYouTubeAccess = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      accessToken: 'app-token',
      googleProviderAccessToken: 'identity-only-token',
      requestYouTubeAccess,
      status: 'authenticated',
    });
    fetchYouTubeVideoRatingMock.mockRejectedValue(
      new ApiRequestError('YouTube 좋아요 권한이 필요합니다.', {
        code: 'youtube_permission_required',
        status: 403,
      }),
    );
    updateYouTubeVideoRatingMock.mockRejectedValue(
      new ApiRequestError('YouTube 좋아요 권한이 필요합니다.', {
        code: 'youtube_permission_required',
        status: 403,
      }),
    );
    const { result } = renderHook(() => useYouTubeLike('video-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(fetchYouTubeVideoRatingMock).toHaveBeenCalled());
    act(() => result.current.toggleLike());
    await waitFor(() => expect(requestYouTubeAccess).toHaveBeenCalledWith(window.location.origin));

    expect(JSON.parse(window.sessionStorage.getItem('youtube-atlas-pending-youtube-rating') ?? '{}')).toEqual(
      expect.objectContaining({ rating: 'like', videoId: 'video-1' }),
    );
  });

  it('resumes a pending like after OAuth returns with a provider token', async () => {
    writePendingYouTubeRating({
      rating: 'like',
      requestedAt: Date.now(),
      videoId: 'video-2',
    });
    useAuthMock.mockReturnValue({
      accessToken: 'app-token',
      googleProviderAccessToken: 'youtube-token',
      requestYouTubeAccess: vi.fn(),
      status: 'authenticated',
    });
    fetchYouTubeVideoRatingMock.mockResolvedValue({ rating: 'none', videoId: 'video-1' });
    updateYouTubeVideoRatingMock.mockResolvedValue({ rating: 'like', videoId: 'video-2' });
    const { result } = renderHook(() => useYouTubeLike('video-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.phase).toBe('success'));

    expect(updateYouTubeVideoRatingMock).toHaveBeenCalledWith(
      'app-token',
      'youtube-token',
      'video-2',
      'like',
    );
    expect(window.sessionStorage).toHaveLength(0);
  });
});
