import { describe, expect, it } from 'vitest';
import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { moneyMetricValue, ratioMetricValue } from '../../shared/domain/analyticsMetric';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createCohort } from '../domain/cohort';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { ContributorMetricResult } from '../domain/contributorMetric';
import { CalculateCohortMetrics } from './CalculateCohortMetrics';
import { cohortRecurringMetricCalculators, cohortRecurringMetricDefinitions } from './cohortRecurringMetrics';
import { recurringPostedExpenseSharePercent, recurringPostedExpenseTotal } from './contributorRecurringMetrics';

const period = createAnalyticsPeriod('2026-09');
const dimensions = { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const };

function contributor(id: string, definition: typeof recurringPostedExpenseTotal | typeof recurringPostedExpenseSharePercent, amount: string, currency = 'EUR') {
  const value = definition.valueKind === 'MONEY' ? moneyMetricValue(ExactDecimal.from(amount), currency) : ratioMetricValue(ExactDecimal.from(amount));
  const result: ContributorMetricResult = { contributorId: createAnalyticsContributorId(id), period, definition, value };
  return { result, dimensions };
}

describe('cohort recurring metrics', () => {
  const calculate = new CalculateCohortMetrics(cohortRecurringMetricCalculators);

  it('includes zero values, isolates currency, and reports the actual denominator', () => {
    const request = { period, cohort: createCohort(), currency: 'EUR', metricIds: [cohortRecurringMetricDefinitions.medianRecurringPostedExpense.id] };
    const [even] = calculate.execute(request, [contributor('one', recurringPostedExpenseTotal, '0'), contributor('two', recurringPostedExpenseTotal, '2')]);
    expect(even.value.kind === 'MONEY' && even.value.value.toString()).toBe('1');
    expect(even.contributorCount).toBe(2);
    const [odd] = calculate.execute(request, [contributor('zero', recurringPostedExpenseTotal, '0'), contributor('one', recurringPostedExpenseTotal, '1'), contributor('two', recurringPostedExpenseTotal, '4')]);
    expect(odd.value.kind === 'MONEY' && odd.value.value.toString()).toBe('1');
    expect(odd.contributorCount).toBe(3);
    const [isolated] = calculate.execute(request, [contributor('eur', recurringPostedExpenseTotal, '2'), contributor('gbp', recurringPostedExpenseTotal, '100', 'GBP')]);
    expect(isolated.contributorCount).toBe(1);
  });

  it('excludes null ratio results and returns no result for empty denominators', () => {
    const request = { period, cohort: createCohort(), currency: 'EUR', metricIds: [cohortRecurringMetricDefinitions.medianRecurringPostedExpenseSharePercent.id] };
    const [result] = calculate.execute(request, [contributor('zero-share', recurringPostedExpenseSharePercent, '0'), contributor('half-share', recurringPostedExpenseSharePercent, '50')]);
    expect(result.value.kind === 'RATIO' && result.value.value.toString()).toBe('25');
    expect(result.contributorCount).toBe(2);
    expect(calculate.execute({ ...request, metricIds: [cohortRecurringMetricDefinitions.medianRecurringPostedExpense.id] }, [])).toEqual([]);
  });
});
