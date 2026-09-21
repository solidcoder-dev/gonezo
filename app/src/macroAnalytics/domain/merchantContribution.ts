import { ExactDecimal } from '../../shared/domain/exactDecimal';
import type { MerchantFact, MerchantFactKind, MerchantFactSource } from './merchantFact';
import type { MacroMerchantCode } from './macroMerchantCode';

export type MerchantContributionBucket = Readonly<{
  source: MerchantFactSource;
  kind: MerchantFactKind;
  merchant: MacroMerchantCode;
  amount: string;
  movementCount: number;
}>;

export type MerchantCurrencyContribution = Readonly<{
  currency: string;
  buckets: readonly MerchantContributionBucket[];
}>;

export type MerchantContribution = Readonly<{
  catalogVersion: number;
  currencies: readonly MerchantCurrencyContribution[];
}>;

export function aggregateMerchantFacts(facts: readonly MerchantFact[], catalogVersion: number): MerchantContribution {
  if (!Number.isSafeInteger(catalogVersion) || catalogVersion < 1) throw new Error('Merchant catalog version must be a positive integer');
  const totals = new Map<string, { currency: string; source: MerchantFactSource; kind: MerchantFactKind; merchant: MacroMerchantCode; amount: ExactDecimal; movementCount: number }>();
  for (const fact of facts) {
    const key = JSON.stringify([fact.currency, fact.source, fact.kind, fact.merchant]);
    const bucket = totals.get(key) ?? { currency: fact.currency, source: fact.source, kind: fact.kind, merchant: fact.merchant, amount: ExactDecimal.from('0'), movementCount: 0 };
    bucket.amount = bucket.amount.add(ExactDecimal.from(fact.amount));
    bucket.movementCount += 1;
    totals.set(key, bucket);
  }
  const currencies = [...new Set(facts.map(({ currency }) => currency))].sort(compareText);
  return Object.freeze({
    catalogVersion,
    currencies: Object.freeze(currencies.map((currency) => Object.freeze({
      currency,
      buckets: Object.freeze([...totals.values()]
        .filter((bucket) => bucket.currency === currency)
        .sort((left, right) => compareText(left.source, right.source) || compareText(left.kind, right.kind) || compareText(left.merchant, right.merchant))
        .map(({ source, kind, merchant, amount, movementCount }) => Object.freeze({ source, kind, merchant, amount: amount.toString(), movementCount }))),
    }))),
  });
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
