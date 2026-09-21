import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { serializeMacroAnalyticsPublicationV4 } from './MacroAnalyticsPublicationWireV4';
import { serializeMacroAnalyticsPublicationV5, toMacroAnalyticsPublicationWireV5 } from './MacroAnalyticsPublicationWireV5';

describe('MacroAnalyticsPublicationWireV5', () => {
  it('matches the V5 fixture bytes and rejects the V4 serializer', async () => {
    const period = createAnalyticsPeriod('2026-09');
    const publication = createMacroAnalyticsPublication({
      contributorId: createAnalyticsContributorId('opaque-random-id'), period, revision: 1,
      contribution: {
        schemaVersion: 5, period, dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
        financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '10.00', count: 1 }] }] },
        categories: { currencies: [] }, recurring: { currencies: [] },
        sharing: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', fullAmount: '10.00', personalAmount: '6.00', participantAllocatedAmount: '4.00', settlementRequiredAmount: '4.00', movementCount: 1, participantCount: 2, settlementParticipantCount: 1 }] }] },
        merchants: { catalogVersion: 1, currencies: [{ currency: 'EUR', buckets: [
          { source: 'POSTED', kind: 'EXPENSE', merchant: 'MERCADONA' as never, amount: '4', movementCount: 1 },
          { source: 'POSTED', kind: 'EXPENSE', merchant: 'UNMAPPED' as never, amount: '2', movementCount: 1 },
        ] }] },
      },
    });
    const fixture = JSON.parse((await readFile(new URL('../../../../contracts/macro-analytics/fixtures/publication-v5-valid.json', import.meta.url), 'utf8')));
    expect(toMacroAnalyticsPublicationWireV5(publication)).toEqual(fixture);
    expect(serializeMacroAnalyticsPublicationV5(publication)).toBe(JSON.stringify(fixture));
    expect(serializeMacroAnalyticsPublicationV5(publication)).not.toMatch(/merchantKey|displayName|alias/i);
    expect(() => serializeMacroAnalyticsPublicationV4(publication)).toThrow('requires a V4 publication');
  });
});
