import { Capacitor } from '@capacitor/core';
import { AuthenticationService } from '../application/authenticationService';
import { Argon2PasswordHasher } from './argon2PasswordHasher';
import { NativeCredentialsRepository } from './nativeCredentialsRepository';
import { InMemoryCredentialsRepository } from './InMemoryCredentialsRepository';
import { InMemorySessionStore } from './InMemorySessionStore';
import { NativeSessionStore } from './NativeSessionStore';
import { AndroidDeviceAuthenticator } from './androidDeviceAuthenticator';

export function createAuthenticationService() {
  const isNativeRuntime = Capacitor.isNativePlatform();
  return new AuthenticationService({
    credentials: isNativeRuntime ? new NativeCredentialsRepository() : new InMemoryCredentialsRepository(),
    passwordHasher: new Argon2PasswordHasher(),
    sessions: isNativeRuntime ? new NativeSessionStore() : new InMemorySessionStore(),
    deviceAuthenticator: new AndroidDeviceAuthenticator(),
    authenticationDelay: { wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)) },
    createUserId: () => crypto.randomUUID(),
  });
}
