import { requireAuth, type RequestContext } from "../../_shared/context.ts";
import type { TrendSignalRow } from "../../_shared/game.ts";
import { ApiError, json, noContent, readJson } from "../../_shared/http.ts";
import { exportPrivateYouTubePlaylist } from "../../_shared/youtube-playlists.ts";
import {
  getYouTubeVideoRating,
  setYouTubeVideoRating,
  type YouTubeVideoRating,
} from "../../_shared/youtube-ratings.ts";
import { fetchYouTubeLikedVideos } from "../../_shared/youtube-liked-videos.ts";
import {
  findUnavailableMusicVideoIds,
  normalizeMusicPlaylistExportInput,
} from "./music-playlist-export.ts";

const ALL_CATEGORY_IDS = ["0", "all"];
const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

function requireGoogleAccessToken(context: RequestContext) {
  const googleAccessToken = context.request.headers
    .get("X-Google-Access-Token")
    ?.trim();

  if (!googleAccessToken) {
    throw new ApiError(
      401,
      "youtube_authorization_required",
      "YouTube 연결이 필요합니다.",
    );
  }

  return googleAccessToken;
}

function parseYouTubeVideoId(rawVideoId: string) {
  let videoId = "";

  try {
    videoId = decodeURIComponent(rawVideoId).trim();
  } catch {
    throw new ApiError(
      400,
      "validation_error",
      "올바른 YouTube 영상 ID가 필요합니다.",
    );
  }

  if (!YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) {
    throw new ApiError(
      400,
      "validation_error",
      "올바른 YouTube 영상 ID가 필요합니다.",
    );
  }

  return videoId;
}

async function findTopTrendSignals(
  context: RequestContext,
  regionCode: string,
) {
  for (const categoryId of ALL_CATEGORY_IDS) {
    const { data, error } = await context.service
      .from("video_trend_signals")
      .select("*")
      .eq("region_code", regionCode)
      .eq("category_id", categoryId)
      .order("current_rank", { ascending: true })
      .limit(250);

    if (error) throw error;

    if (data && data.length > 0) {
      return data as TrendSignalRow[];
    }
  }

  return [];
}

function toPlayback(row: Record<string, unknown>) {
  return {
    channelTitle: row.channel_title ?? null,
    positionSeconds: row.position_seconds,
    thumbnailUrl: row.thumbnail_url ?? null,
    updatedAt: row.updated_at,
    videoId: row.video_id,
    videoTitle: row.video_title ?? null,
  };
}

export async function handlePersonalRoute(
  context: RequestContext,
  method: string,
  path: string,
) {
  if (path === "/api/me/youtube-liked-videos" && method === "GET") {
    await requireAuth(context);
    const googleAccessToken = requireGoogleAccessToken(context);
    const pageToken = context.url.searchParams.get("pageToken")?.trim() || null;

    return json(await fetchYouTubeLikedVideos(googleAccessToken, pageToken));
  }

  if (path === "/api/me/youtube-playlists/music-top" && method === "POST") {
    await requireAuth(context);
    const googleAccessToken = requireGoogleAccessToken(context);

    const input = normalizeMusicPlaylistExportInput(
      await readJson(context.request),
    );
    const topSignals = await findTopTrendSignals(context, input.regionCode);
    const unavailableVideoIds = findUnavailableMusicVideoIds(
      topSignals,
      input.videoIds,
    );

    if (unavailableVideoIds.length > 0) {
      throw new ApiError(
        400,
        "music_playlist_items_changed",
        "음악 차트가 갱신되었습니다. 최신 목록에서 다시 시도해 주세요.",
        { details: { unavailableVideoIds } },
      );
    }

    return json(
      await exportPrivateYouTubePlaylist({
        googleAccessToken,
        title: input.title,
        videoIds: input.videoIds,
      }),
      201,
    );
  }

  const youtubeRatingMatch = path.match(
    /^\/api\/me\/youtube-ratings\/([^/]+)$/,
  );
  if (youtubeRatingMatch && (method === "GET" || method === "PUT")) {
    await requireAuth(context);
    const googleAccessToken = requireGoogleAccessToken(context);
    const videoId = parseYouTubeVideoId(youtubeRatingMatch[1]);

    if (method === "GET") {
      return json({
        rating: await getYouTubeVideoRating(googleAccessToken, videoId),
        videoId,
      });
    }

    const body = await readJson<{ rating?: YouTubeVideoRating }>(
      context.request,
    );
    if (body.rating !== "like" && body.rating !== "none") {
      throw new ApiError(
        400,
        "validation_error",
        "rating은 like 또는 none이어야 합니다.",
      );
    }

    await setYouTubeVideoRating(googleAccessToken, videoId, body.rating);
    return json({ rating: body.rating, videoId });
  }

  if (path === "/api/me/playback-progress" && method === "GET") {
    const { profile } = await requireAuth(context);
    const { data, error } = await context.service
      .from("playback_progress")
      .select("*")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data
      ? json(toPlayback(data as Record<string, unknown>))
      : noContent();
  }

  if (path === "/api/me/playback-progress" && method === "POST") {
    const { profile } = await requireAuth(context);
    const body = await readJson<{
      channelTitle?: string | null;
      positionSeconds?: number;
      thumbnailUrl?: string | null;
      videoId?: string;
      videoTitle?: string | null;
    }>(context.request);
    const videoId = body.videoId?.trim();

    if (!videoId) {
      throw new ApiError(400, "validation_error", "videoId 값은 필수입니다.");
    }

    const { data, error } = await context.service
      .from("playback_progress")
      .upsert(
        {
          channel_title: body.channelTitle?.trim() || null,
          position_seconds: Math.max(0, Math.floor(body.positionSeconds ?? 0)),
          thumbnail_url: body.thumbnailUrl?.trim() || null,
          updated_at: new Date().toISOString(),
          user_id: profile.id,
          video_id: videoId,
          video_title: body.videoTitle?.trim() || null,
        },
        {
          onConflict: "user_id,video_id",
        },
      )
      .select("*")
      .single();

    if (error) throw error;
    return json(toPlayback(data as Record<string, unknown>));
  }

  return null;
}
