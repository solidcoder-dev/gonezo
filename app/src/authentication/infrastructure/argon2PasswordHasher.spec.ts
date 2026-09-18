import { describe, expect, it } from 'vitest';
import { Argon2PasswordHasher } from './argon2PasswordHasher';

describe('Argon2PasswordHasher', () => {
  it('stores a salted Argon2id hash and verifies only its password', async () => {
    const hasher = new Argon2PasswordHasher();
    const firstHash = await hasher.hash('correct horse battery staple');
    const secondHash = await hasher.hash('correct horse battery staple');

    expect(firstHash).toMatch(/^\$argon2id\$/);
    expect(firstHash).not.toContain('correct horse battery staple');
    expect(secondHash).not.toBe(firstHash);
    await expect(hasher.verify('correct horse battery staple', firstHash)).resolves.toBe(true);
    await expect(hasher.verify('wrong password', firstHash)).resolves.toBe(false);
  });
});
