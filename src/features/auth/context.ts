import { createContext } from 'react';
import type { AuthStatus, AuthUser } from './types';

export interface AuthContextValue {
  accessToken: string | null;
  applyCurrentUser: (updater: (user: AuthUser | null) => AuthUser | null) => void;
  authError: string | null;
  clearAuthError: () => void;
  googleClientId: string;
  isGoogleAuthAvailable: boolean;
  isGoogleAuthLoading: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  loginWithGoogleAuthorizationCode: (code: string, redirectUri: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  status: AuthStatus;
  user: AuthUser | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
