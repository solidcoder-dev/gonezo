import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('macro analytics structure', () => {
  it('registers domain and application as its bounded-context layers', async () => {
    expect(() => execFileSync('node', [resolve(import.meta.dirname, '../../../scripts/check-src-structure.mjs')])).not.toThrow();
  });
});
