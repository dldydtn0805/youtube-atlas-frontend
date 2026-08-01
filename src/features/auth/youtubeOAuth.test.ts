import { describe, expect, it } from 'vitest';
import {
  createYouTubeOAuthRequest,
  YOUTUBE_WRITE_SCOPE,
} from './youtubeOAuth';

describe('YouTube OAuth request', () => {
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
