import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import type { AnalyticsSpendingMerchant, AnalyticsSpendingMovement, AnalyticsSpendingPeriodWindow } from '../spendingReport';
import { expensesInWindow, spendingMoney } from '../spendingWindowFacts';

export function buildSpendingMerchants(
  movements: AnalyticsSpendingMovement[],
  window: AnalyticsSpendingPeriodWindow,
  currency: string,
  categoryId?: string,
): AnalyticsSpendingMerchant[] {
  const totals = new Map<string, { amount: ExactDecimal; movementCount: number }>();
  for (const movement of expensesInWindow(movements, window, currency)) {
    if (categoryId && movement.categoryId !== categoryId) continue;
    const merchant = movement.merchant?.trim();
    if (!merchant) continue;
    const existing = totals.get(merchant) ?? { amount: ExactDecimal.from('0'), movementCount: 0 };
    totals.set(merchant, {
      amount: existing.amount.add(ExactDecimal.from(movement.amount)),
      movementCount: existing.movementCount + 1,
    });
  }
  const total = [...totals.values()].reduce((sum, item) => sum.add(item.amount), ExactDecimal.from('0'));
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .sort(([, left], [, right]) => right.amount.compare(left.amount))
    .map(([merchant, item]) => ({
      merchant,
      amount: spendingMoney(item.amount, currency),
      percentage: total.compare(ExactDecimal.from('0')) === 0 ? 0 : Number(item.amount.ratioTo(total, 8).multiplyByInteger(100).toFixed(8)),
      movementCount: item.movementCount,
    }));
}
