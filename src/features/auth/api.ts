import { fetchApi } from '../../lib/api';
import type { AuthSession, AuthUser, GoogleAuthConfig } from './types';

function createAuthorizationHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function fetchGoogleAuthConfig() {
  return fetchApi<GoogleAuthConfig>('/api/auth/google/config');
}

export async function loginWithGoogle(idToken: string) {
  return fetchApi<AuthSession>('/api/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });
}

export async function fetchCurrentUser(accessToken: string) {
  return fetchApi<AuthUser>('/api/auth/me', {
    headers: createAuthorizationHeader(accessToken),
  });
}

export async function logoutSession(accessToken: string) {
  await fetchApi<void>('/api/auth/session', {
    method: 'DELETE',
    headers: createAuthorizationHeader(accessToken),
  });
}
