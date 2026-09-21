import { ExactDecimal } from '../../shared/domain/exactDecimal';
import type { TagUsageFact, TagUsageFactKind, TagUsageFactSource } from './tagUsageFact';

export type TagUsageContributionBucket = Readonly<{
  source: TagUsageFactSource;
  kind: TagUsageFactKind;
  amount: string;
  movementCount: number;
  taggedAmount: string;
  taggedMovementCount: number;
}>;

export type TagUsageCurrencyContribution = Readonly<{
  currency: string;
  buckets: readonly TagUsageContributionBucket[];
}>;

export type TagUsageContribution = Readonly<{
  currencies: readonly TagUsageCurrencyContribution[];
}>;

export function aggregateTagUsageFacts(facts: readonly TagUsageFact[]): TagUsageContribution {
  const totals = new Map<string, {
    currency: string;
    source: TagUsageFactSource;
    kind: TagUsageFactKind;
    amount: ExactDecimal;
    movementCount: number;
    taggedAmount: ExactDecimal;
    taggedMovementCount: number;
  }>();
  for (const fact of facts) {
    const key = JSON.stringify([fact.currency, fact.source, fact.kind]);
    const bucket = totals.get(key) ?? {
      currency: fact.currency,
      source: fact.source,
      kind: fact.kind,
      amount: ExactDecimal.from('0'),
      movementCount: 0,
      taggedAmount: ExactDecimal.from('0'),
      taggedMovementCount: 0,
    };
    const amount = ExactDecimal.from(fact.amount);
    bucket.amount = bucket.amount.add(amount);
    bucket.movementCount += 1;
    if (fact.tagCount > 0) {
      bucket.taggedAmount = bucket.taggedAmount.add(amount);
      bucket.taggedMovementCount += 1;
    }
    totals.set(key, bucket);
  }

  const currencies = [...new Set(facts.map(({ currency }) => currency))].sort(compareText);
  return Object.freeze({
    currencies: Object.freeze(currencies.map((currency) => Object.freeze({
      currency,
      buckets: Object.freeze([...totals.values()]
        .filter((bucket) => bucket.currency === currency)
        .sort((left, right) => compareText(left.source, right.source) || compareText(left.kind, right.kind))
        .map(({ source, kind, amount, movementCount, taggedAmount, taggedMovementCount }) => Object.freeze({
          source, kind, amount: amount.toString(), movementCount,
          taggedAmount: taggedAmount.toString(), taggedMovementCount,
        }))),
    }))),
  });
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
