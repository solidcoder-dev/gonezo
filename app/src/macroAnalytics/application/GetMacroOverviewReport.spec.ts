import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createCohort } from '../domain/cohort';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { ProcessedContribution } from './ProcessedContributionSourcePort';
import { CalculateContributorMetrics } from './CalculateContributorMetrics';
import { CalculateCohortMetrics } from './CalculateCohortMetrics';
import { contributorFinancialMetricCalculators } from './contributorFinancialMetrics';
import { cohortFinancialMetricCalculators } from './cohortFinancialMetrics';
import { GetMacroOverviewReport } from './GetMacroOverviewReport';

const period = createAnalyticsPeriod('2026-09');

function processed(contributorId: string, expense: string, income = '0', countryCode = 'ES'): ProcessedContribution {
  return {
    contributorId: createAnalyticsContributorId(contributorId),
    contribution: {
      schemaVersion: 1, period,
      dimensions: { countryCode, regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
      financial: { currencies: [{ currency: 'EUR', buckets: [
        { source: 'POSTED', kind: 'INCOME', amount: income, count: 1 },
        { source: 'POSTED', kind: 'EXPENSE', amount: expense, count: 1 },
        { source: 'EXPECTED', kind: 'EXPENSE', amount: '6', count: 1 },
        { source: 'SCHEDULED', kind: 'EXPENSE', amount: '8', count: 1 },
      ] }] },
    },
  };
}

describe('GetMacroOverviewReport', () => {
  it('composes processed contributions into a median report without exposing contributor identity', async () => {
    const rows = [processed('private-a', '2', '10'), processed('private-b', '6', '20'), processed('outside-cohort', '90', '0', 'FR')];
    const source = { list: async ({ cohort }: { cohort?: ReturnType<typeof createCohort> }) => rows.filter(({ contribution }) => !cohort || cohort.includes(contribution.dimensions)) };
    const report = await new GetMacroOverviewReport(
      source,
      new CalculateContributorMetrics(contributorFinancialMetricCalculators),
      new CalculateCohortMetrics(cohortFinancialMetricCalculators),
    ).execute({ period, currency: 'eur', cohort: createCohort({ countryCode: 'ES', regionCode: 'ES-CN' }) });

    expect(report).toMatchObject({ period, currency: 'EUR', contributorCount: 2 });
    expect(report.medianPostedExpense?.kind === 'MONEY' && report.medianPostedExpense.value.toString()).toBe('4');
    expect(report.medianPostedIncome?.kind === 'MONEY' && report.medianPostedIncome.value.toString()).toBe('15');
    expect(Object.keys(report)).not.toContain('contributorId');
    expect(JSON.stringify(report, (_key, value: unknown) => typeof value === 'bigint' ? value.toString() : value)).not.toContain('private-a');
  });
});
