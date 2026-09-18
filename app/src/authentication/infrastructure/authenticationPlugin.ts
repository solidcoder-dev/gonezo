import { registerPlugin } from '@capacitor/core';

export type AuthenticationPlugin = {
  readCredentials(): Promise<{ value?: string }>;
  saveCredentials(options: { value: string }): Promise<void>;
  readSession(): Promise<{ userId?: string }>;
  saveSession(options: { userId: string }): Promise<void>;
  clearSession(): Promise<void>;
  isDeviceAuthenticationAvailable(): Promise<{ available: boolean }>;
  authenticateDevice(): Promise<void>;
  isDeviceUnlockEnabled(): Promise<{ enabled: boolean }>;
  enableDeviceUnlock(): Promise<void>;
  disableDeviceUnlock(): Promise<void>;
};

export const AuthenticationNativePlugin = registerPlugin<AuthenticationPlugin>('AuthenticationPlugin');
