import type { AnalyticsMovementFactItem } from '../../analytics/application/analyticsMovementFacts.contract';
import { createFinancialFact, type FinancialFact, type FinancialFactKind } from '../domain/financialFact';
import { mapAnalyticsMovementSource } from './analyticsMovementSource';

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
    source: mapAnalyticsMovementSource(item.source),
    kind: financialFactKindByAnalyticsType[item.type],
    amount: item.personalAmount,
    currency: item.currency,
  });
}
