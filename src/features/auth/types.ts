export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  pictureUrl: string | null;
  lastLoginAt: string;
}

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  user: AuthUser;
}

export interface GoogleAuthConfig {
  clientId: string;
  enabled: boolean;
}

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';
