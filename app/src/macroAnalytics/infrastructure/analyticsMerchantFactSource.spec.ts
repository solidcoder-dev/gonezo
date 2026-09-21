import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createMacroMerchantCode } from '../domain/macroMerchantCode';
import { createAnalyticsMerchantFactSource } from './analyticsMerchantFactSource';

describe('Analytics MerchantFact source', () => {
  it('queries Analytics with the period and returns its selected posted merchant fact', async () => {
    const analyticsListMovementFacts = vi.fn(async () => ({ items: [{
      analyticsFactId: 'posted/occurrence-1',
      reference: { source: 'posted' as const, transactionId: 'transaction' },
      source: 'POSTED' as const,
      effectiveAt: '2026-09-18T10:30:00Z',
      accountId: 'account',
      type: 'expense' as const,
      currency: 'EUR',
      personalAmount: '80.00',
      fullAmount: '100.00',
      ignored: false,
      categoryAllocations: [],
      tagIds: [],
      tags: [],
      merchant: { key: 'mercadona', displayName: 'Mercadona' },
    }] }));
    const source = createAnalyticsMerchantFactSource({ analyticsListMovementFacts }, {
      resolve: () => createMacroMerchantCode('MERCADONA'),
    });

    const facts = await source.listMerchantFacts({
      period: createAnalyticsPeriod('2026-09'),
      timeZone: 'Europe/Madrid',
      currency: 'EUR',
    });

    expect(analyticsListMovementFacts).toHaveBeenCalledWith({
      fromLocalDate: '2026-09-01',
      toLocalDate: '2026-09-30',
      zoneId: 'Europe/Madrid',
      currency: 'EUR',
      includePlannedMovements: true,
      includeIgnoredMovements: false,
    });
    expect(facts).toMatchObject([{ id: 'posted/occurrence-1/merchant', source: 'POSTED', merchant: 'MERCADONA', amount: '80.00' }]);
  });
});
