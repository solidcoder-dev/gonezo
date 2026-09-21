import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import type { AnalyticsSpendingMerchant, AnalyticsSpendingMovement, AnalyticsSpendingPeriodWindow } from '../spendingReport';
import { expensesInWindow, spendingMoney } from '../spendingWindowFacts';
import { analyticsMerchantReference } from '../../domain/analyticsMerchantReference';

type MerchantTotal = {
  amount: ExactDecimal;
  movementCount: number;
  labels: Map<string, { count: number; mostRecentlyUsedAt: string }>;
};

function compareDisplayLabels(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function displayLabel(total: MerchantTotal): string {
  return [...total.labels.entries()].sort(([leftLabel, left], [rightLabel, right]) =>
    right.count - left.count
    || right.mostRecentlyUsedAt.localeCompare(left.mostRecentlyUsedAt)
    || compareDisplayLabels(leftLabel, rightLabel),
  )[0][0];
}

export function buildSpendingMerchants(
  movements: AnalyticsSpendingMovement[],
  window: AnalyticsSpendingPeriodWindow,
  currency: string,
  categoryId?: string,
): AnalyticsSpendingMerchant[] {
  const totals = new Map<string, MerchantTotal>();
  for (const movement of expensesInWindow(movements, window, currency)) {
    if (categoryId && movement.categoryId !== categoryId) continue;
    const reference = movement.merchantReference ?? analyticsMerchantReference(movement.merchant);
    if (!reference) continue;
    const existing = totals.get(reference.key) ?? { amount: ExactDecimal.from('0'), movementCount: 0, labels: new Map() };
    const label = existing.labels.get(reference.displayName) ?? { count: 0, mostRecentlyUsedAt: movement.occurredAt };
    existing.labels.set(reference.displayName, {
      count: label.count + 1,
      mostRecentlyUsedAt: movement.occurredAt > label.mostRecentlyUsedAt ? movement.occurredAt : label.mostRecentlyUsedAt,
    });
    totals.set(reference.key, {
      amount: existing.amount.add(ExactDecimal.from(movement.amount)),
      movementCount: existing.movementCount + 1,
      labels: existing.labels,
    });
  }
  const total = [...totals.values()].reduce((sum, item) => sum.add(item.amount), ExactDecimal.from('0'));
  return [...totals.entries()]
    .sort(([left], [right]) => compareDisplayLabels(left, right))
    .sort(([, left], [, right]) => right.amount.compare(left.amount))
    .map(([, item]) => ({
      merchant: displayLabel(item),
      amount: spendingMoney(item.amount, currency),
      percentage: total.compare(ExactDecimal.from('0')) === 0 ? 0 : Number(item.amount.ratioTo(total, 8).multiplyByInteger(100).toFixed(8)),
      movementCount: item.movementCount,
    }));
}
