import type { AuthState } from '../domain/authentication.types';

export type AuthenticationUseCases = {
  setupCredentials(username: string, password: string): Promise<void>;
  loginWithPassword(username: string, password: string): Promise<void>;
  unlockWithDevice(): Promise<void>;
  enableDeviceUnlock(password: string): Promise<void>;
  disableDeviceUnlock(): Promise<void>;
  isDeviceUnlockEnabled(): Promise<boolean>;
  isDeviceUnlockAvailable(): Promise<boolean>;
  logout(): Promise<void>;
  getAuthenticationState(): Promise<AuthState>;
  hasCredentials(): Promise<boolean>;
};
