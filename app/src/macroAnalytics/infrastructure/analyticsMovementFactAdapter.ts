import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { createFinancialFact, type FinancialFact, type FinancialFactKind, type FinancialFactSource } from '../domain/financialFact';

const financialFactSourceByAnalyticsSource = {
  POSTED: 'POSTED',
  EXPECTED: 'EXPECTED',
  SCHEDULED_PROJECTION: 'SCHEDULED',
} satisfies Record<AnalyticsMovementFactItem['source'], FinancialFactSource>;

const financialFactKindByAnalyticsType = {
  income: 'INCOME',
  expense: 'EXPENSE',
  transfer_in: 'TRANSFER_IN',
  transfer_out: 'TRANSFER_OUT',
} satisfies Record<AnalyticsMovementFactItem['type'], FinancialFactKind>;

export function adaptAnalyticsMovementFact(item: AnalyticsMovementFactItem): FinancialFact | null {
  if (item.ignored) return null;

  return createFinancialFact({
    id: item.analyticsFactId,
    occurredAt: item.effectiveAt,
    source: financialFactSourceByAnalyticsSource[item.source],
    kind: financialFactKindByAnalyticsType[item.type],
    amount: item.personalAmount,
    currency: item.currency,
  });
}
