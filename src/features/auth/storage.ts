import type { AuthSession } from './types';
import type { PlaybackProgress } from '../playback/types';
import type { SelectedAchievementTitle } from '../game/types';

const AUTH_SESSION_STORAGE_KEY = 'youtube-atlas-auth-session';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStoredSession(value: unknown): value is AuthSession {
  if (!isObject(value) || !isObject(value.user)) {
    return false;
  }

  return (
    typeof value.accessToken === 'string' &&
    typeof value.tokenType === 'string' &&
    typeof value.expiresAt === 'string' &&
    typeof value.user.id === 'number' &&
    typeof value.user.email === 'string' &&
    typeof value.user.displayName === 'string' &&
    typeof value.user.lastLoginAt === 'string' &&
    (typeof value.user.pictureUrl === 'string' || value.user.pictureUrl === null)
  );
}

function isPlaybackProgress(value: unknown): value is PlaybackProgress {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.videoId === 'string' &&
    (typeof value.videoTitle === 'string' || value.videoTitle === null) &&
    (typeof value.channelTitle === 'string' || value.channelTitle === null) &&
    (typeof value.thumbnailUrl === 'string' || value.thumbnailUrl === null) &&
    typeof value.positionSeconds === 'number' &&
    typeof value.updatedAt === 'string'
  );
}

function isSelectedAchievementTitle(value: unknown): value is SelectedAchievementTitle {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.code === 'string' &&
    typeof value.displayName === 'string' &&
    typeof value.shortName === 'string' &&
    (value.grade === 'NORMAL' ||
      value.grade === 'RARE' ||
      value.grade === 'SUPER' ||
      value.grade === 'ULTIMATE') &&
    typeof value.description === 'string'
  );
}

export function readStoredAuthSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (isStoredSession(parsedValue)) {
      const lastPlaybackProgress = isPlaybackProgress(parsedValue.user.lastPlaybackProgress)
        ? parsedValue.user.lastPlaybackProgress
        : null;
      const recentPlaybackProgresses = Array.isArray(parsedValue.user.recentPlaybackProgresses)
        ? parsedValue.user.recentPlaybackProgresses.filter(isPlaybackProgress)
        : lastPlaybackProgress
          ? [lastPlaybackProgress]
          : [];

      return {
        ...parsedValue,
        user: {
          ...parsedValue.user,
          createdAt:
            typeof parsedValue.user.createdAt === 'string'
              ? parsedValue.user.createdAt
              : parsedValue.user.lastLoginAt,
          selectedTitle: isSelectedAchievementTitle(parsedValue.user.selectedTitle)
            ? parsedValue.user.selectedTitle
            : null,
          favoriteCount:
            typeof parsedValue.user.favoriteCount === 'number'
              ? parsedValue.user.favoriteCount
              : 0,
          commentCount:
            typeof parsedValue.user.commentCount === 'number'
              ? parsedValue.user.commentCount
              : 0,
          tradeCount:
            typeof parsedValue.user.tradeCount === 'number'
              ? parsedValue.user.tradeCount
              : 0,
          lastPlaybackProgress,
          recentPlaybackProgresses,
        },
      };
    }
  } catch {
    // Ignore malformed local data and reset below.
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);

  return null;
}

export function writeStoredAuthSession(session: AuthSession) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export function getStoredAccessToken() {
  return readStoredAuthSession()?.accessToken ?? null;
}
