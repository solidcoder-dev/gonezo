import { describe, expect, it } from 'vitest';
import { AuthenticationService, type AuthenticationPorts, type DeviceAuthenticator } from './authenticationService';
import type { AuthState, CredentialRecord } from '../domain/authentication.types';

function createService(existing?: CredentialRecord, deviceAuthenticator: DeviceAuthenticator = {
  authenticate: async () => undefined,
  isAvailable: async () => true,
  isEnabled: async () => true,
  enable: async () => undefined,
  disable: async () => undefined,
}) {
  let credentials = existing;
  let state: AuthState = { status: 'unauthenticated' };
  let passwordVerifications = 0;
  const passwordByHash = new Map<string, string>();
  if (existing) passwordByHash.set(existing.passwordHash, 'right-pass');
  const ports: AuthenticationPorts = {
    credentials: {
      read: async () => credentials,
      create: async (record) => { credentials = record; },
    },
    passwordHasher: {
      hash: async (password) => {
        const hash = `test-hash-${passwordByHash.size + 1}`;
        passwordByHash.set(hash, password);
        return hash;
      },
      verify: async (password, hash) => { passwordVerifications += 1; return passwordByHash.get(hash) === password; },
    },
    sessions: {
      read: async () => state,
      establish: async (userId) => { state = { status: 'authenticated', userId }; },
      clear: async () => { state = { status: 'unauthenticated' }; },
    },
    deviceAuthenticator,
    createUserId: () => 'user-1',
  };
  return {
    service: new AuthenticationService(ports),
    get credentials() { return credentials; },
    get state() { return state; },
    get passwordVerifications() { return passwordVerifications; },
  };
}

describe('AuthenticationService', () => {
  it('creates credentials and authenticates the first local user', async () => {
    const context = createService();
    const existingGonezoData = { accounts: ['existing-account'], movements: ['existing-movement'] };
    const existingGonezoDataBefore = structuredClone(existingGonezoData);
    await context.service.setupCredentials(' Alice ', 'secret-pass');

    expect(context.credentials?.normalizedUsername).toBe('alice');
    expect(context.credentials?.passwordHash).toBe('test-hash-1');
    expect(JSON.stringify(context.credentials)).not.toContain('secret-pass');
    expect(context.state).toEqual({ status: 'authenticated', userId: 'user-1' });
    expect(existingGonezoData).toEqual(existingGonezoDataBefore);
    expect(JSON.stringify(context.state)).not.toContain('secret-pass');
  });

  it('uses one generic error for an unknown username and a wrong password', async () => {
    const context = createService({ userId: 'user-1', username: 'Alice', normalizedUsername: 'alice', passwordHash: 'hash:right-pass' });

    await expect(context.service.loginWithPassword('nobody', 'wrong-pass')).rejects.toThrow('Invalid credentials');
    await expect(context.service.loginWithPassword('Alice', 'wrong-pass')).rejects.toThrow('Invalid credentials');
    expect(context.passwordVerifications).toBe(2);
  });

  it('authenticates valid credentials and logout clears the session', async () => {
    const context = createService({ userId: 'user-1', username: 'Alice', normalizedUsername: 'alice', passwordHash: 'hash:right-pass' });
    await context.service.loginWithPassword('ALICE', 'right-pass');
    expect(context.state.status).toBe('authenticated');
    await context.service.logout();
    await expect(context.service.getAuthenticationState()).resolves.toEqual({ status: 'unauthenticated' });
    await context.service.loginWithPassword('alice', 'right-pass');
    await expect(context.service.getAuthenticationState()).resolves.toEqual({ status: 'authenticated', userId: 'user-1' });
  });

  it('starts unauthenticated when no session exists', async () => {
    const context = createService({ userId: 'user-1', username: 'Alice', normalizedUsername: 'alice', passwordHash: 'hash:right-pass' });
    await expect(context.service.getAuthenticationState()).resolves.toEqual({ status: 'unauthenticated' });
  });

  it('establishes a session only after device authentication succeeds', async () => {
    const context = createService({ userId: 'user-1', username: 'Alice', normalizedUsername: 'alice', passwordHash: 'hash:right-pass' });
    await context.service.unlockWithDevice();
    await expect(context.service.getAuthenticationState()).resolves.toEqual({ status: 'authenticated', userId: 'user-1' });
  });

  it('does not establish a session when device authentication fails', async () => {
    const deviceFailure = new Error('Authentication cancelled');
    const context = createService({ userId: 'user-1', username: 'Alice', normalizedUsername: 'alice', passwordHash: 'hash:right-pass' }, {
      authenticate: async () => { throw deviceFailure; },
      isAvailable: async () => true,
      isEnabled: async () => true,
      enable: async () => undefined,
      disable: async () => undefined,
    });
    await expect(context.service.unlockWithDevice()).rejects.toBe(deviceFailure);
    await expect(context.service.getAuthenticationState()).resolves.toEqual({ status: 'unauthenticated' });
  });

  it('requires an authenticated session and available device auth before enabling unlock', async () => {
    const unavailable: DeviceAuthenticator = {
      authenticate: async () => undefined,
      isAvailable: async () => false,
      isEnabled: async () => false,
      enable: async () => undefined,
      disable: async () => undefined,
    };
    const context = createService({ userId: 'user-1', username: 'Alice', normalizedUsername: 'alice', passwordHash: 'hash:right-pass' }, unavailable);
    await expect(context.service.enableDeviceUnlock()).rejects.toThrow('Authenticate with your password first');
    await context.service.loginWithPassword('alice', 'right-pass');
    await expect(context.service.enableDeviceUnlock()).rejects.toThrow('Device authentication is unavailable');
  });

  it('enables and disables device unlock only from an authenticated session', async () => {
    let enabled = false;
    const authenticator: DeviceAuthenticator = {
      authenticate: async () => undefined,
      isAvailable: async () => true,
      isEnabled: async () => enabled,
      enable: async () => { enabled = true; },
      disable: async () => { enabled = false; },
    };
    const context = createService({ userId: 'user-1', username: 'Alice', normalizedUsername: 'alice', passwordHash: 'hash:right-pass' }, authenticator);
    await context.service.loginWithPassword('alice', 'right-pass');
    await context.service.enableDeviceUnlock();
    expect(await context.service.isDeviceUnlockEnabled()).toBe(true);
    await context.service.logout();
    await expect(context.service.disableDeviceUnlock()).rejects.toThrow('Authenticate with your password first');
    await context.service.loginWithPassword('alice', 'right-pass');
    await context.service.disableDeviceUnlock();
    expect(await context.service.isDeviceUnlockEnabled()).toBe(false);
  });

  it('rejects a second setup and weak passwords', async () => {
    const context = createService();
    await expect(context.service.setupCredentials(' ', 'long-enough')).rejects.toThrow('Username is required');
    await expect(context.service.setupCredentials('alice', 'short')).rejects.toThrow('Password must contain at least 8 characters');
    await context.service.setupCredentials('alice', 'long-enough');
    await expect(context.service.setupCredentials('bob', 'long-enough')).rejects.toThrow('Credentials already exist');
  });
});
