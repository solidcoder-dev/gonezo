import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import { serializeMacroAnalyticsPublicationV1 } from './MacroAnalyticsPublicationWireV1';
import { serializeMacroAnalyticsPublicationV5 } from './MacroAnalyticsPublicationWireV5';
import { serializeMacroAnalyticsPublicationV6, toMacroAnalyticsPublicationWireV6 } from './MacroAnalyticsPublicationWireV6';

describe('MacroAnalyticsPublicationWireV6', () => {
  it('matches the V6 fixture and sorts balance account types canonically', async () => {
    const period = createAnalyticsPeriod('2026-09');
    const publication = createMacroAnalyticsPublication({
      contributorId: createAnalyticsContributorId('opaque-random-id'), period, revision: 1,
      contribution: {
        schemaVersion: 6, period, dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
        financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '10.00', count: 1 }] }] },
        categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', fullAmount: '10.00', personalAmount: '6.00', participantAllocatedAmount: '4.00', settlementRequiredAmount: '4.00', movementCount: 1, participantCount: 2, settlementParticipantCount: 1 }] }] },
        merchants: { catalogVersion: 1, currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', merchant: 'MERCADONA' as never, amount: '4', movementCount: 1 }, { source: 'POSTED', kind: 'EXPENSE', merchant: 'UNMAPPED' as never, amount: '2', movementCount: 1 }] }] },
        balances: { currencies: [{ currency: 'EUR', buckets: [{ accountType: 'BANK', balanceAmount: '-250.50', accountCount: 1 }] }] },
      },
    });
    const fixture = JSON.parse(await readFile(new URL('../../../../contracts/macro-analytics/fixtures/publication-v6-valid.json', import.meta.url), 'utf8'));
    expect(toMacroAnalyticsPublicationWireV6(publication)).toEqual(fixture);
    expect(serializeMacroAnalyticsPublicationV6(publication)).toBe(JSON.stringify(fixture));
    expect(serializeMacroAnalyticsPublicationV6(publication)).not.toMatch(/accountId|accountName|default|status|transactionId/i);
    expect(serializeMacroAnalyticsPublicationV6(publication)).not.toMatch(/tagId|tagName|displayName|normalizedTag|name:|tag:/i);
    expect(() => serializeMacroAnalyticsPublicationV1(publication)).toThrow('requires a V1 publication');
    expect(() => serializeMacroAnalyticsPublicationV5(publication)).toThrow('requires a V5 publication');
  });
});
