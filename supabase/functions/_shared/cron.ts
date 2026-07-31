import { ApiError } from './http.ts';

export function requireCronSecret(request: Request) {
  const expectedSecret = Deno.env.get('CRON_SECRET')?.trim();
  const authorization = request.headers.get('Authorization')?.trim();
  const suppliedSecret =
    request.headers.get('x-cron-secret')?.trim() ??
    (authorization?.toLowerCase().startsWith('bearer ')
      ? authorization.slice(7).trim()
      : null);

  if (!expectedSecret) {
    throw new ApiError(500, 'missing_secret', 'CRON_SECRET 시크릿이 설정되지 않았습니다.');
  }

  if (!suppliedSecret || suppliedSecret !== expectedSecret) {
    throw new ApiError(401, 'unauthorized', '스케줄러 인증에 실패했습니다.');
  }
}
