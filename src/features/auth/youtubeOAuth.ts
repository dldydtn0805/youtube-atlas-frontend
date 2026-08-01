export const YOUTUBE_WRITE_SCOPE = 'https://www.googleapis.com/auth/youtube';

export function createYouTubeOAuthRequest(redirectTo: string) {
  return {
    options: {
      queryParams: {
        access_type: 'online',
        include_granted_scopes: 'true',
        prompt: 'consent',
      },
      redirectTo,
      scopes: `openid email profile ${YOUTUBE_WRITE_SCOPE}`,
    },
    provider: 'google' as const,
  };
}
