import {
  PropsWithChildren,
  useCallback,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiRequestError, isApiConfigured } from '../../lib/api';
import {
  fetchCurrentUser,
  fetchGoogleAuthConfig,
  loginWithGoogle,
  logoutSession,
} from './api';
import {
  clearStoredAuthSession,
  readStoredAuthSession,
  writeStoredAuthSession,
} from './storage';
import { AuthContext } from './context';
import type { AuthSession, AuthStatus } from './types';

const initialSession = readStoredAuthSession();

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(initialSession);
  const [status, setStatus] = useState<AuthStatus>(initialSession ? 'loading' : 'anonymous');
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState('');
  const [isGoogleAuthAvailable, setIsGoogleAuthAvailable] = useState(false);
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(isApiConfigured);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    if (!initialSession?.accessToken) {
      setStatus('anonymous');
      return;
    }

    let isCancelled = false;

    void fetchCurrentUser(initialSession.accessToken)
      .then((user) => {
        if (isCancelled) {
          return;
        }

        const nextSession = { ...initialSession, user };

        writeStoredAuthSession(nextSession);
        startTransition(() => {
          setSession(nextSession);
          setStatus('authenticated');
        });
      })
      .catch(() => {
        clearStoredAuthSession();

        if (isCancelled) {
          return;
        }

        startTransition(() => {
          setSession(null);
          setStatus('anonymous');
        });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const loginWithGoogleIdToken = useCallback(async (idToken: string) => {
    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const nextSession = await loginWithGoogle(idToken);

      writeStoredAuthSession(nextSession);
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
  }, []);

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
      window.google?.accounts?.id.disableAutoSelect?.();
      startTransition(() => {
        setSession(null);
        setStatus('anonymous');
      });
      setIsLoggingOut(false);
    }
  }, [session?.accessToken]);

  const value = useMemo(
    () => ({
      accessToken: session?.accessToken ?? null,
      authError,
      clearAuthError,
      googleClientId,
      isGoogleAuthAvailable,
      isGoogleAuthLoading,
      isLoggingIn,
      isLoggingOut,
      loginWithGoogleIdToken,
      logout,
      status,
      user: session?.user ?? null,
    }),
    [
      authError,
      clearAuthError,
      googleClientId,
      isGoogleAuthAvailable,
      isGoogleAuthLoading,
      isLoggingIn,
      isLoggingOut,
      loginWithGoogleIdToken,
      logout,
      session,
      status,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
