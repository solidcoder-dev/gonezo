import { Capacitor } from '@capacitor/core';
import { AuthenticationService, type CredentialsRepository, type SessionStore } from '../application/authenticationService';
import { UNAUTHENTICATED, type AuthState, type CredentialRecord } from '../domain/authentication.types';
import { Argon2PasswordHasher } from './argon2PasswordHasher';
import { NativeCredentialsRepository } from './nativeCredentialsRepository';
import { AndroidDeviceAuthenticator } from './androidDeviceAuthenticator';
import { AuthenticationNativePlugin } from './authenticationPlugin';

export function createAuthenticationService() {
  let webCredentialsValue: CredentialRecord | undefined;
  let webSessionState: AuthState = UNAUTHENTICATED;
  const inMemoryCredentialsRepository: CredentialsRepository = {
    read: async () => webCredentialsValue,
    create: async (record) => { webCredentialsValue = record; },
  };
  const inMemorySessionStore: SessionStore = {
    read: async () => {
      if (!Capacitor.isNativePlatform()) return webSessionState;
      const { userId } = await AuthenticationNativePlugin.readSession();
      webSessionState = userId ? { status: 'authenticated', userId } : UNAUTHENTICATED;
      return webSessionState;
    },
    establish: async (userId) => {
      if (Capacitor.isNativePlatform()) await AuthenticationNativePlugin.saveSession({ userId });
      webSessionState = { status: 'authenticated', userId };
    },
    clear: async () => {
      if (Capacitor.isNativePlatform()) await AuthenticationNativePlugin.clearSession();
      webSessionState = UNAUTHENTICATED;
    },
  };
  return new AuthenticationService({
    credentials: Capacitor.isNativePlatform() ? new NativeCredentialsRepository() : inMemoryCredentialsRepository,
    passwordHasher: new Argon2PasswordHasher(),
    sessions: inMemorySessionStore,
    deviceAuthenticator: new AndroidDeviceAuthenticator(),
    authenticationDelay: { wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)) },
    createUserId: () => crypto.randomUUID(),
  });
}
