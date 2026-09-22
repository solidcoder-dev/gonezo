import type { AnalyticsMovementFactItem, AnalyticsMovementFactsPort } from '../../analytics/application/analyticsMovementFacts.contract';
import { macroCategoryCodeFor } from '../domain/macroCategoryCode';
import type { CategoryFact } from '../domain/categoryFact';
import { createSharingFact, type SharingFact } from '../domain/sharingFact';
import type { CanonicalMerchantResolverPort } from '../application/canonicalMerchantResolver.port';
import type { ContributionFactSetSourcePort } from '../application/contributionFactSetSource.port';
import { mapAnalyticsMovementSource } from './analyticsMovementSource';
import { toAnalyticsListMovementFactsInput } from './analyticsMovementFactQuery';
import { adaptAnalyticsMerchantFact } from './analyticsMerchantFactAdapter';
import { adaptAnalyticsMovementFact } from './analyticsMovementFactAdapter';
import { adaptAnalyticsRecurringFact } from './analyticsRecurringFactAdapter';
import { adaptAnalyticsTagUsageFact } from './analyticsTagUsageFactAdapter';

function economicKind(item: AnalyticsMovementFactItem): 'INCOME' | 'EXPENSE' | undefined {
  if (item.type === 'income') return 'INCOME';
  if (item.type === 'expense') return 'EXPENSE';
  return undefined;
}

function projectCategoryFacts(items: readonly AnalyticsMovementFactItem[]): readonly CategoryFact[] {
  return items.flatMap((item) => {
    const kind = economicKind(item);
    if (item.ignored || kind === undefined) return [];
    return item.categoryAllocations.map((allocation, index) => ({
      id: `${item.analyticsFactId}/category/${index}`,
      occurredAt: item.effectiveAt,
      source: mapAnalyticsMovementSource(item.source),
      kind,
      currency: item.currency,
      amount: allocation.personalAmount,
      category: macroCategoryCodeFor(allocation.categoryId, kind),
    }));
  });
}

function projectSharingFacts(items: readonly AnalyticsMovementFactItem[]): readonly SharingFact[] {
  return items.flatMap((item) => {
    const kind = economicKind(item);
    if (!item.sharing || item.ignored || kind === undefined) return [];
    return [createSharingFact({ id: `${item.analyticsFactId}/sharing`, occurredAt: item.effectiveAt, source: mapAnalyticsMovementSource(item.source), kind, currency: item.currency, fullAmount: item.fullAmount, personalAmount: item.personalAmount, participantAllocatedAmount: item.sharing.participantAllocatedAmount, settlementRequiredAmount: item.sharing.settlementRequiredAmount, participantCount: item.sharing.participantCount, settlementParticipantCount: item.sharing.settlementParticipantCount })];
  });
}

export function createAnalyticsContributionFactSetSource(
  analytics: AnalyticsMovementFactsPort,
  merchantResolver: CanonicalMerchantResolverPort,
): ContributionFactSetSourcePort {
  return {
    async readContributionFacts(query) {
      const result = await analytics.analyticsListMovementFacts(toAnalyticsListMovementFactsInput(query));
      const items = Object.freeze([...result.items]);
      return Object.freeze({
        financial: items.map(adaptAnalyticsMovementFact).filter((fact): fact is NonNullable<ReturnType<typeof adaptAnalyticsMovementFact>> => fact !== null),
        categories: projectCategoryFacts(items),
        recurring: items.map(adaptAnalyticsRecurringFact).filter((fact): fact is NonNullable<ReturnType<typeof adaptAnalyticsRecurringFact>> => fact !== null),
        sharing: projectSharingFacts(items),
        merchants: items.map((item) => adaptAnalyticsMerchantFact(item, merchantResolver)).filter((fact): fact is NonNullable<ReturnType<typeof adaptAnalyticsMerchantFact>> => fact !== null),
        tagUsage: items.map(adaptAnalyticsTagUsageFact).filter((fact): fact is NonNullable<ReturnType<typeof adaptAnalyticsTagUsageFact>> => fact !== null),
      });
    },
  };
}
