import type { ExactDecimal } from '../../shared/domain/exactDecimal';
import type { AnalyticsMoneyDto, AnalyticsSpendingMovement, AnalyticsSpendingPeriodWindow } from './spendingReport';

export function expensesInWindow(
  movements: AnalyticsSpendingMovement[],
  window: AnalyticsSpendingPeriodWindow,
  currency: string,
): AnalyticsSpendingMovement[] {
  const start = new Date(`${window.start}T00:00:00.000Z`).getTime();
  const end = new Date(`${window.endExclusive}T00:00:00.000Z`).getTime();
  return movements.filter((movement) => movement.type === 'expense'
    && movement.currency.toUpperCase() === currency.toUpperCase()
    && new Date(`${movement.occurredAt.slice(0, 10)}T00:00:00.000Z`).getTime() >= start
    && new Date(`${movement.occurredAt.slice(0, 10)}T00:00:00.000Z`).getTime() < end);
}

export function spendingMoney(value: ExactDecimal, currency: string): AnalyticsMoneyDto {
  return { value: value.toFixed(2), currency: currency.toUpperCase() };
}
