import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { serializeMacroAnalyticsPublicationV1 } from './MacroAnalyticsPublicationWireV1';
import { serializeMacroAnalyticsPublicationV2, toMacroAnalyticsPublicationWireV2 } from './MacroAnalyticsPublicationWireV2';

const period = createAnalyticsPeriod('2026-09');
const publication = createMacroAnalyticsPublication({
  contributorId: createAnalyticsContributorId('opaque-random-id'),
  period,
  revision: 4,
  contribution: {
    schemaVersion: 2,
    period,
    dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
    financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '12.00', count: 1 }] }] },
    categories: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', category: 'GROCERIES', amount: '12' }] }] },
  },
});

describe('MacroAnalyticsPublicationWireV2', () => {
  it('matches the shared V2 fixture bytes', async () => {
    const fixtureText = (await readFile(new URL('../../../../contracts/macro-analytics/fixtures/publication-v2-valid.json', import.meta.url), 'utf8')).trim();
    const fixture = JSON.parse(fixtureText);
    expect(publication.protocolVersion).toBe(2);
    expect(toMacroAnalyticsPublicationWireV2(publication)).toEqual(fixture);
    expect(serializeMacroAnalyticsPublicationV2(publication)).toBe(JSON.stringify(fixture));
  });

  it('does not let a V1 serializer silently discard categories', () => {
    expect(() => serializeMacroAnalyticsPublicationV1(publication)).toThrow('requires a V1 publication');
  });
});
