import { act } from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GoogleLoginButton from './GoogleLoginButton';

const useAuthMock = vi.fn();
const initializeMock = vi.fn();
const renderButtonMock = vi.fn();

vi.mock('../../lib/api', () => ({
  isApiConfigured: true,
}));

vi.mock('../../features/auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('GoogleLoginButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    initializeMock.mockReset();
    renderButtonMock.mockReset();
    window.google = {
      accounts: {
        id: {
          initialize: initializeMock,
          renderButton: renderButtonMock,
        },
      },
    };
    useAuthMock.mockReturnValue({
      authError: null,
      clearAuthError: vi.fn(),
      googleClientId: 'client-id',
      isGoogleAuthAvailable: true,
      isGoogleAuthLoading: false,
      isLoggingIn: false,
      loginWithGoogleIdToken: vi.fn(),
      status: 'anonymous',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the rendered Google button when the SDK mounts it successfully', async () => {
    renderButtonMock.mockImplementation((element: HTMLElement) => {
      const child = document.createElement('div');

      child.dataset.googleButton = 'true';
      element.appendChild(child);
    });

    const { container } = render(<GoogleLoginButton />);

    await act(async () => {
      await flushPromises();
    });

    expect(container.querySelector('.app-shell__google-login-button-shell')).toBeInTheDocument();
    expect(container.querySelector('.app-shell__google-login-button-shell--hidden')).not.toBeInTheDocument();
    expect(screen.queryByText('구글 로그인 버튼을 불러오는 중입니다.')).not.toBeInTheDocument();
    expect(renderButtonMock).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        shape: 'pill',
        type: 'icon',
        width: 40,
      }),
    );
  });

  it('shows a clear error when the SDK does not mount a clickable button', async () => {
    renderButtonMock.mockImplementation(() => {});

    const { container } = render(<GoogleLoginButton />);

    await act(async () => {
      await flushPromises();
      vi.advanceTimersByTime(1_500);
      await flushPromises();
    });

    expect(container.querySelector('.app-shell__google-login-button-shell')).toBeInTheDocument();
    expect(container.querySelector('.app-shell__google-login-button-shell--hidden')).toBeInTheDocument();
    expect(
      screen.getByText(
        '구글 로그인 버튼을 표시하지 못했습니다. 현재 접속 주소가 Google OAuth 허용 출처에 등록되어 있는지 확인해 주세요.',
      ),
    ).toBeInTheDocument();
  });
});
