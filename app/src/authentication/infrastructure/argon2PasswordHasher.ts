import { argon2id, argon2Verify } from 'hash-wasm';
import type { PasswordHasher } from '../application/authenticationService';

export class Argon2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return await argon2id({
      password,
      salt,
      iterations: 3,
      memorySize: 65536,
      hashLength: 32,
      parallelism: 1,
      outputType: 'encoded',
    });
  }

  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2Verify({ password, hash });
    } catch {
      return false;
    }
  }
}
