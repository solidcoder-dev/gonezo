export type AnalyticsViewMode = 'overview' | 'spending' | 'cashFlow' | 'recurring' | 'accounts';

export type AnalyticsPeriodPreset = '7D' | '30D' | '90D' | '1Y' | 'ALL';

export type AnalyticsFilters = {
  currency: string;
  period: AnalyticsPeriodPreset;
  tagIds: string[];
  accountIds: string[];
  includeIgnoredMovements: boolean;
};

export type AnalyticsFiltersInput = Partial<AnalyticsFilters>;

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  currency: '',
  period: '30D',
  tagIds: [],
  accountIds: [],
  includeIgnoredMovements: false,
};

export function analyticsPeriodMonths(period: AnalyticsPeriodPreset): number {
  if (period === '7D' || period === '30D') {
    return 1;
  }
  if (period === '90D') {
    return 3;
  }
  if (period === '1Y') {
    return 12;
  }
  return 12;
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
  if (period === '7D' || period === '30D' || period === '90D' || period === '1Y' || period === 'ALL') {
    return period;
  }
  return '30D';
}

function normalizeIncludeIgnoredMovements(value?: boolean): boolean {
  return value === true;
}

export function normalizeAnalyticsFilters(input?: AnalyticsFiltersInput): AnalyticsFilters {
  return {
    currency: input?.currency?.trim().toUpperCase() ?? '',
    period: normalizePeriod(input?.period),
    tagIds: normalizeIdentifierList(input?.tagIds),
    accountIds: normalizeIdentifierList(input?.accountIds),
    includeIgnoredMovements: normalizeIncludeIgnoredMovements(input?.includeIgnoredMovements),
  };
}

export function mergeAnalyticsFilters(
  base: AnalyticsFilters,
  patch: AnalyticsFiltersInput,
): AnalyticsFilters {
  return normalizeAnalyticsFilters({ ...base, ...patch });
}
