import type { RecurringFact, RecurringFactKind, RecurringFactSource } from './recurringFact';
import { ExactDecimal } from '../../shared/domain/exactDecimal';

export type RecurringContributionBucket = Readonly<{
  source: RecurringFactSource;
  kind: RecurringFactKind;
  amount: string;
  occurrenceCount: number;
  seriesCount: number;
}>;

export type RecurringCurrencyContribution = Readonly<{
  currency: string;
  buckets: readonly RecurringContributionBucket[];
}>;

export type RecurringContribution = Readonly<{ currencies: readonly RecurringCurrencyContribution[] }>;

const orderedSources: readonly RecurringFactSource[] = ['POSTED', 'EXPECTED', 'SCHEDULED'];
const orderedKinds: readonly RecurringFactKind[] = ['INCOME', 'EXPENSE'];

export function aggregateRecurringFacts(facts: readonly RecurringFact[]): RecurringContribution {
  const totals = new Map<string, { currency: string; source: RecurringFactSource; kind: RecurringFactKind; amount: ExactDecimal; series: Set<string>; occurrenceCount: number }>();
  for (const fact of facts) {
    const key = JSON.stringify([fact.currency, fact.source, fact.kind]);
    const bucket = totals.get(key) ?? {
      currency: fact.currency,
      source: fact.source,
      kind: fact.kind,
      amount: ExactDecimal.from('0'),
      series: new Set<string>(),
      occurrenceCount: 0,
    };
    bucket.amount = bucket.amount.add(ExactDecimal.from(fact.amount));
    bucket.series.add(fact.seriesId);
    bucket.occurrenceCount += 1;
    totals.set(key, bucket);
  }

  const currencies = [...new Set(facts.map(({ currency }) => currency))].sort(compareText);
  return Object.freeze({ currencies: Object.freeze(currencies.map((currency) => Object.freeze({
    currency,
    buckets: Object.freeze(orderedSources.flatMap((source) => orderedKinds.flatMap((kind) => {
      const bucket = totals.get(JSON.stringify([currency, source, kind]));
      return bucket ? [Object.freeze({ source, kind, amount: bucket.amount.toString(), occurrenceCount: bucket.occurrenceCount, seriesCount: bucket.series.size })] : [];
    }))),
  }))) });
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
