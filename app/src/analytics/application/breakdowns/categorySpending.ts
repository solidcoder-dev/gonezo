import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import type { AnalyticsCategoryReference, AnalyticsSpendingCategory, AnalyticsSpendingMovement, AnalyticsSpendingPeriodWindow } from '../spendingReport';
import { expensesInWindow, spendingMoney } from '../spendingWindowFacts';

export function buildSpendingCategories(
  movements: AnalyticsSpendingMovement[],
  window: AnalyticsSpendingPeriodWindow,
  currency: string,
  references: AnalyticsCategoryReference[],
): AnalyticsSpendingCategory[] {
  const categoryNames = new Map(references.map((reference) => [reference.id, reference.name]));
  const amounts = new Map<string, ExactDecimal>();
  for (const movement of expensesInWindow(movements, window, currency)) {
    const allocations = movement.items?.length
      ? movement.items
      : [{ amount: movement.amount, categoryId: movement.categoryId, categoryName: movement.categoryName }];
    for (const allocation of allocations) {
      const key = allocation.categoryId ?? 'uncategorized';
      amounts.set(key, (amounts.get(key) ?? ExactDecimal.from('0')).add(ExactDecimal.from(allocation.amount)));
    }
  }
  const total = [...amounts.values()].reduce((sum, amount) => sum.add(amount), ExactDecimal.from('0'));
  return [...amounts.entries()].sort((left, right) => right[1].compare(left[1])).map(([id, amount]) => ({
    categoryId: id === 'uncategorized' ? undefined : id,
    categoryName: id === 'uncategorized' ? 'Uncategorized' : categoryNames.get(id) ?? 'Uncategorized',
    amount: spendingMoney(amount, currency),
    percentage: total.compare(ExactDecimal.from('0')) === 0 ? 0 : Number(amount.ratioTo(total, 8).multiplyByInteger(100).toFixed(8)),
  }));
}
