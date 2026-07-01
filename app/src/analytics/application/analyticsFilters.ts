import type { LedgerTransactionType } from '../../ledger/application/ledger.port';

export type AnalyticsViewMode = 'overview' | 'spending' | 'cashFlow' | 'recurring' | 'accounts';

export type AnalyticsPeriodPreset = '3M' | '6M' | '12M';

export type AnalyticsMovementTypeFilter = Extract<LedgerTransactionType, 'income' | 'expense' | 'transfer'>;

export type AnalyticsRecurringFilter = 'all' | 'postedOnly' | 'recurringOnly';

export type AnalyticsGroupBy = 'monthly' | 'weekly';

export type AnalyticsFilters = {
  currency: string;
  period: AnalyticsPeriodPreset;
  tagIds: string[];
  accountIds: string[];
  movementTypes: AnalyticsMovementTypeFilter[];
  recurring: AnalyticsRecurringFilter;
  groupBy: AnalyticsGroupBy;
};

export type AnalyticsFiltersInput = Partial<AnalyticsFilters>;

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  currency: '',
  period: '6M',
  tagIds: [],
  accountIds: [],
  movementTypes: [],
  recurring: 'postedOnly',
  groupBy: 'monthly',
};

export function analyticsPeriodMonths(period: AnalyticsPeriodPreset): number {
  if (period === '3M') {
    return 3;
  }
  if (period === '12M') {
    return 12;
  }
  return 6;
}

function normalizeIdentifierList(values?: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const rawValue of values ?? []) {
    const value = rawValue.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

function normalizePeriod(period?: AnalyticsPeriodPreset): AnalyticsPeriodPreset {
  return period === '3M' || period === '12M' ? period : '6M';
}

function normalizeRecurring(recurring?: AnalyticsRecurringFilter): AnalyticsRecurringFilter {
  if (recurring === 'all' || recurring === 'recurringOnly') {
    return recurring;
  }
  return 'postedOnly';
}

function normalizeGroupBy(groupBy?: AnalyticsGroupBy): AnalyticsGroupBy {
  return groupBy === 'weekly' ? 'weekly' : 'monthly';
}

function normalizeMovementTypes(values?: AnalyticsMovementTypeFilter[]): AnalyticsMovementTypeFilter[] {
  const allowed = new Set<AnalyticsMovementTypeFilter>(['income', 'expense', 'transfer']);
  return normalizeIdentifierList(values).filter((value): value is AnalyticsMovementTypeFilter => (
    allowed.has(value as AnalyticsMovementTypeFilter)
  ));
}

export function normalizeAnalyticsFilters(input?: AnalyticsFiltersInput): AnalyticsFilters {
  return {
    currency: input?.currency?.trim().toUpperCase() ?? '',
    period: normalizePeriod(input?.period),
    tagIds: normalizeIdentifierList(input?.tagIds),
    accountIds: normalizeIdentifierList(input?.accountIds),
    movementTypes: normalizeMovementTypes(input?.movementTypes),
    recurring: normalizeRecurring(input?.recurring),
    groupBy: normalizeGroupBy(input?.groupBy),
  };
}

export function mergeAnalyticsFilters(
  base: AnalyticsFilters,
  patch: AnalyticsFiltersInput,
): AnalyticsFilters {
  return normalizeAnalyticsFilters({ ...base, ...patch });
}
