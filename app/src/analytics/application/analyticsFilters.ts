import type { LedgerTransactionType } from '../../ledger/application/ledger.port';

export type AnalyticsViewMode = 'overview' | 'spending' | 'cashFlow' | 'recurring' | 'accounts';

export type AnalyticsPeriodPreset = '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';

export type AnalyticsMovementTypeFilter = Extract<LedgerTransactionType, 'income' | 'expense' | 'transfer'>;

export type AnalyticsFilters = {
  currency: string;
  period: AnalyticsPeriodPreset;
  tagIds: string[];
  accountIds: string[];
  movementTypes: AnalyticsMovementTypeFilter[];
};

export type AnalyticsFiltersInput = Partial<AnalyticsFilters>;

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  currency: '',
  period: '1M',
  tagIds: [],
  accountIds: [],
  movementTypes: [],
};

export function analyticsPeriodMonths(period: AnalyticsPeriodPreset): number {
  if (period === '1W' || period === '1M') {
    return 1;
  }
  if (period === '3M') {
    return 3;
  }
  if (period === '1Y') {
    return 12;
  }
  if (period === '5Y') {
    return 60;
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
  if (period === '1W' || period === '3M' || period === '6M' || period === '1Y' || period === '5Y' || period === 'ALL') {
    return period;
  }
  return '1M';
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
  };
}

export function mergeAnalyticsFilters(
  base: AnalyticsFilters,
  patch: AnalyticsFiltersInput,
): AnalyticsFilters {
  return normalizeAnalyticsFilters({ ...base, ...patch });
}
