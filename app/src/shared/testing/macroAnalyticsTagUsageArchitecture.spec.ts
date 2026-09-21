import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Macro Analytics tag usage boundary', () => {
  it('keeps Macro domain independent of Analytics and Taxonomy', () => {
    const fact = readFileSync(resolve('src/macroAnalytics/domain/tagUsageFact.ts'), 'utf8');

    expect(fact).not.toMatch(/from ['"].*analytics\//iu);
    expect(fact).not.toMatch(/from ['"].*taxonomy\//iu);
    expect(fact).not.toMatch(/tagId|displayName|normalizedName|tagName|tags:/iu);
  });

  it('allows the reduction adapter to depend only on the Analytics port', () => {
    const adapter = readFileSync(resolve('src/macroAnalytics/infrastructure/analyticsTagUsageFactAdapter.ts'), 'utf8');
    const analyticsImports = [...adapter.matchAll(/from ['"]([^'"]*analytics\/[^'"]*)['"]/gu)].map((match) => match[1]);

    expect(analyticsImports).toEqual(['../../analytics/application/analytics.port']);
  });
});
