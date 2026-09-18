import { describe, expect, it } from 'vitest';
import { AuthenticationService, type AuthenticationPorts, type DeviceAuthenticator } from './authenticationService';
import type { AuthState, CredentialRecord } from '../domain/authentication.types';

function createService(existing?: CredentialRecord, deviceAuthenticator: DeviceAuthenticator = { authenticate: async () => undefined }) {
  let credentials = existing;
  let state: AuthState = { status: 'anonymous' };
  const ports: AuthenticationPorts = {
    credentials: {
      read: async () => credentials,
      create: async (record) => { credentials = record; },
    },
    passwordHasher: {
      hash: async (password) => `hash:${password}`,
      verify: async (password, hash) => hash === `hash:${password}`,
    },
    sessions: {
      read: () => state,
      establish: (userId) => { state = { status: 'authenticated', userId }; },
      clear: () => { state = { status: 'anonymous' }; },
    },
    deviceAuthenticator,
    createUserId: () => 'user-1',
  };
  return { service: new AuthenticationService(ports), get credentials() { return credentials; }, get state() { return state; } };
}

describe('AuthenticationService', () => {
  it('creates credentials and authenticates the first local user', async () => {
    const context = createService();
    await context.service.setupCredentials(' Alice ', 'secret-pass');

    expect(context.credentials?.normalizedUsername).toBe('alice');
    expect(context.credentials?.passwordHash).toBe('hash:secret-pass');
    expect(context.state).toEqual({ status: 'authenticated', userId: 'user-1' });
  });

  it('uses one generic error for an unknown username and a wrong password', async () => {
    const context = createService({ userId: 'user-1', username: 'Alice', normalizedUsername: 'alice', passwordHash: 'hash:right-pass' });

    await expect(context.service.loginWithPassword('nobody', 'wrong-pass')).rejects.toThrow('Invalid credentials');
    await expect(context.service.loginWithPassword('Alice', 'wrong-pass')).rejects.toThrow('Invalid credentials');
  });

  it('authenticates valid credentials and logout clears the session', async () => {
    const context = createService({ userId: 'user-1', username: 'Alice', normalizedUsername: 'alice', passwordHash: 'hash:right-pass' });
    await context.service.loginWithPassword('ALICE', 'right-pass');
    expect(context.state.status).toBe('authenticated');
    context.service.logout();
    expect(context.service.getAuthenticationState()).toEqual({ status: 'anonymous' });
  });

  it('starts anonymous when no authenticated session is in memory', () => {
    const context = createService({ userId: 'user-1', username: 'Alice', normalizedUsername: 'alice', passwordHash: 'hash:right-pass' });
    expect(context.service.getAuthenticationState()).toEqual({ status: 'anonymous' });
  });

  it('establishes a session only after device authentication succeeds', async () => {
    const context = createService({ userId: 'user-1', username: 'Alice', normalizedUsername: 'alice', passwordHash: 'hash:right-pass' });
    await context.service.unlockWithDevice();
    expect(context.service.getAuthenticationState()).toEqual({ status: 'authenticated', userId: 'user-1' });
  });

  it('does not establish a session when device authentication fails', async () => {
    const deviceFailure = new Error('Authentication cancelled');
    const context = createService({ userId: 'user-1', username: 'Alice', normalizedUsername: 'alice', passwordHash: 'hash:right-pass' }, { authenticate: async () => { throw deviceFailure; } });
    await expect(context.service.unlockWithDevice()).rejects.toBe(deviceFailure);
    expect(context.service.getAuthenticationState()).toEqual({ status: 'anonymous' });
  });

  it('rejects a second setup and weak passwords', async () => {
    const context = createService();
    await expect(context.service.setupCredentials('alice', 'short')).rejects.toThrow('Password must contain at least 8 characters');
    await context.service.setupCredentials('alice', 'long-enough');
    await expect(context.service.setupCredentials('bob', 'long-enough')).rejects.toThrow('Credentials already exist');
  });
});
