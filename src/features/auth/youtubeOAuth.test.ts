import { describe, expect, it } from 'vitest';
import {
  createGoogleLoginOAuthRequest,
  createYouTubeOAuthRequest,
  getCurrentOAuthRedirectUrl,
  YOUTUBE_WRITE_SCOPE,
} from './youtubeOAuth';

describe('YouTube OAuth request', () => {
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
