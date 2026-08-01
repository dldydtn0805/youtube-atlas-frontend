export const YOUTUBE_WRITE_SCOPE = 'https://www.googleapis.com/auth/youtube';

function createGoogleOAuthRequest(redirectTo: string, youtubeScope: string) {
  return {
    options: {
      queryParams: {
        access_type: 'online',
        include_granted_scopes: 'true',
        prompt: 'consent',
      },
      redirectTo,
      scopes: `openid email profile ${youtubeScope}`,
    },
    provider: 'google' as const,
  };
}

export function createGoogleLoginOAuthRequest(redirectTo: string) {
  return createGoogleOAuthRequest(redirectTo, YOUTUBE_WRITE_SCOPE);
}

export function createYouTubeOAuthRequest(redirectTo: string) {
  return createGoogleOAuthRequest(redirectTo, YOUTUBE_WRITE_SCOPE);
}
