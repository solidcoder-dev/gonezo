import type { CategoryFact } from './categoryFact';
import type { MacroCategoryCode } from './macroCategoryCode';
import { ExactDecimal } from '../../shared/domain/exactDecimal';

export type CategoryContributionBucket = Readonly<{
  source: CategoryFact['source'];
  kind: CategoryFact['kind'];
  category: MacroCategoryCode;
  amount: string;
}>;

export type CategoryCurrencyContribution = Readonly<{
  currency: string;
  buckets: readonly CategoryContributionBucket[];
}>;

export type CategoryContribution = Readonly<{ currencies: readonly CategoryCurrencyContribution[] }>;

export function aggregateCategoryFacts(facts: readonly CategoryFact[]): CategoryContribution {
  const totals = new Map<string, { currency: string; source: string; kind: string; category: MacroCategoryCode; amount: ExactDecimal }>();
  for (const fact of facts) {
    const key = JSON.stringify([fact.currency, fact.source, fact.kind, fact.category]);
    const previous = totals.get(key);
    totals.set(key, {
      currency: fact.currency,
      source: fact.source,
      kind: fact.kind,
      category: fact.category,
      amount: (previous?.amount ?? ExactDecimal.from('0')).add(ExactDecimal.from(fact.amount)),
    });
  }
  const currencies = [...new Set(facts.map(({ currency }) => currency))].sort();
  return Object.freeze({ currencies: Object.freeze(currencies.map((currency) => Object.freeze({
    currency,
    buckets: Object.freeze([...totals.values()]
      .filter((bucket) => bucket.currency === currency && bucket.amount.compare(ExactDecimal.from('0')) !== 0)
      .sort((left, right) => left.source.localeCompare(right.source) || left.kind.localeCompare(right.kind) || left.category.localeCompare(right.category))
      .map(({ source, kind, category, amount }) => Object.freeze({ source, kind, category, amount: amount.toString() }))),
  })))});
}
