import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createCohort } from '../domain/cohort';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { CalculateContributorMetrics } from './CalculateContributorMetrics';
import { CalculateCohortMetrics } from './CalculateCohortMetrics';
import { contributorTagUsageMetricCalculators, contributorTagUsageMetricDefinitions } from './contributorTagUsageMetrics';
import { cohortTagUsageMetricCalculators } from './cohortTagUsageMetrics';
import { GetMacroTagUsageReport } from './GetMacroTagUsageReport';

const period = createAnalyticsPeriod('2026-09');
const dimensions = { countryCode: 'GB', regionCode: 'GB-ENG', sex: 'FEMALE' as const, ageBand: '25_34' as const };

function contribution(amount: string, taggedAmount: string, movementCount: number, taggedMovementCount: number, currency = 'GBP'): MacroAnalyticsContribution {
  return {
    schemaVersion: 7, period, dimensions,
    financial: { currencies: [] }, categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] },
    merchants: { catalogVersion: 1, currencies: [] }, balances: { currencies: [] },
    tagUsage: { currencies: [{ currency, buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount, movementCount, taggedAmount, taggedMovementCount }] }] },
  };
}

describe('GetMacroTagUsageReport', () => {
  it('composes eligible V7 contributors, keeps currency boundaries, and excludes legacy publications', async () => {
    const processed = [
      { contributorId: createAnalyticsContributorId('one'), contribution: contribution('100', '50', 2, 1) },
      { contributorId: createAnalyticsContributorId('two'), contribution: contribution('100', '0', 1, 0) },
      { contributorId: createAnalyticsContributorId('foreign-currency'), contribution: contribution('100', '100', 1, 1, 'EUR') },
      { contributorId: createAnalyticsContributorId('legacy'), contribution: {
        schemaVersion: 6, period, dimensions, financial: { currencies: [] }, categories: { currencies: [] }, recurring: { currencies: [] },
        sharing: { currencies: [] }, merchants: { catalogVersion: 1, currencies: [] }, balances: { currencies: [] },
      } as MacroAnalyticsContribution },
    ];
    const report = await new GetMacroTagUsageReport(
      { list: async () => processed },
      new CalculateContributorMetrics(contributorTagUsageMetricCalculators),
      new CalculateCohortMetrics(cohortTagUsageMetricCalculators),
    ).execute({ period, currency: 'gbp', cohort: createCohort({ countryCode: 'GB', regionCode: 'GB-ENG' }) });

    expect(report).toMatchObject({
      currency: 'GBP', eligibleContributorCount: 2,
      medianTaggedPostedExpense: { kind: 'MONEY', currency: 'GBP' },
      medianTaggedPostedExpenseSharePercent: { kind: 'RATIO' },
      medianTaggedPostedExpenseMovementPercent: { kind: 'RATIO' },
      taggedPostedExpenseContributorPercent: { kind: 'RATIO' },
    });
    expect(report.medianTaggedPostedExpense?.kind === 'MONEY' && report.medianTaggedPostedExpense.value.toString()).toBe('25');
    expect(report.medianTaggedPostedExpenseSharePercent?.kind === 'RATIO' && report.medianTaggedPostedExpenseSharePercent.value.toString()).toBe('25');
    expect(report.medianTaggedPostedExpenseMovementPercent?.kind === 'RATIO' && report.medianTaggedPostedExpenseMovementPercent.value.toString()).toBe('25');
    expect(report.taggedPostedExpenseContributorPercent?.kind === 'RATIO' && report.taggedPostedExpenseContributorPercent.value.toString()).toBe('50');
  });

  it('returns null metrics and zero eligible count when no contributor has the selected currency bucket', async () => {
    const report = await new GetMacroTagUsageReport(
      { list: async () => [{ contributorId: createAnalyticsContributorId('one'), contribution: contribution('10', '10', 1, 1, 'EUR') }] },
      new CalculateContributorMetrics(contributorTagUsageMetricCalculators),
      new CalculateCohortMetrics(cohortTagUsageMetricCalculators),
    ).execute({ period, currency: 'GBP', cohort: createCohort({ countryCode: 'GB', regionCode: 'GB-ENG' }) });

    expect(report.eligibleContributorCount).toBe(0);
    expect(report.medianTaggedPostedExpense).toBeNull();
    expect(report.taggedPostedExpenseContributorPercent).toBeNull();
  });

  it('counts a tagged zero-personal movement in movement usage while leaving spend share undefined', async () => {
    const contributor = createAnalyticsContributorId('zero-personal');
    const result = new CalculateContributorMetrics(contributorTagUsageMetricCalculators).execute({
      contributorId: contributor,
      contribution: contribution('0', '0', 1, 1),
      currency: 'GBP',
      metricIds: Object.values(contributorTagUsageMetricDefinitions).map(({ id }) => id),
    });

    const movement = result.find(({ definition }) => definition.id.toString() === 'tagged_posted_expense_movement_percent:v1')?.value;
    expect(movement?.kind === 'RATIO' && movement.value.toString()).toBe('100');
    expect(result.find(({ definition }) => definition.id.toString() === 'tagged_posted_expense_share_percent:v1')).toBeUndefined();
  });
});
