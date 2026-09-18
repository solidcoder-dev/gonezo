import { describe, expect, it } from 'vitest';
import { findStructureViolations } from '../../../scripts/check-src-structure.mjs';

describe('macro analytics structure', () => {
  it('registers domain, application, and infrastructure as its bounded-context layers', async () => {
    expect(await findStructureViolations()).toEqual([]);
  });
});
