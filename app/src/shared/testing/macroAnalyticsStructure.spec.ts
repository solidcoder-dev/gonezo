import { findStructureViolations } from '../../../scripts/check-src-structure.mjs';
import { describe, expect, it } from 'vitest';

describe('macro analytics structure', () => {
  it('registers domain and application as its bounded-context layers', async () => {
    expect(await findStructureViolations()).toEqual([]);
  });
});
