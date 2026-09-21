import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { toMacroAnalyticsPublicationWireV7, serializeMacroAnalyticsPublicationV7 } from './MacroAnalyticsPublicationWireV7';
import { serializeMacroAnalyticsPublicationV6 } from './MacroAnalyticsPublicationWireV6';

describe('MacroAnalyticsPublicationWireV7', () => {
  it('matches the V7 fixture, canonicalizes tag usage, and exposes no tag identity', async () => {
    const period = createAnalyticsPeriod('2026-09');
    const publication = createMacroAnalyticsPublication({ contributorId: createAnalyticsContributorId('opaque-random-id'), period, revision: 1, contribution: {
      schemaVersion: 7, period, dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
      financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '100', count: 1 }] }] },
      categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] },
      merchants: { catalogVersion: 1, currencies: [] }, balances: { currencies: [] },
      tagUsage: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '100', movementCount: 1, taggedAmount: '50', taggedMovementCount: 1 }] }] },
    } });
    const fixture = JSON.parse(await readFile(new URL('../../../../contracts/macro-analytics/fixtures/publication-v7-valid.json', import.meta.url), 'utf8'));

    expect(toMacroAnalyticsPublicationWireV7(publication)).toEqual(fixture);
    expect(serializeMacroAnalyticsPublicationV7(publication)).toBe(JSON.stringify(fixture));
    expect(serializeMacroAnalyticsPublicationV7(publication)).not.toMatch(/tagId|tagKey|tagName|displayName|normalizedName|hash/i);
    expect(() => serializeMacroAnalyticsPublicationV6(publication)).toThrow('requires a V6 publication');
  });
});
