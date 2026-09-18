import type { SessionStore } from '../application/authenticationService';
import { UNAUTHENTICATED, type AuthState } from '../domain/authentication.types';

export class InMemorySessionStore implements SessionStore {
  private state: AuthState = UNAUTHENTICATED;

  async read(): Promise<AuthState> {
    return this.state;
  }

  async establish(userId: string): Promise<void> {
    this.state = { status: 'authenticated', userId };
  }

  async clear(): Promise<void> {
    this.state = UNAUTHENTICATED;
  }
}
