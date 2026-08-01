import {
  getOptionalAuth,
  requireAuth,
  type RequestContext,
} from "../../_shared/context.ts";
import { json, noContent } from "../../_shared/http.ts";

async function getSelectedTitle(context: RequestContext, userId: number) {
  const { data: setting } = await context.service
    .from("user_achievement_title_settings")
    .select("selected_title_code")
    .eq("user_id", userId)
    .maybeSingle();

  if (!setting?.selected_title_code) {
    return null;
  }

  const { data: title } = await context.service
    .from("achievement_titles")
    .select("code, display_name, short_name, grade, description")
    .eq("code", setting.selected_title_code)
    .maybeSingle();

  return title
    ? {
        code: title.code,
        description: title.description,
        displayName: title.display_name,
        grade: title.grade,
        shortName: title.short_name,
      }
    : null;
}

function toPlaybackProgress(row: Record<string, unknown> | null) {
  if (!row) {
    return null;
  }

  return {
    channelTitle: row.channel_title ?? null,
    positionSeconds: row.position_seconds ?? 0,
    thumbnailUrl: row.thumbnail_url ?? null,
    updatedAt: row.updated_at,
    videoId: row.video_id,
    videoTitle: row.video_title ?? null,
  };
}

async function buildCurrentUser(context: RequestContext) {
  const { profile } = await requireAuth(context);
  const [commentCountResult, tradeCountResult, playbackResult, selectedTitle] =
    await Promise.all([
      context.service
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id),
      context.service
        .from("game_positions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id),
      context.service
        .from("playback_progress")
        .select("*")
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(10),
      getSelectedTitle(context, profile.id),
    ]);

  const recentPlaybackProgresses = (playbackResult.data ?? []).map((row) =>
    toPlaybackProgress(row as Record<string, unknown>),
  );

  return {
    commentCount: commentCountResult.count ?? 0,
    createdAt: profile.created_at,
    displayName: profile.display_name,
    email: profile.email,
    id: profile.id,
    lastLoginAt: profile.last_login_at,
    lastPlaybackProgress: recentPlaybackProgresses[0] ?? null,
    pictureUrl: profile.picture_url,
    recentPlaybackProgresses,
    selectedTitle,
    tradeCount: tradeCountResult.count ?? 0,
  };
}

export async function handleAuthRoute(
  context: RequestContext,
  method: string,
  path: string,
) {
  if (method === "GET" && path === "/api/auth/google/config") {
    return json({
      clientId: "",
      enabled: true,
    });
  }

  if (method === "GET" && path === "/api/auth/me") {
    return json(await buildCurrentUser(context));
  }

  if (method === "DELETE" && path === "/api/auth/session") {
    await requireAuth(context);
    return noContent();
  }

  if (method === "GET" && path === "/api/auth/session") {
    const auth = await getOptionalAuth(context);

    return json({
      authenticated: Boolean(auth),
    });
  }

  return null;
}
