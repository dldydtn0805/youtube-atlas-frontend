export const YOUTUBE_WRITE_SCOPE = 'https://www.googleapis.com/auth/youtube';

export function clearEmptyOAuthHash() {
  if (window.location.hash || !window.location.href.endsWith('#')) {
    return;
  }

  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  );
}

export function getCurrentOAuthRedirectUrl(
  locationHref = window.location.href,
) {
  const redirectUrl = new URL(locationHref);

  redirectUrl.hash = '';

  return redirectUrl.toString();
}

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
