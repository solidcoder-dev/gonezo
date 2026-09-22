import type { AnalyticsGetFilterFacetsInput, AnalyticsGetFilterFacetsResult } from '../application/analytics.port';
import { buildAnalyticsOverviewWindows } from '../application/analyticsBuilders';
import type { AnalyticsQueryPort } from './analyticsQueryScope';
import { listScopedAnalyticsMovements, resolveAnalyticsQueryScope } from './analyticsQueryScope';
import { postedTransactionIds } from './analyticsQueryHelpers';

export async function analyticsGetFilterFacets(port: AnalyticsQueryPort, input: AnalyticsGetFilterFacetsInput = {}): Promise<AnalyticsGetFilterFacetsResult> {
  const scope = await resolveAnalyticsQueryScope(port, input.filters);
  const now = new Date();
  const currentWindow = buildAnalyticsOverviewWindows(scope.filters.period, now, undefined, scope.filters.includePlannedMovements).currentWindow;
  const [{ transactions }, tags] = await Promise.all([
    listScopedAnalyticsMovements(port, scope.filters, currentWindow, false),
    port.taxonomyListTags({ includeArchived: false }),
  ]);
  const transactionIds = postedTransactionIds(transactions);
  const taxonomy = transactionIds.length > 0 ? await port.orchestrationListTransactionTaxonomy({ transactionIds }) : { items: [] };
  const scopedTagIds = new Set(scope.filters.tagIds);
  for (const item of taxonomy.items) for (const tagId of item.tagIds ?? []) scopedTagIds.add(tagId);
  return {
    accounts: scope.compatibleAccounts.map((account) => ({ id: account.id, name: account.name, currency: account.currency })),
    tags: tags.items.filter((tag) => scopedTagIds.has(tag.id)).map((tag) => ({ id: tag.id, name: tag.name })),
  };
}
