import type { PlaybackProgress } from '../playback/types';

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  pictureUrl: string | null;
  createdAt: string;
  lastLoginAt: string;
  favoriteCount: number;
  commentCount: number;
  tradeCount: number;
  lastPlaybackProgress: PlaybackProgress | null;
  recentPlaybackProgresses: PlaybackProgress[];
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  user: AuthUser;
}

export interface GoogleAuthConfig {
  clientId: string;
  enabled: boolean;
}

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';
