import type { AnalyticsCurrencyScopeInput, AnalyticsOverviewHighlight, AnalyticsOverviewWindow } from './analyticsCommon.contract';
import type { AnalyticsFiltersInput } from './analyticsFilters';

export type AnalyticsListCurrenciesResult = { items: string[] };
export type AnalyticsFilterFacetAccount = { id: string; name: string; currency: string };
export type AnalyticsFilterFacetTag = { id: string; name: string };
export type AnalyticsGetFilterFacetsInput = { filters?: AnalyticsFiltersInput };
export type AnalyticsGetFilterFacetsResult = { accounts: AnalyticsFilterFacetAccount[]; tags: AnalyticsFilterFacetTag[] };
export type AnalyticsOverviewTotals = { incomeAmount: string; expenseAmount: string; inflowAmount?: string; outflowAmount?: string; netFlowAmount: string };
export type AnalyticsOverviewSnapshotInput = AnalyticsCurrencyScopeInput;
export type AnalyticsOverviewSnapshotResult = { currentWindow: AnalyticsOverviewWindow; previousWindow?: AnalyticsOverviewWindow; currentTotals: AnalyticsOverviewTotals; previousTotals?: AnalyticsOverviewTotals; netFlowChangePercent?: string; biggestExpense?: AnalyticsOverviewHighlight; biggestIncome?: AnalyticsOverviewHighlight };
export type AnalyticsOverviewInsightKey = 'topTags' | 'sharedExpenses' | 'mostSharedWith' | 'recurringImpact' | 'transfers';
export type AnalyticsOverviewInsightItem = { key: AnalyticsOverviewInsightKey; title: string; subtitle: string; amount: string; filterIntent?: 'topTags' | 'sharedExpenses' | 'mostSharedWith' | 'transfers' | 'recurringImpact'; tagIds?: string[]; sharingPersonId?: string };
export type AnalyticsOverviewInsightsInput = AnalyticsCurrencyScopeInput;
export type AnalyticsOverviewInsightsResult = { items: AnalyticsOverviewInsightItem[] };
export type { AnalyticsOverviewHighlight, AnalyticsOverviewWindow };
