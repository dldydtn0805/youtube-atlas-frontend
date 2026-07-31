import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createRequestContext } from '../_shared/context.ts';
import {
  ApiError,
  corsHeaders,
  errorResponse,
  json,
  normalizeApiPath,
} from '../_shared/http.ts';
import { handleAdminRoute } from './routes/admin.ts';
import { handleAuthRoute } from './routes/auth.ts';
import { handleCommentsRoute } from './routes/comments.ts';
import { handleGameRoute } from './routes/game.ts';
import { handlePersonalRoute } from './routes/personal.ts';
import { handlePublicRoute } from './routes/public.ts';

const handlers = [
  handleAuthRoute,
  handleCommentsRoute,
  handlePersonalRoute,
  handlePublicRoute,
  handleGameRoute,
  handleAdminRoute,
];

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  try {
    const context = createRequestContext(request);
    const path = normalizeApiPath(context.url);
    const method = request.method.toUpperCase();

    if (
      path === '/' ||
      path === '/health' ||
      path === '/api' ||
      path === '/api/health'
    ) {
      return json({
        service: 'youtube-atlas-supabase-api',
        status: 'ok',
      });
    }

    for (const handler of handlers) {
      const response = await handler(context, method, path);

      if (response) {
        return response;
      }
    }

    throw new ApiError(404, 'not_found', 'API 경로를 찾을 수 없습니다.');
  } catch (error) {
    return errorResponse(error);
  }
});
