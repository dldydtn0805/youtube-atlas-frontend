export const YOUTUBE_PLAYLIST_SCOPE = 'https://www.googleapis.com/auth/youtube';

export function createYouTubePlaylistOAuthRequest(redirectTo: string) {
  return {
    options: {
      queryParams: {
        access_type: 'online',
        include_granted_scopes: 'true',
        prompt: 'consent',
      },
      redirectTo,
      scopes: `openid email profile ${YOUTUBE_PLAYLIST_SCOPE}`,
    },
    provider: 'google' as const,
  };
}
