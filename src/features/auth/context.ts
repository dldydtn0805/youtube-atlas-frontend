import { createContext } from 'react';
import type { AuthStatus, AuthUser } from './types';

export interface AuthContextValue {
  accessToken: string | null;
  authError: string | null;
  clearAuthError: () => void;
  googleClientId: string;
  isGoogleAuthAvailable: boolean;
  isGoogleAuthLoading: boolean;
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  status: AuthStatus;
  user: AuthUser | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
