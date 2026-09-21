import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import { compareAnalyticsTagReferenceKeys } from '../../domain/analyticsTagReference';

export type TagSpendingFact = Readonly<{
  movementId: string;
  source: 'POSTED' | 'EXPECTED' | 'SCHEDULED_PROJECTION';
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  currency: string;
  personalAmount: string;
  tags: readonly Readonly<{ key: string; tagId?: string; displayName: string }>[];
}>;

export type TagSpendingRankingItem = Readonly<{
  key: string;
  tagId?: string;
  displayName: string;
  amount: string;
  movementCount: number;
}>;

type MutableRankingItem = {
  key: string;
  tagId?: string;
  displayName: string;
  amount: ExactDecimal;
  movementCount: number;
};

export function buildTagSpendingRanking(
  facts: readonly TagSpendingFact[],
  currency: string,
): TagSpendingRankingItem[] {
  const expectedCurrency = currency.trim().toUpperCase();
  const ranking = new Map<string, MutableRankingItem>();

  for (const fact of facts) {
    if (fact.source !== 'POSTED' || fact.type !== 'expense' || fact.currency.trim().toUpperCase() !== expectedCurrency) continue;
    const amount = ExactDecimal.from(fact.personalAmount);
    const seenKeys = new Set<string>();
    for (const tag of fact.tags) {
      if (seenKeys.has(tag.key)) continue;
      seenKeys.add(tag.key);
      const item = ranking.get(tag.key) ?? {
        key: tag.key,
        ...(tag.tagId ? { tagId: tag.tagId } : {}),
        displayName: tag.displayName,
        amount: ExactDecimal.from('0'),
        movementCount: 0,
      };
      item.amount = item.amount.add(amount);
      item.movementCount += 1;
      ranking.set(tag.key, item);
    }
  }

  return [...ranking.values()]
    .sort((left, right) => right.amount.compare(left.amount)
      || right.movementCount - left.movementCount
      || compareAnalyticsTagReferenceKeys(left.key, right.key))
    .map(({ amount, ...item }) => ({ ...item, amount: amount.toFixed(2) }));
}
