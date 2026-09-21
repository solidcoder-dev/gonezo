import { ExactDecimal } from '../../shared/domain/exactDecimal';
import type { AnalyticsPeriod } from './analyticsPeriod';
import { accountBalanceCutoffForPeriod } from './analyticsPeriod';
import type { AccountBalanceFact } from './accountBalanceFact';
import type { MacroAccountTypeCode } from './macroAccountTypeCode';

export type AccountBalanceContributionBucket = Readonly<{
  accountType: MacroAccountTypeCode;
  balanceAmount: string;
  accountCount: number;
}>;

export type AccountBalanceCurrencyContribution = Readonly<{
  currency: string;
  buckets: readonly AccountBalanceContributionBucket[];
}>;

export type AccountBalanceContribution = Readonly<{
  currencies: readonly AccountBalanceCurrencyContribution[];
}>;

export const MACRO_ACCOUNT_TYPE_ORDER: readonly MacroAccountTypeCode[] = Object.freeze([
  'BANK', 'CASH', 'CARD', 'WALLET', 'SAVINGS', 'OTHER',
]);

export function aggregateAccountBalanceFacts(
  facts: readonly AccountBalanceFact[],
  period: AnalyticsPeriod,
): AccountBalanceContribution {
  const expectedCutoff = accountBalanceCutoffForPeriod(period);
  const currencies = new Map<string, Map<MacroAccountTypeCode, { balance: ExactDecimal; count: number }>>();
  for (const fact of facts) {
    if (fact.asOfLocalDateExclusive !== expectedCutoff) {
      throw new Error(`Account balance fact cutoff must be ${expectedCutoff} for ${period.value}`);
    }
    const types = currencies.get(fact.currency) ?? new Map();
    const current = types.get(fact.accountType) ?? { balance: ExactDecimal.from('0'), count: 0 };
    types.set(fact.accountType, { balance: current.balance.add(ExactDecimal.from(fact.balanceAmount)), count: current.count + 1 });
    currencies.set(fact.currency, types);
  }
  return Object.freeze({
    currencies: Object.freeze([...currencies.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([currency, types]) => Object.freeze({
      currency,
      buckets: Object.freeze(MACRO_ACCOUNT_TYPE_ORDER.flatMap((accountType) => {
        const bucket = types.get(accountType);
        return bucket ? [Object.freeze({ accountType, balanceAmount: bucket.balance.toString(), accountCount: bucket.count })] : [];
      })),
    }))),
  });
}
