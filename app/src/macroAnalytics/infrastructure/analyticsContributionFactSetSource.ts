import type { AnalyticsMovementFactItem, AnalyticsMovementFactsPort } from '../../analytics/application/analyticsMovementFacts.contract';
import { macroCategoryCodeFor } from '../domain/macroCategoryCode';
import { UNMAPPED_MACRO_MERCHANT_CODE } from '../domain/macroMerchantCode';
import { createFinancialFact, type FinancialFact } from '../domain/financialFact';
import type { CategoryFact } from '../domain/categoryFact';
import { createRecurringFact, type RecurringFact } from '../domain/recurringFact';
import { createSharingFact, type SharingFact } from '../domain/sharingFact';
import { createMerchantFact, type MerchantFact } from '../domain/merchantFact';
import { createTagUsageFact, type TagUsageFact } from '../domain/tagUsageFact';
import type { CanonicalMerchantResolverPort } from '../application/canonicalMerchantResolver.port';
import type { ContributionFactSetSourcePort } from '../application/contributionFactSetSource.port';
import { mapAnalyticsMovementSource } from './analyticsMovementSource';
import { toAnalyticsListMovementFactsInput } from './analyticsMovementFactQuery';

function economicKind(item: AnalyticsMovementFactItem): 'INCOME' | 'EXPENSE' | undefined {
  if (item.type === 'income') return 'INCOME';
  if (item.type === 'expense') return 'EXPENSE';
  return undefined;
}

const financialFactKindByAnalyticsType = {
  income: 'INCOME',
  expense: 'EXPENSE',
  transfer_in: 'TRANSFER_IN',
  transfer_out: 'TRANSFER_OUT',
} as const satisfies Record<AnalyticsMovementFactItem['type'], FinancialFact['kind']>;

function projectFinancialFacts(items: readonly AnalyticsMovementFactItem[]): readonly FinancialFact[] {
  return items.flatMap((item) => item.ignored ? [] : [createFinancialFact({
    id: item.analyticsFactId,
    occurredAt: item.effectiveAt,
    source: mapAnalyticsMovementSource(item.source),
    kind: financialFactKindByAnalyticsType[item.type],
    amount: item.personalAmount,
    currency: item.currency,
  })]);
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

function projectRecurringFacts(items: readonly AnalyticsMovementFactItem[]): readonly RecurringFact[] {
  return items.flatMap((item) => {
    const kind = economicKind(item);
    if (item.ignored || item.schedulingOrigin?.kind !== 'recurring' || kind === undefined) return [];
    return [createRecurringFact({ id: `${item.analyticsFactId}/recurring`, occurredAt: item.effectiveAt, source: mapAnalyticsMovementSource(item.source), kind, currency: item.currency, amount: item.personalAmount, seriesId: `series/${item.schedulingOrigin.recurringMovementId}` })];
  });
}

function projectSharingFacts(items: readonly AnalyticsMovementFactItem[]): readonly SharingFact[] {
  return items.flatMap((item) => {
    const kind = economicKind(item);
    if (!item.sharing || item.ignored || kind === undefined) return [];
    return [createSharingFact({ id: `${item.analyticsFactId}/sharing`, occurredAt: item.effectiveAt, source: mapAnalyticsMovementSource(item.source), kind, currency: item.currency, fullAmount: item.fullAmount, personalAmount: item.personalAmount, participantAllocatedAmount: item.sharing.participantAllocatedAmount, settlementRequiredAmount: item.sharing.settlementRequiredAmount, participantCount: item.sharing.participantCount, settlementParticipantCount: item.sharing.settlementParticipantCount })];
  });
}

function projectMerchantFacts(items: readonly AnalyticsMovementFactItem[], resolver: CanonicalMerchantResolverPort): readonly MerchantFact[] {
  return items.flatMap((item) => {
    const kind = economicKind(item);
    if (item.ignored || !item.merchant || kind === undefined) return [];
    return [createMerchantFact({ id: `${item.analyticsFactId}/merchant`, occurredAt: item.effectiveAt, source: mapAnalyticsMovementSource(item.source), kind, currency: item.currency, amount: item.personalAmount, merchant: resolver.resolve({ merchantKey: item.merchant.key }) ?? UNMAPPED_MACRO_MERCHANT_CODE })];
  });
}

function projectTagUsageFacts(items: readonly AnalyticsMovementFactItem[]): readonly TagUsageFact[] {
  return items.flatMap((item) => {
    const kind = economicKind(item);
    if (item.ignored || kind === undefined) return [];
    return [createTagUsageFact({ id: `${item.analyticsFactId}/tag-usage`, occurredAt: item.effectiveAt, source: mapAnalyticsMovementSource(item.source), kind, currency: item.currency, amount: item.personalAmount, tagCount: new Set(item.tags.map((tag) => tag.key)).size })];
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
        financial: projectFinancialFacts(items),
        categories: projectCategoryFacts(items),
        recurring: projectRecurringFacts(items),
        sharing: projectSharingFacts(items),
        merchants: projectMerchantFacts(items, merchantResolver),
        tagUsage: projectTagUsageFacts(items),
      });
    },
  };
}
