import { Capacitor } from '@capacitor/core';
import { AuthenticationService, type CredentialsRepository, type SessionStore } from '../application/authenticationService';
import { ANONYMOUS, type CredentialRecord } from '../domain/authentication.types';
import { Argon2PasswordHasher } from './argon2PasswordHasher';
import { NativeCredentialsRepository } from './nativeCredentialsRepository';
import { AndroidDeviceAuthenticator } from './androidDeviceAuthenticator';

export function createAuthenticationService() {
  let credentials: CredentialRecord | undefined;
  let state = ANONYMOUS;
  const webCredentials: CredentialsRepository = {
    read: async () => credentials,
    create: async (record) => { credentials = record; },
  };
  const sessions: SessionStore = {
    read: () => state,
    establish: (userId) => { state = { status: 'authenticated', userId }; },
    clear: () => { state = ANONYMOUS; },
  };
  return new AuthenticationService({
    credentials: Capacitor.isNativePlatform() ? new NativeCredentialsRepository() : webCredentials,
    passwordHasher: new Argon2PasswordHasher(),
    sessions,
    deviceAuthenticator: new AndroidDeviceAuthenticator(),
    createUserId: () => crypto.randomUUID(),
  });
}
