interface ApiErrorResponse {
  code?: string;
  message?: string;
  retryAfterSeconds?: number | null;
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const apiBaseUrl =
  configuredApiBaseUrl || (supabaseUrl ? `${supabaseUrl}/functions/v1` : '');
const usesSupabaseFunctions = apiBaseUrl.includes('.supabase.co/functions/v1');

export const isApiConfigured = Boolean(apiBaseUrl);

export class ApiRequestError extends Error {
  code?: string;
  retryAfterSeconds?: number;
  status: number;

  constructor(
    message: string,
    options: {
      code?: string;
      retryAfterSeconds?: number;
      status: number;
    },
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = options.code;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.status = options.status;
  }
}

function getApiBaseUrl() {
  if (!apiBaseUrl) {
    throw new Error('VITE_API_BASE_URL is not configured.');
  }

  return apiBaseUrl;
}

function toApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${getApiBaseUrl()}${normalizedPath}`;
}

async function parseResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toApiRequestError(response: Response, body: unknown) {
  if (body && typeof body === 'object') {
    const apiError = body as ApiErrorResponse;

    return new ApiRequestError(apiError.message ?? '요청 처리에 실패했습니다.', {
      code: apiError.code,
      retryAfterSeconds: apiError.retryAfterSeconds ?? undefined,
      status: response.status,
    });
  }

  return new ApiRequestError(
    typeof body === 'string' && body ? body : '요청 처리에 실패했습니다.',
    {
      status: response.status,
    },
  );
}

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const requestInit =
    usesSupabaseFunctions && supabaseAnonKey
      ? {
          ...init,
          headers: (() => {
            const headers = new Headers(init?.headers);

            headers.set('apikey', supabaseAnonKey);
            if (!headers.has('Authorization')) {
              headers.set('Authorization', `Bearer ${supabaseAnonKey}`);
            }

            return headers;
          })(),
        }
      : init;
  const response = await fetch(toApiUrl(path), requestInit);
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw toApiRequestError(response, body);
  }

  return body as T;
}

export function getWebSocketUrl() {
  const url = new URL(getApiBaseUrl());

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/ws`;
  url.search = '';
  url.hash = '';

  return url.toString();
}
