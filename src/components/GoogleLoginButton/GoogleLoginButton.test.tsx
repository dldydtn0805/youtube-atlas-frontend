import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GoogleLoginButton from './GoogleLoginButton';

const useAuthMock = vi.fn();

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
}));

vi.mock('../../features/auth/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

describe('GoogleLoginButton', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    useAuthMock.mockReturnValue({
      authError: null,
      clearAuthError: vi.fn(),
      isGoogleAuthAvailable: true,
      isGoogleAuthLoading: false,
      isLoggingIn: false,
      loginWithGoogleAuthorizationCode: vi.fn().mockResolvedValue(undefined),
      status: 'anonymous',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders an enabled Supabase Google OAuth trigger', () => {
    render(<GoogleLoginButton />);

    expect(screen.getByRole('button', { name: 'Google로 로그인' })).toBeEnabled();
  });

  it('starts Supabase Google OAuth with the current canonical page', () => {
    const loginWithGoogleAuthorizationCode = vi.fn().mockResolvedValue(undefined);
    window.history.replaceState({}, '', '/kr/top');
    useAuthMock.mockReturnValue({
      authError: null,
      clearAuthError: vi.fn(),
      isGoogleAuthAvailable: true,
      isGoogleAuthLoading: false,
      isLoggingIn: false,
      loginWithGoogleAuthorizationCode,
      status: 'anonymous',
    });

    render(<GoogleLoginButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Google로 로그인' }));

    expect(loginWithGoogleAuthorizationCode).toHaveBeenCalledWith(
      '',
      window.location.href,
    );
  });

  it('does not render when the user is authenticated', () => {
    useAuthMock.mockReturnValue({
      authError: null,
      clearAuthError: vi.fn(),
      isGoogleAuthAvailable: true,
      isGoogleAuthLoading: false,
      isLoggingIn: false,
      loginWithGoogleAuthorizationCode: vi.fn(),
      status: 'authenticated',
    });

    render(<GoogleLoginButton />);

    expect(screen.queryByRole('button', { name: 'Google로 로그인' })).not.toBeInTheDocument();
  });

  it('shows an OAuth error returned by the auth provider', async () => {
    useAuthMock.mockReturnValue({
      authError: null,
      clearAuthError: vi.fn(),
      isGoogleAuthAvailable: true,
      isGoogleAuthLoading: false,
      isLoggingIn: false,
      loginWithGoogleAuthorizationCode: vi
        .fn()
        .mockRejectedValue(new Error('OAuth redirect failed')),
      status: 'anonymous',
    });

    render(<GoogleLoginButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Google로 로그인' }));

    await waitFor(() => {
      expect(screen.getByText('OAuth redirect failed')).toBeInTheDocument();
    });
  });
});
