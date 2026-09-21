import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { createMetricDefinition, MetricId, MetricKey, MetricVersion, moneyMetricValue, ratioMetricValue, type MetricDefinition, type MetricValue } from '../../shared/domain/analyticsMetric';
import type { ContributorMetricCalculator } from '../domain/contributorMetric';
import { hasSharingContribution } from '../domain/contributionCapabilities';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';

function definition(key: string, valueKind: MetricDefinition['valueKind']): MetricDefinition {
  return createMetricDefinition(MetricId.create(MetricKey.create(key), MetricVersion.create(1)), valueKind);
}

export const sharedPostedPersonalExpenseTotal = definition('shared_posted_personal_expense_total', 'MONEY');
export const sharedPostedSettlementRequiredTotal = definition('shared_posted_settlement_required_total', 'MONEY');
export const sharedPostedExpenseSharePercent = definition('shared_posted_expense_share_percent', 'RATIO');

function selectedCurrency(contribution: MacroAnalyticsContribution, currency?: string): string | null {
  const normalized = currency?.trim().toUpperCase();
  return normalized && contribution.financial.currencies.some(({ currency: entry }) => entry === normalized) ? normalized : null;
}

function sharingAmount(contribution: MacroAnalyticsContribution, currency: string, field: 'personalAmount' | 'settlementRequiredAmount'): string {
  if (!hasSharingContribution(contribution)) return '0';
  return contribution.sharing.currencies.find(({ currency: entry }) => entry === currency)?.buckets
    .find(({ source, kind }) => source === 'POSTED' && kind === 'EXPENSE')?.[field] ?? '0';
}

const amountCalculator = (definition: MetricDefinition, field: 'personalAmount' | 'settlementRequiredAmount'): ContributorMetricCalculator => Object.freeze({
  definition,
  calculate(contribution: MacroAnalyticsContribution, currency?: string): MetricValue | null {
    const selected = selectedCurrency(contribution, currency);
    if (!selected || !hasSharingContribution(contribution)) return null;
    return moneyMetricValue(ExactDecimal.from(sharingAmount(contribution, selected, field)), selected);
  },
});

const sharePercentCalculator: ContributorMetricCalculator = Object.freeze({
  definition: sharedPostedExpenseSharePercent,
  calculate(contribution, currency) {
    const selected = selectedCurrency(contribution, currency);
    if (!selected || !hasSharingContribution(contribution)) return null;
    const financialExpense = ExactDecimal.from(contribution.financial.currencies.find(({ currency: entry }) => entry === selected)?.buckets
      .find(({ source, kind }) => source === 'POSTED' && kind === 'EXPENSE')?.amount ?? '0');
    if (financialExpense.compare(ExactDecimal.from('0')) === 0) return null;
    return ratioMetricValue(ExactDecimal.from(sharingAmount(contribution, selected, 'personalAmount')).ratioTo(financialExpense, 4).multiplyByInteger(100));
  },
});

export const contributorSharingMetricCalculators: readonly ContributorMetricCalculator[] = Object.freeze([
  amountCalculator(sharedPostedPersonalExpenseTotal, 'personalAmount'),
  amountCalculator(sharedPostedSettlementRequiredTotal, 'settlementRequiredAmount'),
  sharePercentCalculator,
]);

export const contributorSharingMetricDefinitions = Object.freeze({ sharedPostedPersonalExpenseTotal, sharedPostedSettlementRequiredTotal, sharedPostedExpenseSharePercent });
