import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { toMacroAnalyticsPublicationWireV1 } from './MacroAnalyticsPublicationWireV1';

describe('MacroAnalyticsPublicationWireV1', () => {
  it('serializes a publication into the shared V1 fixture without local identity or facts', async () => {
    const publication = createMacroAnalyticsPublication({
      contributorId: createAnalyticsContributorId('opaque-random-id'),
      period: createAnalyticsPeriod('2026-09'),
      revision: 3,
      contribution: {
        schemaVersion: 1,
        period: createAnalyticsPeriod('2026-09'),
        dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
        financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '12.00', count: 1 }] }] },
      },
    });
    const fixture = JSON.parse(await readFile(new URL('../../../../contracts/macro-analytics/fixtures/publication-v1-valid.json', import.meta.url), 'utf8'));
    const wire = toMacroAnalyticsPublicationWireV1(publication);

    expect(wire).toEqual(fixture);
    expect(JSON.stringify(wire)).not.toMatch(/userId|username|email|birthYear|movementId|accountId|occurredAt|private-fact-id/);
  });
});
