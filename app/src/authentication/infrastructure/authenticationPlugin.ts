import { registerPlugin } from '@capacitor/core';

export type AuthenticationPlugin = {
  readCredentials(): Promise<{ value?: string }>;
  saveCredentials(options: { value: string }): Promise<void>;
};

export const AuthenticationNativePlugin = registerPlugin<AuthenticationPlugin>('AuthenticationPlugin');
