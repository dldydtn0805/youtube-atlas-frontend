import { useEffect, useRef, useState } from 'react';
import { isApiConfigured } from '../../lib/api';
import { useAuth } from '../../features/auth/useAuth';

const GOOGLE_IDENTITY_SCRIPT_SELECTOR = 'script[data-google-identity-script="true"]';
const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

let googleIdentityScriptPromise: Promise<void> | null = null;

function GoogleBrandmark() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 18 18">
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.58 2.68-3.9 2.68-6.62Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.97 10.72A5.41 5.41 0 0 1 3.69 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.5.45 3.44 1.33l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33c.71-2.12 2.7-3.7 5.03-3.7Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(GOOGLE_IDENTITY_SCRIPT_SELECTOR);

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('failed_to_load_google_identity')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');

    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentityScript = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('failed_to_load_google_identity'));

    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

export default function GoogleLoginButton() {
  const {
    authError,
    clearAuthError,
    googleClientId,
    isGoogleAuthAvailable,
    isGoogleAuthLoading,
    isLoggingIn,
    loginWithGoogleIdToken,
    status,
  } = useAuth();
  const buttonContainerRef = useRef<HTMLDivElement | null>(null);
  const loginWithGoogleIdTokenRef = useRef(loginWithGoogleIdToken);
  const [buttonError, setButtonError] = useState<string | null>(null);
  const isLoginReady = isApiConfigured && isGoogleAuthAvailable && Boolean(googleClientId);
  const shouldRenderButton = status !== 'authenticated' && !isGoogleAuthLoading && isLoginReady;

  useEffect(() => {
    loginWithGoogleIdTokenRef.current = loginWithGoogleIdToken;
  }, [loginWithGoogleIdToken]);

  useEffect(() => {
    if (!shouldRenderButton || !buttonContainerRef.current) {
      return;
    }

    let isCancelled = false;
    const buttonContainer = buttonContainerRef.current;

    void loadGoogleIdentityScript()
      .then(() => {
        if (isCancelled) {
          return;
        }

        const googleIdentity = window.google?.accounts?.id;

        if (!googleIdentity) {
          setButtonError('구글 로그인 스크립트를 초기화하지 못했습니다.');
          return;
        }

        googleIdentity.initialize({
          auto_select: false,
          callback: (response) => {
            if (!response.credential) {
              setButtonError('구글 로그인 토큰을 받지 못했습니다.');
              return;
            }

            setButtonError(null);
            clearAuthError();
            void loginWithGoogleIdTokenRef.current(response.credential).catch(() => {
              // The provider stores the user-facing error message for the header.
            });
          },
          cancel_on_tap_outside: true,
          client_id: googleClientId,
          ux_mode: 'popup',
        });

        buttonContainer.innerHTML = '';
        googleIdentity.renderButton(buttonContainer, {
          logo_alignment: 'left',
          type: 'icon',
          shape: 'pill',
          size: 'medium',
          text: 'signin_with',
          theme: 'outline',
          width: 40,
        });
      })
      .catch(() => {
        if (!isCancelled) {
          setButtonError('구글 로그인 스크립트를 불러오지 못했습니다.');
        }
      });

    return () => {
      isCancelled = true;

      buttonContainer.innerHTML = '';
    };
  }, [clearAuthError, googleClientId, shouldRenderButton]);

  if (!isApiConfigured) {
    return <p className="app-shell__auth-status">백엔드 연결 후 로그인 기능을 사용할 수 있습니다.</p>;
  }

  if (status === 'loading') {
    return <p className="app-shell__auth-status">저장된 로그인 세션을 확인하는 중입니다.</p>;
  }

  if (isGoogleAuthLoading) {
    return <p className="app-shell__auth-status">구글 로그인 설정을 불러오는 중입니다.</p>;
  }

  if (!isLoginReady) {
    return <p className="app-shell__auth-status">백엔드에 구글 로그인 Client ID가 아직 설정되지 않았습니다.</p>;
  }

  return (
    <div className="app-shell__google-login">
      <div className="app-shell__google-login-button-shell">
        <div
          ref={buttonContainerRef}
          aria-busy={isLoggingIn}
          className="app-shell__google-login-button"
        />
        <span aria-hidden="true" className="app-shell__google-login-brandmark">
          <GoogleBrandmark />
        </span>
      </div>
      {isLoggingIn ? <p className="app-shell__auth-status">구글 계정을 확인하고 있습니다.</p> : null}
      {buttonError || authError ? (
        <p className="app-shell__auth-status app-shell__auth-status--error">
          {buttonError ?? authError}
        </p>
      ) : null}
    </div>
  );
}
