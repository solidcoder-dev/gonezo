import { ANONYMOUS, type AuthState, type CredentialRecord } from '../domain/authentication.types';

export type CredentialsRepository = {
  read(): Promise<CredentialRecord | undefined>;
  create(record: CredentialRecord): Promise<void>;
};

export type PasswordHasher = {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
};

export type SessionStore = {
  read(): AuthState;
  establish(userId: string): void;
  clear(): void;
};

export type DeviceAuthenticator = {
  authenticate(): Promise<void>;
};

export type AuthenticationPorts = {
  credentials: CredentialsRepository;
  passwordHasher: PasswordHasher;
  sessions: SessionStore;
  deviceAuthenticator: DeviceAuthenticator;
  createUserId(): string;
};

export class AuthenticationService {
  private readonly ports: AuthenticationPorts;

  constructor(ports: AuthenticationPorts) {
    this.ports = ports;
  }

  async setupCredentials(username: string, password: string): Promise<void> {
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
    this.ports.sessions.establish(userId);
  }

  async loginWithPassword(username: string, password: string): Promise<void> {
    const record = await this.ports.credentials.read();
    const normalizedUsername = username.trim().toLocaleLowerCase('en-US');
    if (!record || record.normalizedUsername !== normalizedUsername || !(await this.ports.passwordHasher.verify(password, record.passwordHash))) {
      throw new Error('Invalid credentials');
    }
    this.ports.sessions.establish(record.userId);
  }

  async unlockWithDevice(): Promise<void> {
    const record = await this.ports.credentials.read();
    if (!record) throw new Error('Invalid credentials');
    await this.ports.deviceAuthenticator.authenticate();
    this.ports.sessions.establish(record.userId);
  }

  logout(): void {
    this.ports.sessions.clear();
  }

  async hasCredentials(): Promise<boolean> {
    return Boolean(await this.ports.credentials.read());
  }

  getAuthenticationState(): AuthState {
    return this.ports.sessions.read() ?? ANONYMOUS;
  }
}
