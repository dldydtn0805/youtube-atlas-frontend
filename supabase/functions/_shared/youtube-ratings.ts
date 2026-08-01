import { ApiError } from './http.ts';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface YouTubeApiErrorBody {
  error?: {
    errors?: Array<{ reason?: string }>;
    message?: string;
  };
}

interface YouTubeRatingResponse {
  items?: Array<{ rating?: string }>;
}

export type YouTubeVideoRating = 'like' | 'none';

function getYouTubeError(body: unknown) {
  const errorBody = body as YouTubeApiErrorBody | null;

  return {
    message: errorBody?.error?.message?.trim() || 'YouTube 요청을 처리하지 못했습니다.',
    reason: errorBody?.error?.errors?.[0]?.reason?.trim() || null,
  };
}

async function readResponseBody(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toYouTubeRatingError(status: number, body: unknown) {
  const youtubeError = getYouTubeError(body);

  if (status === 401 || youtubeError.reason === 'authError') {
    return new ApiError(401, 'youtube_authorization_expired', 'YouTube 연결이 만료되었습니다. 다시 연결해 주세요.');
  }

  if (youtubeError.reason === 'insufficientPermissions') {
    return new ApiError(403, 'youtube_permission_required', 'YouTube 좋아요 권한이 필요합니다.');
  }

  if (youtubeError.reason === 'emailNotVerified') {
    return new ApiError(400, 'youtube_email_not_verified', 'YouTube 계정 이메일 인증 후 다시 시도해 주세요.');
  }

  if (youtubeError.reason === 'videoPurchaseRequired') {
    return new ApiError(403, 'youtube_video_purchase_required', '이 영상은 대여한 계정에서만 평가할 수 있습니다.');
  }

  if (youtubeError.reason === 'forbidden' || youtubeError.reason === 'videoRatingDisabled') {
    return new ApiError(403, 'youtube_rating_not_allowed', '이 영상에는 YouTube 좋아요를 표시할 수 없습니다.');
  }

  if (youtubeError.reason === 'quotaExceeded' || youtubeError.reason === 'dailyLimitExceeded') {
    return new ApiError(429, 'youtube_quota_exceeded', '오늘 사용할 수 있는 YouTube 요청 한도를 초과했습니다.');
  }

  if (status === 404 || youtubeError.reason === 'videoNotFound') {
    return new ApiError(404, 'youtube_video_not_found', 'YouTube에서 영상을 찾지 못했습니다.');
  }

  if (status === 400) {
    return new ApiError(400, 'youtube_rating_invalid', youtubeError.message);
  }

  return new ApiError(502, 'youtube_rating_failed', youtubeError.message);
}

export async function getYouTubeVideoRating(
  googleAccessToken: string,
  videoId: string,
  fetcher: typeof fetch = fetch,
): Promise<YouTubeVideoRating> {
  const params = new URLSearchParams({ id: videoId });
  const response = await fetcher(`${YOUTUBE_API_BASE_URL}/videos/getRating?${params}`, {
    headers: {
      Authorization: `Bearer ${googleAccessToken}`,
    },
  });
  const body = await readResponseBody(response) as YouTubeRatingResponse | null;

  if (!response.ok) {
    throw toYouTubeRatingError(response.status, body);
  }

  return body?.items?.[0]?.rating === 'like' ? 'like' : 'none';
}

export async function setYouTubeVideoRating(
  googleAccessToken: string,
  videoId: string,
  rating: YouTubeVideoRating,
  fetcher: typeof fetch = fetch,
) {
  const params = new URLSearchParams({ id: videoId, rating });
  const response = await fetcher(`${YOUTUBE_API_BASE_URL}/videos/rate?${params}`, {
    headers: {
      Authorization: `Bearer ${googleAccessToken}`,
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw toYouTubeRatingError(response.status, await readResponseBody(response));
  }
}
