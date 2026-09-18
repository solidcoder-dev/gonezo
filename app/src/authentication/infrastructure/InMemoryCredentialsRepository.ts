import type { CredentialsRepository } from '../application/authenticationService';
import type { CredentialRecord } from '../domain/authentication.types';

export class InMemoryCredentialsRepository implements CredentialsRepository {
  private record: CredentialRecord | undefined;

  async read(): Promise<CredentialRecord | undefined> {
    return this.record;
  }

  async create(record: CredentialRecord): Promise<void> {
    this.record = record;
  }
}
