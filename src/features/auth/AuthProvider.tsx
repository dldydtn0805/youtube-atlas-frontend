import {
  PropsWithChildren,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { ApiRequestError } from '../../lib/api';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { fetchCurrentUser } from './api';
import {
  clearStoredAuthSession,
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

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? 'loading' : 'anonymous',
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleProviderAccessToken, setGoogleProviderAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const applySupabaseSession = useCallback(
    async (nextSupabaseSession: Session | null) => {
      if (!nextSupabaseSession) {
        clearStoredAuthSession();
        queryClient.removeQueries({ queryKey: authQueryKeys.all });
        setGoogleProviderAccessToken(null);
        startTransition(() => {
          setSession(null);
          setStatus('anonymous');
        });
        return;
      }

      try {
        const user = await fetchCurrentUser(nextSupabaseSession.access_token);
        const nextSession = toAuthSession(nextSupabaseSession, user);

        queryClient.setQueryData(
          authQueryKeys.currentUser(nextSession.accessToken),
          nextSession.user,
        );
        writeStoredAuthSession(nextSession);
        setGoogleProviderAccessToken(nextSupabaseSession.provider_token ?? null);
        startTransition(() => {
          setSession(nextSession);
          setStatus('authenticated');
        });
        setAuthError(null);
      } catch (error) {
        clearStoredAuthSession();
        setGoogleProviderAccessToken(null);
        startTransition(() => {
          setSession(null);
          setStatus('anonymous');
        });
        setAuthError(
          error instanceof ApiRequestError
            ? error.message
            : '로그인 정보를 불러오지 못했습니다.',
        );
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
        setStatus('anonymous');
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
