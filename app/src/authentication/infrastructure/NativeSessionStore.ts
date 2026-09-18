import type { SessionStore } from '../application/authenticationService';
import { UNAUTHENTICATED, type AuthState } from '../domain/authentication.types';
import { AuthenticationNativePlugin } from './authenticationPlugin';

export class NativeSessionStore implements SessionStore {
  async read(): Promise<AuthState> {
    const { userId } = await AuthenticationNativePlugin.readSession();
    return userId ? { status: 'authenticated', userId } : UNAUTHENTICATED;
  }

  async establish(userId: string): Promise<void> {
    await AuthenticationNativePlugin.saveSession({ userId });
  }

  async clear(): Promise<void> {
    await AuthenticationNativePlugin.clearSession();
  }
}
