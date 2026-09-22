import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';
import { createFinancialFact, type FinancialFact } from '../domain/financialFact';
import { createSharingFact, type SharingFact } from '../domain/sharingFact';
import { createRecurringFact, type RecurringFact } from '../domain/recurringFact';
import { createMerchantFact, type MerchantFact } from '../domain/merchantFact';
import { createTagUsageFact, type TagUsageFact } from '../domain/tagUsageFact';
import type { CanonicalMerchantResolverPort } from './canonicalMerchantResolver.port';
import { UNMAPPED_MACRO_MERCHANT_CODE } from '../domain/macroMerchantCode';
import { macroCategoryCodeFor } from '../domain/macroCategoryCode';
import type { CategoryFact } from '../domain/categoryFact';
import type { AnalyticsPeriodSnapshot } from './analyticsPeriodSnapshot.port';

function sourceOf(item: AnalyticsMovementFactItem): 'POSTED' | 'EXPECTED' | 'SCHEDULED' {
  return item.source === 'SCHEDULED_PROJECTION' ? 'SCHEDULED' : item.source;
}

function economicKind(item: AnalyticsMovementFactItem): 'INCOME' | 'EXPENSE' | undefined {
  if (item.type === 'income') return 'INCOME';
  if (item.type === 'expense') return 'EXPENSE';
  return undefined;
}

export function projectFinancialFacts(snapshot: AnalyticsPeriodSnapshot): readonly FinancialFact[] {
  return snapshot.movements.flatMap((item) => {
    if (item.ignored) return [];
    return [createFinancialFact({ id: item.analyticsFactId, occurredAt: item.effectiveAt, source: sourceOf(item), kind: item.type.toUpperCase() as FinancialFact['kind'], amount: item.personalAmount, currency: item.currency })];
  });
}

export function projectCategoryFacts(snapshot: AnalyticsPeriodSnapshot): readonly CategoryFact[] {
  return snapshot.movements.flatMap((item) => {
    const kind = economicKind(item);
    if (item.ignored || !kind) return [];
    return item.categoryAllocations.map((allocation, index) => ({
      id: `${item.analyticsFactId}/category/${index}`, occurredAt: item.effectiveAt, source: sourceOf(item), kind,
      currency: item.currency, amount: allocation.personalAmount, category: macroCategoryCodeFor(allocation.categoryId, kind),
    }));
  });
}

export function projectRecurringFacts(snapshot: AnalyticsPeriodSnapshot): readonly RecurringFact[] {
  return snapshot.movements.flatMap((item) => {
    const kind = economicKind(item);
    if (item.ignored || item.schedulingOrigin?.kind !== 'recurring' || !kind) return [];
    return [createRecurringFact({ id: `${item.analyticsFactId}/recurring`, occurredAt: item.effectiveAt, source: sourceOf(item), kind, currency: item.currency, amount: item.personalAmount, seriesId: `series/${item.schedulingOrigin.recurringMovementId}` })];
  });
}

export function projectSharingFacts(snapshot: AnalyticsPeriodSnapshot): readonly SharingFact[] {
  return snapshot.movements.flatMap((item) => {
    const kind = economicKind(item);
    if (!item.sharing || item.ignored || !kind) return [];
    return [createSharingFact({ id: `${item.analyticsFactId}/sharing`, occurredAt: item.effectiveAt, source: sourceOf(item), kind, currency: item.currency, fullAmount: item.fullAmount, personalAmount: item.personalAmount, participantAllocatedAmount: item.sharing.participantAllocatedAmount, settlementRequiredAmount: item.sharing.settlementRequiredAmount, participantCount: item.sharing.participantCount, settlementParticipantCount: item.sharing.settlementParticipantCount })];
  });
}

export function projectMerchantFacts(snapshot: AnalyticsPeriodSnapshot, resolver: CanonicalMerchantResolverPort): readonly MerchantFact[] {
  return snapshot.movements.flatMap((item) => {
    const kind = economicKind(item);
    if (item.ignored || !item.merchant || !kind) return [];
    return [createMerchantFact({ id: `${item.analyticsFactId}/merchant`, occurredAt: item.effectiveAt, source: sourceOf(item), kind, currency: item.currency, amount: item.personalAmount, merchant: resolver.resolve({ merchantKey: item.merchant.key }) ?? UNMAPPED_MACRO_MERCHANT_CODE })];
  });
}

export function projectTagUsageFacts(snapshot: AnalyticsPeriodSnapshot): readonly TagUsageFact[] {
  return snapshot.movements.flatMap((item) => {
    const kind = economicKind(item);
    if (item.ignored || !kind) return [];
    return [createTagUsageFact({ id: `${item.analyticsFactId}/tag-usage`, occurredAt: item.effectiveAt, source: sourceOf(item), kind, currency: item.currency, amount: item.personalAmount, tagCount: new Set(item.tags.map((tag) => tag.key)).size })];
  });
}
