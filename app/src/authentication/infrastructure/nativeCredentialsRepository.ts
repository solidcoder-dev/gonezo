import type { CredentialsRepository } from '../application/authenticationService';
import type { CredentialRecord } from '../domain/authentication.types';
import { AuthenticationNativePlugin } from './authenticationPlugin';

export class NativeCredentialsRepository implements CredentialsRepository {
  async read(): Promise<CredentialRecord | undefined> {
    const { value } = await AuthenticationNativePlugin.readCredentials();
    return value ? JSON.parse(value) as CredentialRecord : undefined;
  }

  async create(record: CredentialRecord): Promise<void> {
    await AuthenticationNativePlugin.saveCredentials({ value: JSON.stringify(record) });
  }
}
