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

function processed(contributorId: string, expense: string, income = '0', countryCode = 'ES', schemaVersion: 1 | 2 = 1): ProcessedContribution {
  const base = {
    period,
    dimensions: { countryCode, regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const },
    financial: { currencies: [{ currency: 'EUR', buckets: [
      { source: 'POSTED' as const, kind: 'INCOME' as const, amount: income, count: 1 },
      { source: 'POSTED' as const, kind: 'EXPENSE' as const, amount: expense, count: 1 },
      { source: 'EXPECTED' as const, kind: 'EXPENSE' as const, amount: '6', count: 1 },
      { source: 'SCHEDULED' as const, kind: 'EXPENSE' as const, amount: '8', count: 1 },
    ] }] },
  };
  return {
    contributorId: createAnalyticsContributorId(contributorId),
    contribution: schemaVersion === 1 ? { ...base, schemaVersion: 1 } : { ...base, schemaVersion: 2, categories: { currencies: [] } },
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

  it('returns the same financial overview for V1 and V2 processed contributions', async () => {
    const report = (version: 1 | 2) => new GetMacroOverviewReport(
      { list: async () => [processed('private-a', '2', '10', 'ES', version), processed('private-b', '6', '20', 'ES', version)] },
      new CalculateContributorMetrics(contributorFinancialMetricCalculators),
      new CalculateCohortMetrics(cohortFinancialMetricCalculators),
    ).execute({ period, currency: 'EUR', cohort: createCohort({ countryCode: 'ES' }) });
    const [v1, v2] = await Promise.all([report(1), report(2)]);
    const financialValues = (value: Awaited<ReturnType<typeof report>>) => ({
      contributorCount: value.contributorCount,
      medianPostedIncome: value.medianPostedIncome?.kind === 'MONEY' ? value.medianPostedIncome.value.toString() : null,
      medianPostedExpense: value.medianPostedExpense?.kind === 'MONEY' ? value.medianPostedExpense.value.toString() : null,
      medianExpectedExpense: value.medianExpectedExpense?.kind === 'MONEY' ? value.medianExpectedExpense.value.toString() : null,
      medianScheduledExpense: value.medianScheduledExpense?.kind === 'MONEY' ? value.medianScheduledExpense.value.toString() : null,
    });
    expect(financialValues(v2)).toEqual(financialValues(v1));
  });
});
