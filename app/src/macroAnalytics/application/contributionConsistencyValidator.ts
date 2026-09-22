import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { financialContributionAmount, type FinancialContribution } from '../domain/financialContribution';
import type { TagUsageContribution } from '../domain/tagUsageContribution';
import type { FinancialFactKind, FinancialFactSource } from '../domain/financialFact';

type ContributionSlices = Readonly<{
  financial: FinancialContribution;
  categories: Readonly<{ currencies: readonly { currency: string; buckets: readonly { source: FinancialFactSource; kind: FinancialFactKind; amount: string }[] }[] }>;
  recurring: Readonly<{ currencies: readonly { currency: string; buckets: readonly { source: FinancialFactSource; kind: FinancialFactKind; amount: string }[] }[] }>;
  sharing: Readonly<{ currencies: readonly { currency: string; buckets: readonly { source: FinancialFactSource; kind: FinancialFactKind; personalAmount: string }[] }[] }>;
  merchants: Readonly<{ currencies: readonly { currency: string; buckets: readonly { source: FinancialFactSource; kind: FinancialFactKind; amount: string }[] }[] }>;
  tagUsage: TagUsageContribution;
}>;

function assertCategoryTotalsReconcile(financial: ContributionSlices['financial'], categories: ContributionSlices['categories']): void {
  const totals = (currencies: ContributionSlices['categories']['currencies']) => {
    const result = new Map<string, ExactDecimal>();
    for (const { currency, buckets } of currencies) for (const bucket of buckets) {
      if (bucket.kind !== 'INCOME' && bucket.kind !== 'EXPENSE') continue;
      const key = JSON.stringify([currency, bucket.source, bucket.kind]);
      result.set(key, (result.get(key) ?? ExactDecimal.from('0')).add(ExactDecimal.from(bucket.amount)));
    }
    return result;
  };
  const financialTotals = totals(financial.currencies);
  const categoryTotals = totals(categories.currencies);
  for (const key of new Set([...financialTotals.keys(), ...categoryTotals.keys()])) {
    if ((financialTotals.get(key) ?? ExactDecimal.from('0')).compare(categoryTotals.get(key) ?? ExactDecimal.from('0')) !== 0) throw new Error(`Category contribution does not reconcile with financial contribution for ${key}`);
  }
}

function assertSliceDoesNotExceedFinancial(financial: FinancialContribution, currencies: readonly { currency: string; buckets: readonly { source: FinancialFactSource; kind: FinancialFactKind; amount?: string; personalAmount?: string }[] }[], amount: (bucket: { amount?: string; personalAmount?: string }) => string, label: string): void {
  for (const { currency, buckets } of currencies) for (const bucket of buckets) {
    if (ExactDecimal.from(amount(bucket)).compare(ExactDecimal.from(financialContributionAmount(financial, currency, bucket.source, bucket.kind))) > 0) throw new Error(`${label} contribution exceeds financial contribution for ${currency}:${bucket.source}:${bucket.kind}`);
  }
}

function assertTagUsageReconcilesWithFinancial(financial: FinancialContribution, tagUsage: TagUsageContribution): void {
  for (const { currency, buckets } of tagUsage.currencies) for (const bucket of buckets) {
    const financialBucket = financial.currencies.find((entry) => entry.currency === currency)?.buckets.find((entry) => entry.source === bucket.source && entry.kind === bucket.kind);
    if (ExactDecimal.from(bucket.amount).compare(ExactDecimal.from(financialContributionAmount(financial, currency, bucket.source, bucket.kind))) !== 0) throw new Error(`Tag usage contribution does not reconcile with financial contribution for ${currency}:${bucket.source}:${bucket.kind}`);
    if (bucket.movementCount < (financialBucket?.count ?? 0)) throw new Error(`Tag usage movement count is below financial contribution for ${currency}:${bucket.source}:${bucket.kind}`);
  }
  for (const { currency, buckets } of financial.currencies) for (const bucket of buckets) {
    if ((bucket.kind !== 'INCOME' && bucket.kind !== 'EXPENSE') || ExactDecimal.from(bucket.amount).compare(ExactDecimal.from('0')) <= 0) continue;
    if (!tagUsage.currencies.find((entry) => entry.currency === currency)?.buckets.find((entry) => entry.source === bucket.source && entry.kind === bucket.kind)) throw new Error(`Financial contribution is missing from tag usage for ${currency}:${bucket.source}:${bucket.kind}`);
  }
}

export const ContributionConsistencyValidator = Object.freeze({
  validate(slices: ContributionSlices): void {
    assertCategoryTotalsReconcile(slices.financial, slices.categories);
    assertSliceDoesNotExceedFinancial(slices.financial, slices.recurring.currencies, (bucket) => bucket.amount!, 'Recurring');
    assertSliceDoesNotExceedFinancial(slices.financial, slices.sharing.currencies, (bucket) => bucket.personalAmount!, 'Sharing personal');
    assertSliceDoesNotExceedFinancial(slices.financial, slices.merchants.currencies, (bucket) => bucket.amount!, 'Merchant');
    assertTagUsageReconcilesWithFinancial(slices.financial, slices.tagUsage);
  },
});
