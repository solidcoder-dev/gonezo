import { describe, expect, it } from 'vitest';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { MetricId, MetricKey, MetricVersion } from '../../shared/domain/analyticsMetric';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { CalculateContributorMetrics } from './CalculateContributorMetrics';
import { contributorFinancialMetricCalculators, contributorFinancialMetricDefinitions as metrics } from './contributorFinancialMetrics';

const period = createAnalyticsPeriod('2026-09');
const contribution: MacroAnalyticsContribution = {
  schemaVersion: 1,
  period,
  dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE', ageBand: '25_34' },
  financial: { currencies: [
    { currency: 'EUR', buckets: [
      { source: 'POSTED', kind: 'INCOME', amount: '12.345', count: 2 },
      { source: 'POSTED', kind: 'EXPENSE', amount: '4.5', count: 3 },
      { source: 'EXPECTED', kind: 'EXPENSE', amount: '7', count: 1 },
      { source: 'SCHEDULED', kind: 'EXPENSE', amount: '9.25', count: 1 },
      { source: 'POSTED', kind: 'TRANSFER_IN', amount: '400', count: 1 },
    ] },
    { currency: 'GBP', buckets: [{ source: 'POSTED', kind: 'EXPENSE', amount: '2', count: 1 }] },
  ] },
};

describe('CalculateContributorMetrics', () => {
  const calculate = new CalculateContributorMetrics(contributorFinancialMetricCalculators);
  const contributorId = createAnalyticsContributorId('contributor-1');

  it('calculates the five contribution metrics exactly and isolates currencies and buckets', () => {
    const result = calculate.execute({ contributorId, contribution, currency: 'eur', metricIds: [
      metrics.postedIncomeTotal.id, metrics.postedExpenseTotal.id, metrics.expectedExpenseTotal.id,
      metrics.scheduledExpenseTotal.id, metrics.postedExpenseCount.id,
    ] });

    expect(result.map(({ value }) => value.kind === 'MONEY' ? [value.kind, value.value.toString(), value.currency] : [value.kind, value.value])).toEqual([
      ['MONEY', '12.345', 'EUR'], ['MONEY', '4.5', 'EUR'], ['MONEY', '7', 'EUR'], ['MONEY', '9.25', 'EUR'], ['COUNT', 3],
    ]);
    const [poundResult] = calculate.execute({ contributorId, contribution, currency: 'GBP', metricIds: [metrics.postedExpenseTotal.id] });
    expect(poundResult.value.kind === 'MONEY' && [poundResult.value.currency, poundResult.value.value.toString()]).toEqual(['GBP', '2']);
  });

  it('calculates identical financial results from V1 and V2 contributions', () => {
    const v2Contribution: MacroAnalyticsContribution = { ...contribution, schemaVersion: 2, categories: { currencies: [] } };
    const metricIds = [metrics.postedIncomeTotal.id, metrics.postedExpenseTotal.id, metrics.expectedExpenseTotal.id];
    expect(calculate.execute({ contributorId, contribution: v2Contribution, currency: 'EUR', metricIds }))
      .toEqual(calculate.execute({ contributorId, contribution, currency: 'EUR', metricIds }));
  });

  it('returns null for a missing currency and zero for an absent bucket in an existing currency', () => {
    expect(calculate.execute({ contributorId, contribution, currency: 'USD', metricIds: [metrics.postedExpenseTotal.id] })).toEqual([]);
    const emptyCurrency = { ...contribution, financial: { currencies: [{ currency: 'USD', buckets: [] }] } };
    const [result] = calculate.execute({ contributorId, contribution: emptyCurrency, currency: 'USD', metricIds: [metrics.postedExpenseTotal.id] });
    expect(result.value.kind === 'MONEY' && result.value.value.toString()).toBe('0');
  });

  it('deduplicates requests while preserving order and rejects unsupported metrics', () => {
    const results = calculate.execute({ contributorId, contribution, currency: 'EUR', metricIds: [metrics.expectedExpenseTotal.id, metrics.postedIncomeTotal.id, metrics.expectedExpenseTotal.id] });
    expect(results.map(({ definition }) => definition.id.toString())).toEqual(['expected_expense_total:v1', 'posted_income_total:v1']);
    const unsupportedId = MetricId.create(MetricKey.create('unknown_metric'), MetricVersion.create(1));
    expect(() => calculate.execute({ contributorId, contribution, currency: 'EUR', metricIds: [unsupportedId] })).toThrow('Unsupported contributor metric: unknown_metric:v1');
  });
});
