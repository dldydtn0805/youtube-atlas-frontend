import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { writeStoredAuthSession } from './storage';
import type { AuthSession, AuthUser } from './types';
import { useAuth } from './useAuth';

const { authState, fetchCurrentUserMock, getSessionMock, onAuthStateChangeMock } = vi.hoisted(
  () => ({
    authState: {
      handler: null as null | ((event: string, session: Session | null) => void),
    },
    fetchCurrentUserMock: vi.fn(),
    getSessionMock: vi.fn(),
    onAuthStateChangeMock: vi.fn(),
  }),
);

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('./api', () => ({
  fetchCurrentUser: fetchCurrentUserMock,
}));

vi.mock('./youtubeOAuth', () => ({
  clearEmptyOAuthHash: vi.fn(),
  createGoogleLoginOAuthRequest: vi.fn(),
  createYouTubeOAuthRequest: vi.fn(),
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

function createAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    commentCount: 2,
    createdAt: '2026-04-01T00:00:00.000Z',
    displayName: '확인된 사용자',
    email: 'user@example.com',
    id: 7,
    lastLoginAt: '2026-08-02T00:00:00.000Z',
    lastPlaybackProgress: null,
    pictureUrl: null,
    recentPlaybackProgresses: [],
    selectedTitle: null,
    tradeCount: 4,
    ...overrides,
  };
}

function createSupabaseSession(): Session {
  return {
    access_token: 'supabase-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    user: {
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2026-04-01T00:00:00.000Z',
      email: 'user@example.com',
      id: 'supabase-user-id',
      last_sign_in_at: '2026-08-02T00:00:00.000Z',
      role: 'authenticated',
      updated_at: '2026-08-02T00:00:00.000Z',
      user_metadata: {
        full_name: '빠른 사용자',
      },
    },
  } as Session;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe('AuthProvider initial session', () => {
  beforeEach(() => {
    window.localStorage.clear();
    authState.handler = null;
    fetchCurrentUserMock.mockReset();
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    onAuthStateChangeMock.mockImplementation((handler) => {
      authState.handler = handler;

      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('exposes a valid cached session without waiting for Supabase restoration', () => {
    const storedSession: AuthSession = {
      accessToken: 'stored-token',
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      tokenType: 'bearer',
      user: createAuthUser(),
    };
    const pendingSession = createDeferred<never>();
    writeStoredAuthSession(storedSession);
    getSessionMock.mockReturnValue(pendingSession.promise);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.accessToken).toBe('stored-token');
    expect(result.current.user).toEqual(storedSession.user);
  });

  it('clears a cached session when Supabase restoration rejects it', async () => {
    writeStoredAuthSession({
      accessToken: 'stale-token',
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      tokenType: 'bearer',
      user: createAuthUser(),
    });
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: new Error('invalid session'),
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.accessToken).toBe('stale-token');

    await waitFor(() => {
      expect(result.current.status).toBe('anonymous');
      expect(result.current.accessToken).toBeNull();
    });
    expect(window.localStorage.getItem('youtube-atlas-auth-session')).toBeNull();
  });

  it('starts authenticated requests before the profile request completes', async () => {
    const supabaseSession = createSupabaseSession();
    const profileRequest = createDeferred<AuthUser>();
    fetchCurrentUserMock.mockReturnValue(profileRequest.promise);
    getSessionMock.mockResolvedValue({
      data: { session: supabaseSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.status).toBe('authenticated');
      expect(result.current.accessToken).toBe('supabase-token');
    });

    expect(result.current.user).toEqual(
      expect.objectContaining({
        displayName: '빠른 사용자',
        email: 'user@example.com',
        id: 0,
      }),
    );
    expect(fetchCurrentUserMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      authState.handler?.('SIGNED_IN', supabaseSession);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(fetchCurrentUserMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      profileRequest.resolve(createAuthUser());
      await profileRequest.promise;
    });

    await waitFor(() => {
      expect(result.current.user?.id).toBe(7);
      expect(result.current.user?.displayName).toBe('확인된 사용자');
    });
  });
});
