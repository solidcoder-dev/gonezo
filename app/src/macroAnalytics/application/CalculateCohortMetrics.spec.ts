import { describe, expect, it } from 'vitest';
import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { moneyMetricValue } from '../../shared/domain/analyticsMetric';
import { countMetricValue, createMetricDefinition, MetricId, MetricKey, MetricVersion } from '../../shared/domain/analyticsMetric';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createCohort } from '../domain/cohort';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { ContributorMetricResult } from '../domain/contributorMetric';
import { CalculateCohortMetrics } from './CalculateCohortMetrics';
import { cohortFinancialMetricCalculators, medianPostedExpense } from './cohortFinancialMetrics';
import { postedExpenseTotal } from './contributorFinancialMetrics';

const period = createAnalyticsPeriod('2026-09');
const dimensions = { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const };

function contributor(id: string, amount: string, currency = 'EUR', dimensionOverrides = {}) {
  const result: ContributorMetricResult = {
    contributorId: createAnalyticsContributorId(id), period,
    definition: postedExpenseTotal,
    value: moneyMetricValue(ExactDecimal.from(amount), currency),
  };
  return { result, dimensions: { ...dimensions, ...dimensionOverrides } };
}

describe('CalculateCohortMetrics', () => {
  const calculate = new CalculateCohortMetrics(cohortFinancialMetricCalculators);

  it('calculates exact even medians from eligible matching contributors only', () => {
    const results = calculate.execute({ period, cohort: createCohort({ countryCode: 'ES' }), currency: 'EUR', metricIds: [medianPostedExpense.id] }, [
      contributor('one', '0'), contributor('two', '3'), contributor('outside', '100', 'EUR', { countryCode: 'FR' }), contributor('other-currency', '100', 'GBP'),
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].value.kind === 'MONEY' && results[0].value.value.toString()).toBe('1.5');
    expect(results[0].contributorCount).toBe(2);
  });

  it('returns no result for an empty eligible cohort', () => {
    expect(calculate.execute({ period, cohort: createCohort(), currency: 'EUR', metricIds: [medianPostedExpense.id] }, [])).toEqual([]);
  });

  it('handles a single contributor and odd cohorts containing negative and zero values', () => {
    const request = { period, cohort: createCohort(), currency: 'EUR', metricIds: [medianPostedExpense.id] };
    const [single] = calculate.execute(request, [contributor('single', '-5')]);
    expect(single.value.kind === 'MONEY' && single.value.value.toString()).toBe('-5');
    expect(single.contributorCount).toBe(1);

    const [odd] = calculate.execute(request, [contributor('negative', '-3'), contributor('zero', '0'), contributor('positive', '9')]);
    expect(odd.value.kind === 'MONEY' && odd.value.value.toString()).toBe('0');
    expect(odd.contributorCount).toBe(3);
  });

  it('allows a cohort strategy to consume Contribution slices directly', () => {
    const directMetric = createMetricDefinition(MetricId.create(MetricKey.create('direct_contribution_count'), MetricVersion.create(1)), 'COUNT');
    const directCalculator = {
      definition: directMetric,
      calculate: ({ contributions }: { contributions: readonly unknown[] }) => ({ value: countMetricValue(contributions.length), contributorCount: contributions.length }),
    };
    const directCalculation = new CalculateCohortMetrics([directCalculator]);
    const source = { ...contributor('one', '5'), contribution: { schemaVersion: 1 as const, period, dimensions, financial: { currencies: [] } } };
    const [result] = directCalculation.execute({ period, cohort: createCohort(), currency: 'EUR', metricIds: [directMetric.id] }, [source]);

    expect(result.value).toEqual({ kind: 'COUNT', value: 1 });
    expect(result.contributorCount).toBe(1);
  });
});
