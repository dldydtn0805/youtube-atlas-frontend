import {
  PropsWithChildren,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { ApiRequestError } from '../../lib/api';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { fetchCurrentUser } from './api';
import {
  clearStoredAuthSession,
  readStoredAuthSession,
  writeStoredAuthSession,
} from './storage';
import { AuthContext } from './context';
import { authQueryKeys } from './queries';
import type { AuthSession, AuthStatus, AuthUser } from './types';
import {
  clearEmptyOAuthHash,
  createGoogleLoginOAuthRequest,
  createYouTubeOAuthRequest,
} from './youtubeOAuth';

function toAuthSession(session: Session, user: AuthUser): AuthSession {
  const expiresAt = new Date(
    (session.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000,
  ).toISOString();

  return {
    accessToken: session.access_token,
    expiresAt,
    tokenType: session.token_type || 'bearer',
    user,
  };
}

const STORED_SESSION_EXPIRY_BUFFER_MS = 30_000;

function getInitialAuthSession() {
  if (!isSupabaseConfigured) {
    return null;
  }

  const storedSession = readStoredAuthSession();
  if (
    !storedSession ||
    new Date(storedSession.expiresAt).getTime() <=
      Date.now() + STORED_SESSION_EXPIRY_BUFFER_MS
  ) {
    clearStoredAuthSession();
    return null;
  }

  return storedSession;
}

function createProvisionalAuthUser(session: Session): AuthUser {
  const metadata = session.user.user_metadata;
  const email = session.user.email?.trim() || `${session.user.id}@unknown.local`;
  const displayName =
    String(metadata?.full_name ?? metadata?.name ?? '').trim() ||
    email.split('@')[0] ||
    '사용자';
  const pictureUrl =
    String(metadata?.avatar_url ?? metadata?.picture ?? '').trim() || null;
  const createdAt = session.user.created_at || new Date().toISOString();

  return {
    commentCount: 0,
    createdAt,
    displayName,
    email,
    id: 0,
    lastLoginAt: session.user.last_sign_in_at ?? createdAt,
    lastPlaybackProgress: null,
    pictureUrl,
    recentPlaybackProgresses: [],
    selectedTitle: null,
    tradeCount: 0,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(getInitialAuthSession);
  const [status, setStatus] = useState<AuthStatus>(() =>
    session
      ? 'authenticated'
      : isSupabaseConfigured
        ? 'loading'
        : 'anonymous',
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleProviderAccessToken, setGoogleProviderAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const activeAccessTokenRef = useRef(session?.accessToken ?? null);
  const profileRequestTokenRef = useRef<string | null>(null);

  const applySupabaseSession = useCallback(
    async (nextSupabaseSession: Session | null) => {
      if (!nextSupabaseSession) {
        activeAccessTokenRef.current = null;
        profileRequestTokenRef.current = null;
        clearStoredAuthSession();
        queryClient.removeQueries({ queryKey: authQueryKeys.all });
        setGoogleProviderAccessToken(null);
        startTransition(() => {
          setSession(null);
          setStatus('anonymous');
        });
        return;
      }

      const accessToken = nextSupabaseSession.access_token;
      activeAccessTokenRef.current = accessToken;
      setGoogleProviderAccessToken(nextSupabaseSession.provider_token ?? null);
      startTransition(() => {
        setSession((currentSession) =>
          toAuthSession(
            nextSupabaseSession,
            currentSession?.accessToken === accessToken
              ? currentSession.user
              : createProvisionalAuthUser(nextSupabaseSession),
          ),
        );
        setStatus('authenticated');
      });

      if (profileRequestTokenRef.current === accessToken) {
        return;
      }

      const profileRequest = fetchCurrentUser(accessToken);
      profileRequestTokenRef.current = accessToken;

      try {
        const user = await profileRequest;

        if (activeAccessTokenRef.current !== accessToken) {
          return;
        }

        const nextSession = toAuthSession(nextSupabaseSession, user);

        queryClient.setQueryData(
          authQueryKeys.currentUser(nextSession.accessToken),
          nextSession.user,
        );
        writeStoredAuthSession(nextSession);
        startTransition(() => {
          setSession(nextSession);
          setStatus('authenticated');
        });
        setAuthError(null);
      } catch (error) {
        if (activeAccessTokenRef.current !== accessToken) {
          return;
        }

        const isUnauthorized =
          error instanceof ApiRequestError &&
          (error.code === 'unauthorized' || error.code === 'session_expired');

        if (isUnauthorized) {
          activeAccessTokenRef.current = null;
          clearStoredAuthSession();
          setGoogleProviderAccessToken(null);
          startTransition(() => {
            setSession(null);
            setStatus('anonymous');
          });
        }
        setAuthError(
          error instanceof ApiRequestError
            ? error.message
            : '로그인 정보를 불러오지 못했습니다.',
        );
      } finally {
        if (profileRequestTokenRef.current === accessToken) {
          profileRequestTokenRef.current = null;
        }
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (!supabase) {
      clearStoredAuthSession();
      setStatus('anonymous');
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) {
        return;
      }

      clearEmptyOAuthHash();

      if (error) {
        setAuthError('로그인 상태를 확인하지 못했습니다.');
        void applySupabaseSession(null);
        return;
      }

      void applySupabaseSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        if (!cancelled) {
          void applySupabaseSession(nextSession);
        }
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applySupabaseSession]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const applyCurrentUser = useCallback(
    (updater: (user: AuthUser | null) => AuthUser | null) => {
      setSession((currentSession) => {
        if (!currentSession) {
          return currentSession;
        }

        const nextUser = updater(currentSession.user);
        if (!nextUser) {
          return currentSession;
        }

        const nextSession = {
          ...currentSession,
          user: nextUser,
        };

        queryClient.setQueryData(
          authQueryKeys.currentUser(currentSession.accessToken),
          nextUser,
        );
        writeStoredAuthSession(nextSession);
        return nextSession;
      });
    },
    [queryClient],
  );

  const refreshCurrentUser = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }

    const user = await fetchCurrentUser(session.accessToken);

    setSession((currentSession) => {
      if (!currentSession || currentSession.accessToken !== session.accessToken) {
        return currentSession;
      }

      const nextSession = {
        ...currentSession,
        user,
      };
      writeStoredAuthSession(nextSession);
      return nextSession;
    });
  }, [session?.accessToken]);

  const loginWithGoogleCode = useCallback(
    async (_code: string, redirectUri: string) => {
      if (!supabase) {
        setAuthError('Supabase 연결 설정이 필요합니다.');
        return;
      }

      setIsLoggingIn(true);
      setAuthError(null);

      const { error } = await supabase.auth.signInWithOAuth(
        createGoogleLoginOAuthRequest(redirectUri),
      );

      if (error) {
        setIsLoggingIn(false);
        setAuthError(error.message || '구글 로그인에 실패했습니다.');
        throw error;
      }
    },
    [],
  );

  const requestYouTubeAccess = useCallback(async (redirectUri: string) => {
    if (!supabase) {
      const error = new Error('Supabase 연결 설정이 필요합니다.');
      setAuthError(error.message);
      throw error;
    }

    setIsLoggingIn(true);
    setAuthError(null);

    const { error } = await supabase.auth.signInWithOAuth(
      createYouTubeOAuthRequest(redirectUri),
    );

    if (error) {
      setIsLoggingIn(false);
      setAuthError(error.message || 'YouTube 연결에 실패했습니다.');
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    setAuthError(null);

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      clearStoredAuthSession();
      queryClient.removeQueries({ queryKey: authQueryKeys.all });
      setGoogleProviderAccessToken(null);
      startTransition(() => {
        setSession(null);
        setStatus('anonymous');
      });
      setIsLoggingOut(false);
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({
      accessToken: session?.accessToken ?? null,
      applyCurrentUser,
      authError,
      clearAuthError,
      googleClientId: '',
      googleProviderAccessToken,
      isGoogleAuthAvailable: isSupabaseConfigured,
      isGoogleAuthLoading: status === 'loading',
      isLoggingIn,
      isLoggingOut,
      loginWithGoogleAuthorizationCode: loginWithGoogleCode,
      logout,
      requestYouTubeAccess,
      refreshCurrentUser,
      status,
      user: session?.user ?? null,
    }),
    [
      applyCurrentUser,
      authError,
      clearAuthError,
      googleProviderAccessToken,
      isLoggingIn,
      isLoggingOut,
      loginWithGoogleCode,
      logout,
      requestYouTubeAccess,
      refreshCurrentUser,
      session,
      status,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
