import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { serializeMacroAnalyticsPublicationV1 } from './MacroAnalyticsPublicationWireV1';
import { serializeMacroAnalyticsPublicationV2 } from './MacroAnalyticsPublicationWireV2';
import { serializeMacroAnalyticsPublicationV3 } from './MacroAnalyticsPublicationWireV3';
import { serializeMacroAnalyticsPublicationV4, toMacroAnalyticsPublicationWireV4 } from './MacroAnalyticsPublicationWireV4';

describe('MacroAnalyticsPublicationWireV4', () => {
  it('matches the exact V4 fixture bytes and rejects legacy serializers', async () => {
    const period = createAnalyticsPeriod('2026-09');
    const publication = createMacroAnalyticsPublication({
      contributorId: createAnalyticsContributorId('opaque-random-id'), period, revision: 1,
      contribution: {
        schemaVersion: 4, period,
        dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
        financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '10.00', count: 1 }] }] },
        categories: { currencies: [] }, recurring: { currencies: [] },
        sharing: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', fullAmount: '10.00', personalAmount: '6.00', participantAllocatedAmount: '4.00', settlementRequiredAmount: '4.00', movementCount: 1, participantCount: 2, settlementParticipantCount: 1 }] }] },
      },
    });
    const fixtureText = (await readFile(new URL('../../../../contracts/macro-analytics/fixtures/publication-v4-valid.json', import.meta.url), 'utf8')).trim();
    const fixture = JSON.parse(fixtureText);
    expect(toMacroAnalyticsPublicationWireV4(publication)).toEqual(fixture);
    expect(serializeMacroAnalyticsPublicationV4(publication)).toBe(JSON.stringify(fixture));
    expect(() => serializeMacroAnalyticsPublicationV1(publication)).toThrow('requires a V1 publication');
    expect(() => serializeMacroAnalyticsPublicationV2(publication)).toThrow('requires a V2 publication');
    expect(() => serializeMacroAnalyticsPublicationV3(publication)).toThrow('requires a V3 publication');
  });
});
