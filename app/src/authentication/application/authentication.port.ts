import type { AuthState } from '../domain/authentication.types';

export type AuthenticationUseCases = {
  setupCredentials(username: string, password: string): Promise<void>;
  loginWithPassword(username: string, password: string): Promise<void>;
  unlockWithDevice(): Promise<void>;
  enableDeviceUnlock(): Promise<void>;
  disableDeviceUnlock(): Promise<void>;
  isDeviceUnlockEnabled(): Promise<boolean>;
  isDeviceUnlockAvailable(): Promise<boolean>;
  logout(): void;
  getAuthenticationState(): AuthState;
  hasCredentials(): Promise<boolean>;
};
