import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../features/auth/useAuth';
import { getCurrentOAuthRedirectUrl } from '../../features/auth/youtubeOAuth';
import './GoogleLoginButton.css';

export default function GoogleLoginButton() {
  const {
    authError,
    clearAuthError,
    isGoogleAuthAvailable,
    isGoogleAuthLoading,
    isLoggingIn,
    loginWithGoogleAuthorizationCode,
    status,
  } = useAuth();
  const [buttonError, setButtonError] = useState<string | null>(null);
  const isLoginReady = isSupabaseConfigured && isGoogleAuthAvailable;
  const statusMessage = buttonError ?? authError;
  const isLoadingState = status === 'loading' || isGoogleAuthLoading || isLoggingIn;

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setButtonError(null);
      clearAuthError();
    }, 3600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [clearAuthError, statusMessage]);

  if (status === 'authenticated') {
    return null;
  }

  const handleStartLogin = () => {
    if (!isLoginReady || isLoadingState) {
      return;
    }

    setButtonError(null);
    clearAuthError();
    void loginWithGoogleAuthorizationCode(
      '',
      getCurrentOAuthRedirectUrl(),
    ).catch((error) => {
      setButtonError(
        error instanceof Error ? error.message : '로그인에 실패했습니다.',
      );
    });
  };

  return (
    <div className="app-shell__google-login">
      <button
        aria-describedby={statusMessage ? 'google-login-status' : undefined}
        aria-busy={isLoggingIn}
        aria-label="Google로 로그인"
        className="app-shell__google-login-trigger"
        disabled={!isLoginReady || isLoadingState}
        onClick={handleStartLogin}
        type="button"
      >
        {isLoadingState ? (
          <span aria-hidden="true" className="app-shell__google-login-spinner" />
        ) : (
          <span aria-hidden="true" className="app-shell__google-login-trigger-glyph">
            G
          </span>
        )}
      </button>
      {statusMessage ? (
        <aside
          aria-live="assertive"
          className="app-shell__auth-status app-shell__auth-status--error"
          id="google-login-status"
          role="alert"
        >
          <p>{statusMessage}</p>
          <button
            aria-label="로그인 상태 토스트 닫기"
            className="app-shell__auth-status-close"
            onClick={() => {
              setButtonError(null);
              clearAuthError();
            }}
            type="button"
          >
            닫기
          </button>
        </aside>
      ) : null}
    </div>
  );
}
