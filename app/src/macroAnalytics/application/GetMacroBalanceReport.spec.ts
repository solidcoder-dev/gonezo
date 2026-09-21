import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createCohort } from '../domain/cohort';
import { GetMacroBalanceReport } from './GetMacroBalanceReport';

describe('GetMacroBalanceReport', () => {
  it('composes eligible stock metrics and account type breakdown without financial currency activity', async () => {
    const period = createAnalyticsPeriod('2026-09');
    const cohort = createCohort({ countryCode: 'ES', sex: 'FEMALE', ageBand: '25_34' });
    const report = await new GetMacroBalanceReport({ list: async () => [{
      contributorId: createAnalyticsContributorId('opaque-id'),
      contribution: {
        schemaVersion: 6, period, dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' }, financial: { currencies: [] },
        categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] }, merchants: { catalogVersion: 1, currencies: [] },
        balances: { currencies: [{ currency: 'EUR', buckets: [{ accountType: 'BANK', balanceAmount: '-12.50', accountCount: 1 }, { accountType: 'CASH', balanceAmount: '0', accountCount: 1 }] }] },
      },
    }] }).execute({ period, currency: 'eur', cohort });
    expect(report.eligibleContributorCount).toBe(1);
    expect(report.medianPeriodEndAccountBalance?.kind === 'MONEY' && report.medianPeriodEndAccountBalance.value.toString()).toBe('-12.5');
    expect(report.totalAccountCount).toEqual({ kind: 'COUNT', value: 2 });
    expect(report.accountTypes.map(({ accountType }) => accountType)).toEqual(['BANK', 'CASH']);
  });
});
