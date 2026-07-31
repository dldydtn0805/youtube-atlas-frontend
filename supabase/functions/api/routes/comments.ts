import {
  getOptionalAuth,
  requireAuth,
  type RequestContext,
} from '../../_shared/context.ts';
import { ApiError, json, readJson } from '../../_shared/http.ts';
import { fetchCommentHighlights } from '../../_shared/youtube.ts';

interface CreateCommentBody {
  author?: string;
  clientId?: string;
  content?: string;
  regionCode?: string | null;
}

function toComment(row: Record<string, unknown>) {
  return {
    author: row.author,
    client_id: row.client_id,
    content: row.content,
    created_at: row.created_at,
    id: row.id,
    message_type: row.message_type ?? 'USER',
    system_event_type: row.system_event_type ?? null,
    user_id: row.user_id ?? null,
    video_id: row.video_id,
  };
}

async function listComments(context: RequestContext) {
  const regionCode = context.url.searchParams.get('regionCode')?.trim().toUpperCase();
  const since = context.url.searchParams.get('since')?.trim();
  let query = context.service
    .from('comments')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(250);

  if (regionCode) {
    query = query.eq('region_code', regionCode);
  }

  if (since) {
    query = query.gt('created_at', since);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return json((data ?? []).map((row) => toComment(row as Record<string, unknown>)));
}

async function createComment(context: RequestContext, videoId = 'global') {
  const { profile } = await requireAuth(context);
  const body = await readJson<CreateCommentBody>(context.request);
  const content = body.content?.trim().replace(/\s+/g, ' ');
  const clientId = body.clientId?.trim();

  if (!content || !clientId) {
    throw new ApiError(400, 'validation_error', '댓글 내용과 참여자 ID가 필요합니다.');
  }

  const { data, error } = await context.service
    .from('comments')
    .insert({
      author: profile.display_name,
      client_id: clientId,
      content,
      region_code: body.regionCode?.trim().toUpperCase() || null,
      user_id: profile.id,
      video_id: videoId,
    })
    .select('*')
    .single();

  if (error) {
    const detail = String(error.details ?? '');
    const retryMatch = detail.match(/retry_after_seconds=(\d+)/);

    if (error.message.includes('comment_spam_cooldown')) {
      throw new ApiError(429, 'comment_spam_cooldown', '잠시 후 다시 작성해 주세요.', {
        retryAfterSeconds: retryMatch ? Number(retryMatch[1]) : 5,
      });
    }

    if (error.message.includes('comment_spam_duplicate')) {
      throw new ApiError(409, 'comment_spam_duplicate', '같은 내용을 연속으로 작성할 수 없습니다.');
    }

    throw error;
  }

  return json(toComment(data as Record<string, unknown>), 201);
}

export async function handleCommentsRoute(
  context: RequestContext,
  method: string,
  path: string,
) {
  if (path === '/api/comments' && method === 'GET') {
    return listComments(context);
  }

  if (path === '/api/comments' && method === 'POST') {
    return createComment(context);
  }

  if (path === '/api/comments/presence' && method === 'GET') {
    return json({
      active_count: 0,
      participants: [],
    });
  }

  if (path === '/api/comments/presence/me' && method === 'POST') {
    await requireAuth(context);
    return json({
      active_count: 1,
      participants: [],
    });
  }

  const videoCommentsMatch = path.match(/^\/api\/videos\/([^/]+)\/comments$/);
  if (videoCommentsMatch && method === 'GET') {
    const videoId = decodeURIComponent(videoCommentsMatch[1]);
    const regionCode = context.url.searchParams.get('regionCode')?.trim().toUpperCase();
    const since = context.url.searchParams.get('since')?.trim();
    let query = context.service
      .from('comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true })
      .limit(250);

    if (regionCode) query = query.eq('region_code', regionCode);
    if (since) query = query.gt('created_at', since);

    const { data, error } = await query;
    if (error) throw error;
    return json((data ?? []).map((row) => toComment(row as Record<string, unknown>)));
  }

  if (videoCommentsMatch && method === 'POST') {
    return createComment(context, decodeURIComponent(videoCommentsMatch[1]));
  }

  const highlightMatch = path.match(/^\/api\/videos\/([^/]+)\/comment-highlights$/);
  if (highlightMatch && method === 'GET') {
    await getOptionalAuth(context);
    return json(await fetchCommentHighlights(decodeURIComponent(highlightMatch[1])));
  }

  return null;
}
