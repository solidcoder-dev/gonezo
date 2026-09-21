import type { FinancialFact, FinancialFactKind, FinancialFactSource } from './financialFact';
import { addExactDecimals } from '../../shared/domain/exactDecimal';

export type FinancialContributionBucket = Readonly<{
  source: FinancialFactSource;
  kind: FinancialFactKind;
  amount: string;
  count: number;
}>;

export type FinancialCurrencyContribution = Readonly<{
  currency: string;
  buckets: readonly FinancialContributionBucket[];
}>;

export type FinancialContribution = Readonly<{
  currencies: readonly FinancialCurrencyContribution[];
}>;

export function financialContributionAmount(
  contribution: FinancialContribution,
  currency: string,
  source: FinancialFactSource,
  kind: FinancialFactKind,
): string {
  return contribution.currencies.find((entry) => entry.currency === currency)?.buckets
    .find((bucket) => bucket.source === source && bucket.kind === kind)?.amount ?? '0';
}

const orderedSources: readonly FinancialFactSource[] = ['POSTED', 'EXPECTED', 'SCHEDULED'];
const orderedKinds: readonly FinancialFactKind[] = ['INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT'];

export function aggregateFinancialFacts(facts: readonly FinancialFact[]): FinancialContribution {
  const totals = new Map<string, { currency: string; source: FinancialFactSource; kind: FinancialFactKind; amount: string; count: number }>();
  for (const fact of facts) {
    const key = `${fact.currency}:${fact.source}:${fact.kind}`;
    const current = totals.get(key);
    totals.set(key, {
      currency: fact.currency,
      source: fact.source,
      kind: fact.kind,
      amount: current ? addExactDecimals(current.amount, fact.amount) : fact.amount,
      count: (current?.count ?? 0) + 1,
    });
  }

  const currencies = [...new Set(facts.map((fact) => fact.currency))].sort();
  return Object.freeze({
    currencies: Object.freeze(currencies.map((currency) => Object.freeze({
      currency,
      buckets: Object.freeze(orderedSources.flatMap((source) => orderedKinds.flatMap((kind) => {
        const bucket = totals.get(`${currency}:${source}:${kind}`);
        return bucket ? [Object.freeze({ source, kind, amount: bucket.amount, count: bucket.count })] : [];
      }))),
    }))),
  });
}
