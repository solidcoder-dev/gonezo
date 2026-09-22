import { countMetricValue, defineMetric, moneyMetricValue, type MetricDefinition, type MetricValue } from '../../shared/domain/analyticsMetric';
import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { balanceCurrencyForContribution } from '../domain/accountBalanceEligibility';
import type { ContributorMetricCalculator } from '../domain/contributorMetric';

function definition(key: string, kind: MetricDefinition['valueKind']): MetricDefinition {
  return defineMetric({ key, valueKind: kind });
}

export const periodEndAccountBalance = definition('period_end_account_balance', 'MONEY');
export const accountCount = definition('account_count', 'COUNT');

function balanceMetric(metricDefinition: MetricDefinition, amount: (buckets: readonly { balanceAmount: string; accountCount: number }[], currency: string) => MetricValue): ContributorMetricCalculator {
  return Object.freeze({
    definition: metricDefinition,
    calculate(contribution, currency) {
      if (!currency) return null;
      const normalizedCurrency = currency.trim().toUpperCase();
      const balances = balanceCurrencyForContribution(contribution, normalizedCurrency);
      if (!balances) return null;
      return amount(balances.buckets, normalizedCurrency);
    },
  });
}

export const contributorBalanceMetricCalculators: readonly ContributorMetricCalculator[] = Object.freeze([
  balanceMetric(periodEndAccountBalance, (buckets, currency) => moneyMetricValue(
    buckets.reduce((total, bucket) => total.add(ExactDecimal.from(bucket.balanceAmount)), ExactDecimal.from('0')),
    currency,
  )),
  balanceMetric(accountCount, (buckets) => countMetricValue(buckets.reduce((total, bucket) => total + bucket.accountCount, 0))),
]);

export const contributorBalanceMetricDefinitions = Object.freeze({ periodEndAccountBalance, accountCount });
