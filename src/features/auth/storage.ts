import type { AuthSession } from './types';

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
      return parsedValue;
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
