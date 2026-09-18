import type { FinancialFact, FinancialFactKind, FinancialFactSource } from './financialFact';

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

type Decimal = Readonly<{ units: bigint; scale: number }>;

function parseDecimal(value: string): Decimal {
  const [whole, fraction = ''] = value.split('.');
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, '') || '0';
  return { units: BigInt(digits), scale: fraction.length };
}

function addDecimalStrings(left: string, right: string): string {
  const first = parseDecimal(left);
  const second = parseDecimal(right);
  const scale = Math.max(first.scale, second.scale);
  const units = first.units * (10n ** BigInt(scale - first.scale))
    + second.units * (10n ** BigInt(scale - second.scale));
  const digits = units.toString().padStart(scale + 1, '0');
  return scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
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
      amount: current ? addDecimalStrings(current.amount, fact.amount) : fact.amount,
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
