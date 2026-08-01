import { ApiError } from "./http.ts";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const LIKED_VIDEO_PAGE_SIZE = 50;

interface YouTubeApiErrorBody {
  error?: {
    errors?: Array<{ reason?: string }>;
    message?: string;
  };
}

interface YouTubeThumbnail {
  height?: number;
  url?: string;
  width?: number;
}

interface YouTubeLikedVideo {
  contentDetails?: {
    duration?: string;
  };
  id?: string;
  snippet?: {
    categoryId?: string;
    channelId?: string;
    channelTitle?: string;
    thumbnails?: Record<string, YouTubeThumbnail | undefined>;
    title?: string;
  };
  statistics?: {
    viewCount?: string;
  };
}

interface YouTubeLikedVideosResponse {
  error?: YouTubeApiErrorBody["error"];
  items?: YouTubeLikedVideo[];
  nextPageToken?: string;
}

function getYouTubeError(body: unknown) {
  const errorBody = body as YouTubeApiErrorBody | null;

  return {
    message:
      errorBody?.error?.message?.trim() ||
      "YouTube 요청을 처리하지 못했습니다.",
    reason: errorBody?.error?.errors?.[0]?.reason?.trim() || null,
  };
}

function toLikedVideosError(status: number, body: unknown) {
  const youtubeError = getYouTubeError(body);

  if (status === 401 || youtubeError.reason === "authError") {
    return new ApiError(
      401,
      "youtube_authorization_expired",
      "YouTube 연결이 만료되었습니다. 다시 연결해 주세요.",
    );
  }

  if (youtubeError.reason === "insufficientPermissions") {
    return new ApiError(
      403,
      "youtube_permission_required",
      "YouTube 좋아요 목록 권한이 필요합니다.",
    );
  }

  if (
    youtubeError.reason === "quotaExceeded" ||
    youtubeError.reason === "dailyLimitExceeded"
  ) {
    return new ApiError(
      429,
      "youtube_quota_exceeded",
      "오늘 사용할 수 있는 YouTube 요청 한도를 초과했습니다.",
    );
  }

  if (status === 400) {
    return new ApiError(
      400,
      "youtube_liked_videos_invalid",
      youtubeError.message,
    );
  }

  return new ApiError(502, "youtube_liked_videos_failed", youtubeError.message);
}

async function readResponseBody(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeThumbnail(
  thumbnail: YouTubeThumbnail | undefined,
  fallbackUrl: string,
) {
  return {
    height: thumbnail?.height ?? 0,
    url: thumbnail?.url?.trim() || fallbackUrl,
    width: thumbnail?.width ?? 0,
  };
}

function toLikedVideo(video: YouTubeLikedVideo) {
  const thumbnails = video.snippet?.thumbnails ?? {};
  const fallbackUrl =
    thumbnails.maxres?.url?.trim() ||
    thumbnails.standard?.url?.trim() ||
    thumbnails.high?.url?.trim() ||
    thumbnails.medium?.url?.trim() ||
    thumbnails.default?.url?.trim() ||
    "";

  return {
    contentDetails: {
      duration: video.contentDetails?.duration ?? "",
    },
    id: video.id ?? "",
    snippet: {
      categoryId: video.snippet?.categoryId ?? "",
      channelId: video.snippet?.channelId ?? "",
      channelTitle: video.snippet?.channelTitle ?? "",
      thumbnails: {
        default: normalizeThumbnail(thumbnails.default, fallbackUrl),
        high: normalizeThumbnail(thumbnails.high, fallbackUrl),
        maxres: thumbnails.maxres
          ? normalizeThumbnail(thumbnails.maxres, fallbackUrl)
          : undefined,
        medium: normalizeThumbnail(thumbnails.medium, fallbackUrl),
        standard: thumbnails.standard
          ? normalizeThumbnail(thumbnails.standard, fallbackUrl)
          : undefined,
      },
      title: video.snippet?.title ?? "",
    },
    statistics: video.statistics?.viewCount
      ? { viewCount: video.statistics.viewCount }
      : undefined,
  };
}

export async function fetchYouTubeLikedVideos(
  googleAccessToken: string,
  pageToken?: string | null,
  fetcher: typeof fetch = fetch,
) {
  const params = new URLSearchParams({
    maxResults: String(LIKED_VIDEO_PAGE_SIZE),
    myRating: "like",
    part: "snippet,contentDetails,statistics",
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const response = await fetcher(`${YOUTUBE_API_BASE_URL}/videos?${params}`, {
    headers: {
      Authorization: `Bearer ${googleAccessToken}`,
    },
  });
  const body = (await readResponseBody(
    response,
  )) as YouTubeLikedVideosResponse | null;

  if (!response.ok) {
    throw toLikedVideosError(response.status, body);
  }

  return {
    availableCategories: [],
    categoryId: "youtube-liked-videos",
    description: "내 YouTube 계정에서 좋아요 표시한 동영상을 모았습니다.",
    items: (body?.items ?? [])
      .filter((video) => Boolean(video.id?.trim()))
      .map(toLikedVideo),
    label: "좋아요한 영상",
    nextPageToken: body?.nextPageToken ?? null,
  };
}
