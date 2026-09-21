import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createCohort } from '../domain/cohort';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { GetMacroMerchantReport } from './GetMacroMerchantReport';

describe('GetMacroMerchantReport', () => {
  it('composes processed V5 contributions into a report without merchant labels', async () => {
    const period = createAnalyticsPeriod('2026-09');
    const contribution: MacroAnalyticsContribution = {
      schemaVersion: 5, period,
      dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
      financial: { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '20', count: 1 }] }] },
      categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] },
      merchants: { catalogVersion: 1, currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', merchant: 'MERCADONA' as never, amount: '15', movementCount: 1 }] }] },
    };
    const source = { list: vi.fn(async () => [{ contributorId: createAnalyticsContributorId('opaque'), contribution }]) };
    const result = await new GetMacroMerchantReport(source).execute({ period, currency: 'EUR', cohort: createCohort() });
    expect(result).toMatchObject({ period, currency: 'EUR', eligibleContributorCount: 1, catalogVersion: 1, merchantCoveragePercent: '75', postedExpenseMerchants: [{ merchant: 'MERCADONA', totalAmount: '15', medianAmount: '15', movementCount: 1, activeContributorCount: 1, shareOfPostedExpensePercent: '75' }] });
    expect(JSON.stringify(result)).not.toMatch(/displayName|alias|merchantKey/);
  });
});
