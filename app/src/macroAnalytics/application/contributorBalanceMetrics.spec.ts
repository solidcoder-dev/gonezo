import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsContributorId } from '../domain/analyticsContributorId';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { CalculateContributorMetrics } from './CalculateContributorMetrics';
import { contributorBalanceMetricCalculators, contributorBalanceMetricDefinitions } from './contributorBalanceMetrics';

const period = createAnalyticsPeriod('2026-09');
const common = { period, dimensions: { countryCode: 'ES', regionCode: 'ES-CN', sex: 'FEMALE' as const, ageBand: '25_34' as const }, financial: { currencies: [] } };
const v6 = (currency = 'USD'): MacroAnalyticsContribution => ({
  ...common, schemaVersion: 6, categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] }, merchants: { catalogVersion: 1, currencies: [] },
  balances: { currencies: [{ currency, buckets: [{ accountType: 'BANK', balanceAmount: '-10.25', accountCount: 2 }, { accountType: 'CASH', balanceAmount: '0', accountCount: 1 }] }] },
});
const metrics = new CalculateContributorMetrics(contributorBalanceMetricCalculators);
const requested = Object.values(contributorBalanceMetricDefinitions).map(({ id }) => id);

describe('contributor balance metrics', () => {
  it('calculates signed stock and account count independently of financial currencies', () => {
    const results = metrics.execute({ contributorId: createAnalyticsContributorId('id'), contribution: v6(), currency: 'usd', metricIds: requested });
    expect(results.map(({ value }) => value.kind === 'MONEY' ? value.value.toString() : value.value)).toEqual(['-10.25', 3]);
  });

  it('excludes legacy contributions and V6 contributions without selected balance currency', () => {
    const legacy: MacroAnalyticsContribution = { ...common, schemaVersion: 5, categories: { currencies: [] }, recurring: { currencies: [] }, sharing: { currencies: [] }, merchants: { catalogVersion: 1, currencies: [] } };
    expect(metrics.execute({ contributorId: createAnalyticsContributorId('id'), contribution: legacy, currency: 'USD', metricIds: requested })).toEqual([]);
    expect(metrics.execute({ contributorId: createAnalyticsContributorId('id'), contribution: v6('EUR'), currency: 'USD', metricIds: requested })).toEqual([]);
  });
});
