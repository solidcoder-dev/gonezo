import { Capacitor } from '@capacitor/core';
import { AuthenticationService, type CredentialsRepository, type SessionStore } from '../application/authenticationService';
import { UNAUTHENTICATED, type AuthState, type CredentialRecord } from '../domain/authentication.types';
import { Argon2PasswordHasher } from './argon2PasswordHasher';
import { NativeCredentialsRepository } from './nativeCredentialsRepository';
import { AndroidDeviceAuthenticator } from './androidDeviceAuthenticator';
import { AuthenticationNativePlugin } from './authenticationPlugin';

export function createAuthenticationService() {
  let credentials: CredentialRecord | undefined;
  let state: AuthState = UNAUTHENTICATED;
  const webCredentials: CredentialsRepository = {
    read: async () => credentials,
    create: async (record) => { credentials = record; },
  };
  const sessions: SessionStore = {
    read: async () => {
      if (!Capacitor.isNativePlatform()) return state;
      const { userId } = await AuthenticationNativePlugin.readSession();
      state = userId ? { status: 'authenticated', userId } : UNAUTHENTICATED;
      return state;
    },
    establish: async (userId) => {
      if (Capacitor.isNativePlatform()) await AuthenticationNativePlugin.saveSession({ userId });
      state = { status: 'authenticated', userId };
    },
    clear: async () => {
      if (Capacitor.isNativePlatform()) await AuthenticationNativePlugin.clearSession();
      state = UNAUTHENTICATED;
    },
  };
  return new AuthenticationService({
    credentials: Capacitor.isNativePlatform() ? new NativeCredentialsRepository() : webCredentials,
    passwordHasher: new Argon2PasswordHasher(),
    sessions,
    deviceAuthenticator: new AndroidDeviceAuthenticator(),
    createUserId: () => crypto.randomUUID(),
  });
}
