export const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-google-access-token',
  'Access-Control-Allow-Methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
  'Access-Control-Allow-Origin': '*',
} as const;

export class ApiError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly retryAfterSeconds?: number;
  readonly status: number;

  constructor(
    status: number,
    code: string,
    message: string,
    options: {
      details?: unknown;
      retryAfterSeconds?: number;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = options.details;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.status = status;
  }
}

export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(data === undefined ? null : JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
    status,
  });
}

export function noContent() {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return json(
      {
        code: error.code,
        details: error.details ?? null,
        message: error.message,
        retryAfterSeconds: error.retryAfterSeconds ?? null,
      },
      error.status,
    );
  }

  const message = error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.';

  console.error('api:unhandled-error', error);
  return json(
    {
      code: 'internal_error',
      message,
      retryAfterSeconds: null,
    },
    500,
  );
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, 'invalid_json', '요청 본문이 올바른 JSON이 아닙니다.');
  }
}

export function normalizeApiPath(url: URL) {
  const functionMarker = '/functions/v1/api';
  const markerIndex = url.pathname.indexOf(functionMarker);
  const rawPath =
    markerIndex >= 0
      ? url.pathname.slice(markerIndex + functionMarker.length)
      : url.pathname;
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  return normalizedPath === '/' ? '/' : normalizedPath.replace(/\/+$/, '');
}

export function requiredSearchParam(url: URL, name: string) {
  const value = url.searchParams.get(name)?.trim();

  if (!value) {
    throw new ApiError(400, 'validation_error', `${name} 값은 필수입니다.`);
  }

  return value;
}

export function parsePositiveInteger(value: string | null, fallback?: number) {
  if (value === null || value.trim() === '') {
    if (fallback !== undefined) {
      return fallback;
    }

    throw new ApiError(400, 'validation_error', '양의 정수가 필요합니다.');
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ApiError(400, 'validation_error', '양의 정수가 필요합니다.');
  }

  return parsed;
}
