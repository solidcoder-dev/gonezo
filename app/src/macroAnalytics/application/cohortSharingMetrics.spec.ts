import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createCohort } from '../domain/cohort';
import { CalculateContributorMetrics } from './CalculateContributorMetrics';
import { CalculateCohortMetrics } from './CalculateCohortMetrics';
import { contributorSharingMetricCalculators, contributorSharingMetricDefinitions } from './contributorSharingMetrics';
import { contributorFinancialMetricCalculators, postedExpenseTotal } from './contributorFinancialMetrics';
import { cohortSharingMetricCalculators, cohortSharingMetricDefinitions } from './cohortSharingMetrics';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import type { ContributorMetricWithDimensions } from './CalculateCohortMetrics';

const period = createAnalyticsPeriod('2026-09');
const dimensions = { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const };

function contribution(version: 3 | 4, amount = '0', sharing = true): MacroAnalyticsContribution {
  const financial = { currencies: [{ currency: 'EUR', buckets: [{ source: 'POSTED' as const, kind: 'EXPENSE' as const, amount: '20', count: 1 }] }] };
  const categories = { currencies: [] };
  if (version === 3) return { schemaVersion: 3, period, dimensions, financial, categories, recurring: { currencies: [] } };
  return {
    schemaVersion: 4, period, dimensions, financial, categories, recurring: { currencies: [] },
    sharing: { currencies: sharing ? [{ currency: 'EUR', buckets: [{ source: 'POSTED', kind: 'EXPENSE', fullAmount: '20', personalAmount: amount, participantAllocatedAmount: String(20 - Number(amount)), settlementRequiredAmount: String(20 - Number(amount)), movementCount: 1, participantCount: 1, settlementParticipantCount: 1 }] }] : [] },
  };
}

function contributorRows(contributions: readonly MacroAnalyticsContribution[]): ContributorMetricWithDimensions[] {
  const calculator = new CalculateContributorMetrics([...contributorFinancialMetricCalculators, ...contributorSharingMetricCalculators]);
  return contributions.flatMap((entry, index) => calculator.execute({
    contributorId: createAnalyticsContributorId(`contributor-${index}`), contribution: entry, currency: 'EUR',
    metricIds: [postedExpenseTotal.id, ...Object.values(contributorSharingMetricDefinitions).map(({ id }) => id)],
  }).map((result) => ({ result, dimensions: entry.dimensions, contribution: entry })));
}

describe('cohort sharing metrics', () => {
  it('includes zero-sharing V4 contributors, excludes legacy schemas, and isolates selected currency', () => {
    const calculator = new CalculateCohortMetrics(cohortSharingMetricCalculators);
    const cohort = createCohort();
    const contributions = [contribution(4, '4'), contribution(4, '8'), contribution(4, '0', false), contribution(3)];
    const result = calculator.execute({ period, cohort, currency: 'EUR', metricIds: Object.values(cohortSharingMetricDefinitions).map(({ id }) => id) }, contributorRows(contributions));
    const byId = new Map(result.map(({ definition, value, contributorCount }) => [definition.id.toString(), { value, contributorCount }]));
    expect(byId.get('median_shared_posted_personal_expense:v1')?.value.value.toString()).toBe('4');
    expect(byId.get('median_shared_posted_personal_expense:v1')?.contributorCount).toBe(3);
    expect(byId.get('shared_posted_expense_contributor_percent:v1')).toMatchObject({ contributorCount: 3, value: { kind: 'RATIO' } });
    expect(byId.get('shared_posted_expense_contributor_percent:v1')?.value.value.toString()).toBe('66.67');

    const wrongCurrency = calculator.execute({ period, cohort, currency: 'USD', metricIds: [cohortSharingMetricDefinitions.sharedPostedExpenseContributorPercent.id] }, contributorRows(contributions));
    expect(wrongCurrency).toEqual([]);
  });
});
