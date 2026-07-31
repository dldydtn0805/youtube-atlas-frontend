import { ApiError } from './http.ts';

const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const SHORTS_MAX_DURATION_SECONDS = 180;
const SHORTS_TITLE_PATTERN = /#shorts\b|\bshorts?\b|쇼츠/i;
const EXCLUDED_CATEGORY_IDS = new Set(['27', '42']);
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  '2': '자동차 리뷰, 시승기, 모빌리티 중심의 인기 영상을 모아봅니다.',
  '10': '뮤직비디오, 라이브, 음원 관련 인기 영상을 확인할 수 있습니다.',
  '17': '경기 하이라이트와 스포츠 이슈 중심의 인기 영상을 확인할 수 있습니다.',
  '20': '게임 방송, 리뷰, 신작 반응 등 게임 인기 영상을 확인할 수 있습니다.',
  '25': '뉴스, 시사, 공공 이슈 중심의 인기 영상을 확인할 수 있습니다.',
  '28': '과학 이슈, 기술 리뷰, IT 트렌드 중심의 인기 영상을 모아봅니다.',
  '29': '공익 활동과 사회적 메시지를 담은 인기 영상을 모아봅니다.',
};

export interface YouTubeThumbnail {
  height?: number;
  url: string;
  width?: number;
}

export interface YouTubeVideo {
  contentDetails?: {
    duration?: string;
  };
  id: string;
  snippet?: {
    categoryId?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: Record<string, YouTubeThumbnail | undefined>;
    title?: string;
  };
  statistics?: {
    viewCount?: string;
  };
}

interface YouTubeListResponse<T> {
  error?: {
    message?: string;
  };
  items?: T[];
  nextPageToken?: string;
}

function getYoutubeApiKey() {
  const apiKey = Deno.env.get('YOUTUBE_API_KEY')?.trim();

  if (!apiKey) {
    throw new ApiError(503, 'youtube_not_configured', 'YouTube API 키가 설정되지 않았습니다.');
  }

  return apiKey;
}

async function fetchYouTube<T>(path: string, params: URLSearchParams) {
  params.set('key', getYoutubeApiKey());
  const response = await fetch(`${API_BASE_URL}/${path}?${params.toString()}`);
  const result = (await response.json()) as YouTubeListResponse<T>;

  if (!response.ok || result.error?.message) {
    throw new ApiError(
      response.status >= 400 && response.status < 500 ? response.status : 502,
      'youtube_api_error',
      result.error?.message ?? 'YouTube API 요청에 실패했습니다.',
    );
  }

  return result;
}

export function parseDurationSeconds(duration: string | undefined) {
  const match = duration?.match(
    /^P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );

  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

export function isShortVideo(video: YouTubeVideo) {
  return (
    parseDurationSeconds(video.contentDetails?.duration) <= SHORTS_MAX_DURATION_SECONDS ||
    SHORTS_TITLE_PATTERN.test(video.snippet?.title ?? '')
  );
}

function normalizeThumbnail(thumbnail: YouTubeThumbnail | undefined, fallbackUrl = '') {
  return {
    height: thumbnail?.height ?? 0,
    url: thumbnail?.url ?? fallbackUrl,
    width: thumbnail?.width ?? 0,
  };
}

export function bestThumbnailUrl(video: YouTubeVideo) {
  const thumbnails = video.snippet?.thumbnails ?? {};

  return (
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    ''
  );
}

export function toVideoResponse(
  video: YouTubeVideo,
  categoryLabel?: string | null,
  trend?: Record<string, unknown> | null,
) {
  const thumbnails = video.snippet?.thumbnails ?? {};
  const fallbackUrl = bestThumbnailUrl(video);

  return {
    contentDetails: {
      duration: video.contentDetails?.duration ?? 'PT0S',
    },
    id: video.id,
    snippet: {
      categoryId: video.snippet?.categoryId ?? '0',
      categoryLabel: categoryLabel ?? null,
      channelId: video.snippet?.channelId ?? '',
      channelTitle: video.snippet?.channelTitle ?? '',
      publishedAt: video.snippet?.publishedAt ?? null,
      thumbnails: {
        default: normalizeThumbnail(thumbnails.default, fallbackUrl),
        high: normalizeThumbnail(thumbnails.high, fallbackUrl),
        maxres: thumbnails.maxres ? normalizeThumbnail(thumbnails.maxres) : undefined,
        medium: normalizeThumbnail(thumbnails.medium, fallbackUrl),
        standard: thumbnails.standard ? normalizeThumbnail(thumbnails.standard) : undefined,
      },
      title: video.snippet?.title ?? '',
    },
    statistics: {
      viewCount: video.statistics?.viewCount ?? null,
    },
    trend: trend ?? null,
  };
}

export async function fetchCategories(regionCode: string) {
  const result = await fetchYouTube<{
    id: string;
    snippet?: {
      assignable?: boolean;
      title?: string;
    };
  }>(
    'videoCategories',
    new URLSearchParams({
      hl: 'ko',
      part: 'snippet',
      regionCode: regionCode.toUpperCase(),
    }),
  );

  const remoteCategories = (result.items ?? [])
    .filter(
      (item) =>
        item.snippet?.assignable &&
        item.snippet.title &&
        !EXCLUDED_CATEGORY_IDS.has(item.id),
    )
    .map((item) => ({
      description:
        CATEGORY_DESCRIPTIONS[item.id] ??
        `${item.snippet?.title ?? ''} 카테고리 인기 영상을 확인할 수 있습니다.`,
      id: item.id,
      label: item.snippet?.title ?? '',
      sourceCategoryIds: [item.id],
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'ko'));

  return [
    {
      description: '카테고리 구분 없이 현재 국가 전체 인기 영상을 보여줍니다.',
      id: '0',
      label: '전체',
      sourceCategoryIds: [],
    },
    ...remoteCategories,
  ];
}

export async function fetchPopularVideos(options: {
  categoryId?: string | null;
  pageToken?: string | null;
  regionCode: string;
}) {
  const params = new URLSearchParams({
    chart: 'mostPopular',
    maxResults: '50',
    part: 'snippet,contentDetails,statistics',
    regionCode: options.regionCode.toUpperCase(),
  });

  if (options.categoryId && options.categoryId !== '0') {
    params.set('videoCategoryId', options.categoryId);
  }

  if (options.pageToken) {
    params.set('pageToken', options.pageToken);
  }

  const result = await fetchYouTube<YouTubeVideo>('videos', params);

  return {
    items: (result.items ?? []).filter((video) => !isShortVideo(video)),
    nextPageToken: result.nextPageToken ?? null,
  };
}

export async function fetchVideosByIds(videoIds: string[]) {
  if (videoIds.length === 0) {
    return [];
  }

  const result = await fetchYouTube<YouTubeVideo>(
    'videos',
    new URLSearchParams({
      id: videoIds.join(','),
      maxResults: String(Math.min(50, videoIds.length)),
      part: 'snippet,contentDetails,statistics',
    }),
  );

  return result.items ?? [];
}

export async function fetchCommentHighlights(videoId: string) {
  const result = await fetchYouTube<{
    id: string;
    snippet?: {
      topLevelComment?: {
        id?: string;
        snippet?: {
          authorDisplayName?: string;
          authorProfileImageUrl?: string;
          likeCount?: number;
          publishedAt?: string;
          textDisplay?: string;
          textOriginal?: string;
        };
      };
    };
  }>(
    'commentThreads',
    new URLSearchParams({
      maxResults: '20',
      order: 'relevance',
      part: 'snippet',
      textFormat: 'plainText',
      videoId,
    }),
  );

  return (result.items ?? [])
    .map((item) => {
      const comment = item.snippet?.topLevelComment;
      const snippet = comment?.snippet;
      const commentId = comment?.id ?? item.id;

      return {
        author: snippet?.authorDisplayName ?? 'YouTube 사용자',
        author_profile_image_url: snippet?.authorProfileImageUrl ?? null,
        client_id: `youtube:${commentId}`,
        content: snippet?.textOriginal ?? snippet?.textDisplay ?? '',
        created_at: snippet?.publishedAt ?? new Date().toISOString(),
        ephemeral: true,
        id: commentId,
        label: '인기 댓글',
        like_count: snippet?.likeCount ?? 0,
        message_type: 'COMMENT_HIGHLIGHT',
        source: 'YOUTUBE_COMMENT',
        video_id: videoId,
      };
    })
    .filter((item) => item.content)
    .sort((left, right) => right.like_count - left.like_count)
    .slice(0, 10);
}
