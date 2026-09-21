import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('legacy macro analytics publication compatibility', () => {
  it('keeps the V1 through V6 publication fixtures aligned with their protocol and schema versions', async () => {
    for (const version of [1, 2, 3, 4, 5, 6]) {
      const fixture = JSON.parse(await readFile(new URL(`../../../../contracts/macro-analytics/fixtures/publication-v${version}-valid.json`, import.meta.url), 'utf8'));

      expect(fixture.protocolVersion).toBe(version);
      expect(fixture.contribution.schemaVersion).toBe(version);
      expect(fixture.contribution).not.toHaveProperty('tagUsage');
    }
  });
});
