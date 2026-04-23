import {
  PropsWithChildren,
  useCallback,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError, isApiConfigured } from '../../lib/api';
import {
  fetchCurrentUser,
  fetchGoogleAuthConfig,
  loginWithGoogleAuthorizationCode,
  logoutSession,
} from './api';
import {
  clearStoredAuthSession,
  readStoredAuthSession,
  writeStoredAuthSession,
} from './storage';
import { AuthContext } from './context';
import { authQueryKeys } from './queries';
import type { AuthSession, AuthStatus, AuthUser } from './types';

const initialSession = readStoredAuthSession();

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [status, setStatus] = useState<AuthStatus>(initialSession ? 'loading' : 'anonymous');
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState('');
  const [isGoogleAuthAvailable, setIsGoogleAuthAvailable] = useState(false);
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(isApiConfigured);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasVerifiedInitialSession, setHasVerifiedInitialSession] = useState(
    !initialSession?.accessToken,
  );
  const accessToken = session?.accessToken ?? null;

  const currentUserQuery = useQuery({
    enabled: Boolean(accessToken),
    queryKey: authQueryKeys.currentUser(accessToken),
    queryFn: () => fetchCurrentUser(accessToken as string),
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (!isApiConfigured) {
      setIsGoogleAuthLoading(false);
      setIsGoogleAuthAvailable(false);
      setGoogleClientId('');
      return;
    }

    let isCancelled = false;

    setIsGoogleAuthLoading(true);

    void fetchGoogleAuthConfig()
      .then((config) => {
        if (isCancelled) {
          return;
        }

        setGoogleClientId(config.clientId);
        setIsGoogleAuthAvailable(config.enabled);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setGoogleClientId('');
        setIsGoogleAuthAvailable(false);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsGoogleAuthLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session || !currentUserQuery.data) {
      return;
    }

    setHasVerifiedInitialSession(true);

    if (session.user === currentUserQuery.data && status === 'authenticated') {
      return;
    }

    const nextSession = { ...session, user: currentUserQuery.data };

    writeStoredAuthSession(nextSession);
    startTransition(() => {
      setSession(nextSession);
      setStatus('authenticated');
    });
  }, [currentUserQuery.data, session, status]);

  useEffect(() => {
    if (!currentUserQuery.error) {
      return;
    }

    const shouldClearSession =
      (currentUserQuery.error instanceof ApiRequestError &&
        (currentUserQuery.error.code === 'unauthorized' ||
          currentUserQuery.error.code === 'session_expired')) ||
      !hasVerifiedInitialSession;

    if (!shouldClearSession) {
      return;
    }

    clearStoredAuthSession();
    queryClient.removeQueries({ queryKey: authQueryKeys.all });
    startTransition(() => {
      setSession(null);
      setStatus('anonymous');
    });
    setHasVerifiedInitialSession(true);
  }, [currentUserQuery.error, hasVerifiedInitialSession, queryClient]);

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

        const nextSession = { ...currentSession, user: nextUser };
        queryClient.setQueryData(authQueryKeys.currentUser(currentSession.accessToken), nextUser);
        writeStoredAuthSession(nextSession);
        return nextSession;
      });
    },
    [queryClient],
  );

  const refreshCurrentUser = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    const refreshedUser = await queryClient.fetchQuery({
      queryKey: authQueryKeys.currentUser(accessToken),
      queryFn: () => fetchCurrentUser(accessToken),
      staleTime: 0,
    });

    setSession((currentSession) => {
      if (!currentSession || currentSession.accessToken !== accessToken) {
        return currentSession;
      }

      const nextSession = { ...currentSession, user: refreshedUser };
      writeStoredAuthSession(nextSession);
      return nextSession;
    });
    setStatus('authenticated');
  }, [accessToken, queryClient]);

  const loginWithGoogleCode = useCallback(
    async (code: string, redirectUri: string) => {
      setIsLoggingIn(true);
      setAuthError(null);

      try {
        const nextSession = await loginWithGoogleAuthorizationCode(code, redirectUri);

        queryClient.setQueryData(
          authQueryKeys.currentUser(nextSession.accessToken),
          nextSession.user,
        );
        writeStoredAuthSession(nextSession);
        setHasVerifiedInitialSession(true);
        startTransition(() => {
          setSession(nextSession);
          setStatus('authenticated');
        });
      } catch (error) {
        const nextMessage =
          error instanceof ApiRequestError
            ? error.message
            : '구글 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.';

        setAuthError(nextMessage);
        throw error;
      } finally {
        setIsLoggingIn(false);
      }
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    const accessToken = session?.accessToken;

    setIsLoggingOut(true);
    setAuthError(null);

    try {
      if (accessToken) {
        await logoutSession(accessToken);
      }
    } catch {
      // Local sign-out should still succeed even if the backend session cleanup fails.
    } finally {
      clearStoredAuthSession();
      queryClient.removeQueries({ queryKey: authQueryKeys.all });
      setHasVerifiedInitialSession(true);
      startTransition(() => {
        setSession(null);
        setStatus('anonymous');
      });
      setIsLoggingOut(false);
    }
  }, [queryClient, session?.accessToken]);

  const value = useMemo(
    () => ({
      accessToken: session?.accessToken ?? null,
      applyCurrentUser,
      authError,
      clearAuthError,
      googleClientId,
      isGoogleAuthAvailable,
      isGoogleAuthLoading,
      isLoggingIn,
      isLoggingOut,
      loginWithGoogleAuthorizationCode: loginWithGoogleCode,
      logout,
      refreshCurrentUser,
      status,
      user: session?.user ?? null,
    }),
    [
      authError,
      applyCurrentUser,
      clearAuthError,
      googleClientId,
      isGoogleAuthAvailable,
      isGoogleAuthLoading,
      isLoggingIn,
      isLoggingOut,
      loginWithGoogleCode,
      logout,
      refreshCurrentUser,
      session,
      status,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
