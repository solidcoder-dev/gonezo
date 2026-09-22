import type { AnalyticsMovementFactItem } from '../../analytics/application/analyticsMovementFacts.contract';
import { createRecurringFact, type RecurringFact, type RecurringFactKind } from '../domain/recurringFact';
import { mapAnalyticsMovementSource } from './analyticsMovementSource';

function recurringFactKind(type: AnalyticsMovementFactItem['type']): RecurringFactKind | undefined {
  if (type === 'income') return 'INCOME';
  if (type === 'expense') return 'EXPENSE';
  return undefined;
}

export function adaptAnalyticsRecurringFact(item: AnalyticsMovementFactItem): RecurringFact | null {
  if (item.ignored || item.schedulingOrigin?.kind !== 'recurring') return null;
  const kind = recurringFactKind(item.type);
  if (kind === undefined) return null;

  return createRecurringFact({
    id: `${item.analyticsFactId}/recurring`,
    occurredAt: item.effectiveAt,
    source: mapAnalyticsMovementSource(item.source),
    kind,
    currency: item.currency,
    amount: item.personalAmount,
    seriesId: `series/${item.schedulingOrigin.recurringMovementId}`,
  });
}
