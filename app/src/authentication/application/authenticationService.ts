import type { AuthState, CredentialRecord } from '../domain/authentication.types';
import type { AuthenticationUseCases } from './authentication.port';

export type CredentialsRepository = {
  read(): Promise<CredentialRecord | undefined>;
  create(record: CredentialRecord): Promise<void>;
};

export type PasswordHasher = {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
};

export type SessionStore = {
  read(): Promise<AuthState>;
  establish(userId: string): Promise<void>;
  clear(): Promise<void>;
};

export type DeviceAuthenticator = {
  authenticate(): Promise<void>;
  isAvailable(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  enable(): Promise<void>;
  disable(): Promise<void>;
};

export type AuthenticationDelay = {
  wait(milliseconds: number): Promise<void>;
};

export type AuthenticationPorts = {
  credentials: CredentialsRepository;
  passwordHasher: PasswordHasher;
  sessions: SessionStore;
  deviceAuthenticator: DeviceAuthenticator;
  authenticationDelay: AuthenticationDelay;
  createUserId(): string;
};

export class AuthenticationService implements AuthenticationUseCases {
  private readonly ports: AuthenticationPorts;
  private failedPasswordAttempts = 0;

  constructor(ports: AuthenticationPorts) {
    this.ports = ports;
  }

  async setupCredentials(username: string, password: string): Promise<void> {
    if (!username.trim()) throw new Error('Username is required');
    if (password.length < 8) throw new Error('Password must contain at least 8 characters');
    if (await this.ports.credentials.read()) throw new Error('Credentials already exist');

    const userId = this.ports.createUserId();
    const record: CredentialRecord = {
      userId,
      username: username.trim(),
      normalizedUsername: username.trim().toLocaleLowerCase('en-US'),
      passwordHash: await this.ports.passwordHasher.hash(password),
    };
    await this.ports.credentials.create(record);
    await this.ports.sessions.establish(userId);
  }

  async loginWithPassword(username: string, password: string): Promise<void> {
    if (this.failedPasswordAttempts > 0) {
      await this.ports.authenticationDelay.wait(Math.min(this.failedPasswordAttempts, 5) * 250);
    }
    const record = await this.ports.credentials.read();
    const normalizedUsername = username.trim().toLocaleLowerCase('en-US');
    let passwordIsValid = false;
    try {
      passwordIsValid = record ? await this.ports.passwordHasher.verify(password, record.passwordHash) : false;
    } catch {
      passwordIsValid = false;
    }
    if (!record || record.normalizedUsername !== normalizedUsername || !passwordIsValid) {
      this.failedPasswordAttempts += 1;
      throw new Error('Invalid credentials');
    }
    this.failedPasswordAttempts = 0;
    await this.ports.sessions.establish(record.userId);
  }

  async unlockWithDevice(): Promise<void> {
    const record = await this.ports.credentials.read();
    if (!record) throw new Error('Invalid credentials');
    if (!(await this.ports.deviceAuthenticator.isEnabled())) throw new Error('Device unlock is not enabled');
    await this.ports.deviceAuthenticator.authenticate();
    await this.ports.sessions.establish(record.userId);
  }

  async enableDeviceUnlock(password: string): Promise<void> {
    if ((await this.getAuthenticationState()).status !== 'authenticated') throw new Error('Authenticate with your password first');
    const record = await this.ports.credentials.read();
    const passwordIsValid = record ? await this.ports.passwordHasher.verify(password, record.passwordHash) : false;
    if (!record || !passwordIsValid) throw new Error('Invalid credentials');
    if (!(await this.ports.deviceAuthenticator.isAvailable())) throw new Error('Device authentication is unavailable');
    await this.ports.deviceAuthenticator.enable();
  }

  async disableDeviceUnlock(): Promise<void> {
    if ((await this.getAuthenticationState()).status !== 'authenticated') throw new Error('Authenticate with your password first');
    await this.ports.deviceAuthenticator.disable();
  }

  isDeviceUnlockEnabled(): Promise<boolean> {
    return this.ports.deviceAuthenticator.isEnabled();
  }

  isDeviceUnlockAvailable(): Promise<boolean> {
    return this.ports.deviceAuthenticator.isAvailable();
  }

  async logout(): Promise<void> {
    await this.ports.sessions.clear();
  }

  async hasCredentials(): Promise<boolean> {
    return Boolean(await this.ports.credentials.read());
  }

  getAuthenticationState(): Promise<AuthState> {
    return this.ports.sessions.read();
  }
}
