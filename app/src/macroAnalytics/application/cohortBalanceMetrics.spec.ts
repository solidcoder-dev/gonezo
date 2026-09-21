import { describe, expect, it } from 'vitest';
import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { moneyMetricValue, countMetricValue } from '../../shared/domain/analyticsMetric';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createContributorMetricResult } from '../domain/contributorMetric';
import { cohortBalanceMetricCalculators, cohortBalanceMetricDefinitions } from './cohortBalanceMetrics';

const dimensions = { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const };

describe('cohort balance metrics', () => {
  it('uses signed exact medians and sums integral account counts', () => {
    const period = createAnalyticsPeriod('2026-09');
    const balanceDefinition = cohortBalanceMetricDefinitions.medianPeriodEndAccountBalance;
    const countDefinition = cohortBalanceMetricDefinitions.totalAccountCount;
    const results = [-4, 1, 7].map((amount, index) => ({
      result: createContributorMetricResult(createAnalyticsContributorId(`person-${index}`), period, { id: balanceDefinition.id, valueKind: 'MONEY' }, moneyMetricValue(ExactDecimal.from(amount), 'EUR')),
      dimensions,
    }));
    const counts = [2, 0, 3].map((count, index) => ({
      result: createContributorMetricResult(createAnalyticsContributorId(`person-${index}`), period, { id: countDefinition.id, valueKind: 'COUNT' }, countMetricValue(count)),
      dimensions,
    }));
    const median = cohortBalanceMetricCalculators[0].calculate({ contributors: results, contributions: [], currency: 'EUR' });
    const total = cohortBalanceMetricCalculators[1].calculate({ contributors: counts, contributions: [], currency: 'EUR' });
    expect(median?.value.kind === 'MONEY' && median.value.value.toString()).toBe('1');
    expect(total?.value).toEqual({ kind: 'COUNT', value: 5 });
  });

  it('calculates an even signed median exactly', () => {
    const calc = cohortBalanceMetricCalculators[0];
    const definition = cohortBalanceMetricDefinitions.medianPeriodEndAccountBalance;
    const contributors = [-1, 0].map((amount, index) => ({
      result: createContributorMetricResult(createAnalyticsContributorId(`id-${index}`), createAnalyticsPeriod('2026-09'), { id: definition.id, valueKind: 'MONEY' }, moneyMetricValue(ExactDecimal.from(amount), 'EUR')),
      dimensions,
    }));
    const value = calc.calculate({ contributors, contributions: [], currency: 'EUR' })?.value;
    expect(value?.kind === 'MONEY' && value.value.toString()).toBe('-0.5');
  });
});
