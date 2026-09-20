import { ExactDecimal } from '../../../shared/domain/exactDecimal';
import type { AnalyticsFlowProjectionPoint, AnalyticsFlowReport, AnalyticsMoneyDto } from '../analyticsFlowReport';

function money(value: string, currency: string): AnalyticsMoneyDto {
  return { value: ExactDecimal.from(value).toFixed(2), currency };
}

export function calculateFlowSummary(
  projection: AnalyticsFlowProjectionPoint[],
  currency: string,
  currentBalance: AnalyticsMoneyDto | undefined,
): AnalyticsFlowReport['summary'] {
  const initialBalance = projection[0]?.balance ?? money('0', currency);
  const lowestBalance = projection.reduce((lowest, point) => ExactDecimal.from(point.balance.value).compare(ExactDecimal.from(lowest.amount.value)) < 0
    ? { amount: point.balance, occurredAt: point.occurredAt }
    : lowest, { amount: initialBalance, occurredAt: projection[0]?.occurredAt ?? '' });
  const highestBalance = projection.reduce((highest, point) => ExactDecimal.from(point.balance.value).compare(ExactDecimal.from(highest.amount.value)) > 0
    ? { amount: point.balance, occurredAt: point.occurredAt }
    : highest, { amount: initialBalance, occurredAt: projection[0]?.occurredAt ?? '' });
  const endBalance = projection.at(-1)?.balance ?? initialBalance;
  return {
    openingBalance: initialBalance,
    currentBalance,
    endBalance,
    netFlow: money(ExactDecimal.from(endBalance.value).subtract(ExactDecimal.from(initialBalance.value)).toString(), currency),
    lowestBalance,
    highestBalance,
  };
}
