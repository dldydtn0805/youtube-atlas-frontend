import { describe, expect, it } from 'vitest';
import {
  createYouTubePlaylistOAuthRequest,
  YOUTUBE_PLAYLIST_SCOPE,
} from './youtubeOAuth';

describe('YouTube playlist OAuth request', () => {
  it('requests playlist write access contextually without a stored refresh token', () => {
    expect(createYouTubePlaylistOAuthRequest('https://youtube-atlas.vercel.app')).toEqual({
      options: {
        queryParams: {
          access_type: 'online',
          include_granted_scopes: 'true',
          prompt: 'consent',
        },
        redirectTo: 'https://youtube-atlas.vercel.app',
        scopes: `openid email profile ${YOUTUBE_PLAYLIST_SCOPE}`,
      },
      provider: 'google',
    });
  });
});
