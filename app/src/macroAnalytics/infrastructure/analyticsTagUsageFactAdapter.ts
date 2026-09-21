import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { createTagUsageFact, type TagUsageFact, type TagUsageFactKind, type TagUsageFactSource } from '../domain/tagUsageFact';

const tagUsageSourceByAnalyticsSource = {
  POSTED: 'POSTED',
  EXPECTED: 'EXPECTED',
  SCHEDULED_PROJECTION: 'SCHEDULED',
} satisfies Record<AnalyticsMovementFactItem['source'], TagUsageFactSource>;

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
    source: tagUsageSourceByAnalyticsSource[item.source],
    kind,
    currency: item.currency,
    amount: item.personalAmount,
    tagCount: new Set(item.tags.map((tag) => tag.key)).size,
  });
}
