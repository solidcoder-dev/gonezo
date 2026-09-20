import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const domainFiles = [
  '../../macroAnalytics/domain/categoryContribution.ts',
  '../../macroAnalytics/domain/contributorCategoryBreakdown.ts',
  '../../macroAnalytics/domain/cohortCategoryBreakdown.ts',
];

describe('macro analytics category boundaries', () => {
  it('keeps category aggregation in the domain and independent from infrastructure and scalar metric IDs', async () => {
    const sources = await Promise.all(domainFiles.map((path) => readFile(new URL(path, import.meta.url), 'utf8')));
    for (const source of sources) {
      expect(source).not.toMatch(/from ['"].*(?:application|infrastructure|sqlite|capacitor|react)/i);
      expect(source).not.toMatch(/MetricId|MetricKey|analyticsMetric/);
    }
  });
});
