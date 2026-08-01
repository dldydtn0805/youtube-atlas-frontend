import { describe, expect, it } from 'vitest';
import {
  clearEmptyOAuthHash,
  createGoogleLoginOAuthRequest,
  createYouTubeOAuthRequest,
  getCurrentOAuthRedirectUrl,
  YOUTUBE_WRITE_SCOPE,
} from './youtubeOAuth';

describe('YouTube OAuth request', () => {
  it('clears the empty hash left after Supabase restores an OAuth session', () => {
    window.history.replaceState({ source: 'oauth' }, '', '/kr/top?sort=rank#');

    clearEmptyOAuthHash();

    expect(window.location.href).toBe('http://localhost:3000/kr/top?sort=rank');
    expect(window.history.state).toEqual({ source: 'oauth' });
  });

  it('keeps a non-empty OAuth hash until Supabase consumes it', () => {
    window.history.replaceState({}, '', '/kr/top#access_token=active-token');

    clearEmptyOAuthHash();

    expect(window.location.hash).toBe('#access_token=active-token');
  });

  it('returns to the current page without carrying an existing URL hash', () => {
    expect(
      getCurrentOAuthRedirectUrl(
        'https://trg.life/kr/top?sort=rank#access_token=stale-token',
      ),
    ).toBe('https://trg.life/kr/top?sort=rank');
  });

  it('requests complete YouTube access during the initial Google login', () => {
    expect(createGoogleLoginOAuthRequest('https://trg.life')).toEqual({
      options: {
        queryParams: {
          access_type: 'online',
          include_granted_scopes: 'true',
          prompt: 'consent',
        },
        redirectTo: 'https://trg.life',
        scopes: `openid email profile ${YOUTUBE_WRITE_SCOPE}`,
      },
      provider: 'google',
    });
  });

  it('requests YouTube write access contextually without a stored refresh token', () => {
    expect(createYouTubeOAuthRequest('https://youtube-atlas.vercel.app')).toEqual({
      options: {
        queryParams: {
          access_type: 'online',
          include_granted_scopes: 'true',
          prompt: 'consent',
        },
        redirectTo: 'https://youtube-atlas.vercel.app',
        scopes: `openid email profile ${YOUTUBE_WRITE_SCOPE}`,
      },
      provider: 'google',
    });
  });
});
