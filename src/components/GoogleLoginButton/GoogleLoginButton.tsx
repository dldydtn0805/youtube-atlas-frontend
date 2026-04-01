import { useEffect, useRef, useState } from 'react';
import { isApiConfigured } from '../../lib/api';
import { useAuth } from '../../features/auth/useAuth';

const GOOGLE_IDENTITY_SCRIPT_SELECTOR = 'script[data-google-identity-script="true"]';
const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GOOGLE_BUTTON_RENDER_TIMEOUT_MS = 1_500;

let googleIdentityScriptPromise: Promise<void> | null = null;
type GoogleButtonStatus = 'idle' | 'rendering' | 'ready' | 'failed';

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
  const [buttonStatus, setButtonStatus] = useState<GoogleButtonStatus>('idle');
  const isLoginReady = isApiConfigured && isGoogleAuthAvailable && Boolean(googleClientId);
  const shouldRenderButton = status !== 'authenticated' && !isGoogleAuthLoading && isLoginReady;
  const isButtonReady = buttonStatus === 'ready';
  const buttonShellClassName = [
    'app-shell__google-login-button-shell',
    isButtonReady ? null : 'app-shell__google-login-button-shell--hidden',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    loginWithGoogleIdTokenRef.current = loginWithGoogleIdToken;
  }, [loginWithGoogleIdToken]);

  useEffect(() => {
    if (!shouldRenderButton || !buttonContainerRef.current) {
      setButtonStatus('idle');
      return;
    }

    let isCancelled = false;
    const buttonContainer = buttonContainerRef.current;
    let renderTimeoutId: number | null = null;
    let renderObserver: MutationObserver | null = null;

    setButtonStatus('rendering');
    setButtonError(null);

    const clearRenderState = () => {
      if (renderTimeoutId !== null) {
        window.clearTimeout(renderTimeoutId);
        renderTimeoutId = null;
      }

      renderObserver?.disconnect();
      renderObserver = null;
    };

    const markButtonReady = () => {
      if (isCancelled || buttonContainer.childElementCount === 0) {
        return;
      }

      clearRenderState();
      setButtonStatus('ready');
      setButtonError(null);
    };

    const markButtonFailure = (message: string) => {
      if (isCancelled) {
        return;
      }

      clearRenderState();
      buttonContainer.innerHTML = '';
      setButtonStatus('failed');
      setButtonError(message);
    };

    void loadGoogleIdentityScript()
      .then(() => {
        if (isCancelled) {
          return;
        }

        const googleIdentity = window.google?.accounts?.id;

        if (!googleIdentity) {
          markButtonFailure('구글 로그인 스크립트를 초기화하지 못했습니다.');
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
        renderObserver = new MutationObserver(() => {
          markButtonReady();
        });
        renderObserver.observe(buttonContainer, {
          childList: true,
          subtree: true,
        });
        googleIdentity.renderButton(buttonContainer, {
          logo_alignment: 'left',
          type: 'icon',
          shape: 'pill',
          size: 'medium',
          text: 'signin_with',
          theme: 'outline',
          width: 40,
        });
        markButtonReady();

        renderTimeoutId = window.setTimeout(() => {
          if (buttonContainer.childElementCount === 0) {
            markButtonFailure(
              '구글 로그인 버튼을 표시하지 못했습니다. 현재 접속 주소가 Google OAuth 허용 출처에 등록되어 있는지 확인해 주세요.',
            );
          }
        }, GOOGLE_BUTTON_RENDER_TIMEOUT_MS);
      })
      .catch(() => {
        markButtonFailure('구글 로그인 스크립트를 불러오지 못했습니다.');
      });

    return () => {
      isCancelled = true;
      clearRenderState();

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
      <div className={buttonShellClassName}>
        <div
          ref={buttonContainerRef}
          aria-busy={isLoggingIn}
          className="app-shell__google-login-button"
        />
      </div>
      {buttonStatus === 'rendering' ? (
        <p className="app-shell__auth-status">구글 로그인 버튼을 불러오는 중입니다.</p>
      ) : null}
      {isLoggingIn ? <p className="app-shell__auth-status">구글 계정을 확인하고 있습니다.</p> : null}
      {buttonError || authError ? (
        <p className="app-shell__auth-status app-shell__auth-status--error">
          {buttonError ?? authError}
        </p>
      ) : null}
    </div>
  );
}
