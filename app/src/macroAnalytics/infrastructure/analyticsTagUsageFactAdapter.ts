import type { AnalyticsMovementFactItem } from '../../analytics/application/analyticsMovementFacts.contract';
import { createTagUsageFact, type TagUsageFact, type TagUsageFactKind } from '../domain/tagUsageFact';
import { mapAnalyticsMovementSource } from './analyticsMovementSource';

function tagUsageKindFor(type: AnalyticsMovementFactItem['type']): TagUsageFactKind | undefined {
  if (type === 'income') return 'INCOME';
  if (type === 'expense') return 'EXPENSE';
  return undefined;
}

export function adaptAnalyticsTagUsageFact(item: AnalyticsMovementFactItem): TagUsageFact | null {
  if (item.ignored) return null;
  const kind = tagUsageKindFor(item.type);
  if (kind === undefined) return null;

  return createTagUsageFact({
    id: `${item.analyticsFactId}/tag-usage`,
    occurredAt: item.effectiveAt,
    source: mapAnalyticsMovementSource(item.source),
    kind,
    currency: item.currency,
    amount: item.personalAmount,
    tagCount: new Set(item.tags.map((tag) => tag.key)).size,
  });
}
