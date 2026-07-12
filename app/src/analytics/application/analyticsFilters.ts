export type AnalyticsViewMode = 'overview' | 'spending' | 'cashFlow' | 'recurring' | 'accounts';

export type AnalyticsLocalDate = string;

export type AnalyticsSharedAmountMode = 'personal' | 'full';

export type LegacyAnalyticsPeriodPreset = '7D' | '30D' | '90D' | '1Y' | 'ALL' | 'CUSTOM';

export type AnalyticsPeriod =
  | { kind: 'thisMonth' }
  | { kind: 'lastMonth' }
  | { kind: 'rollingDays'; days: number; anchorDate: AnalyticsLocalDate }
  | { kind: 'rollingMonths'; months: number; anchorDate: AnalyticsLocalDate }
  | { kind: 'thisYear' }
  | { kind: 'custom'; from: AnalyticsLocalDate; to: AnalyticsLocalDate }
  | { kind: 'allTime' };

export type AnalyticsFilters = {
  currency: string;
  period: AnalyticsPeriod;
  tagIds: string[];
  accountIds: string[];
  includeIgnoredMovements: boolean;
  sharedAmountMode: AnalyticsSharedAmountMode;
};

export type AnalyticsFiltersInput = Partial<Omit<AnalyticsFilters, 'period'>> & {
  period?: AnalyticsPeriod | LegacyAnalyticsPeriodPreset;
};

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  currency: '',
  period: { kind: 'thisMonth' },
  tagIds: [],
  accountIds: [],
  includeIgnoredMovements: false,
  sharedAmountMode: 'personal',
};

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

function isIsoLocalDate(value: string | undefined): value is AnalyticsLocalDate {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function analyticsReferenceDateFromNow(now = new Date()): AnalyticsLocalDate {
  return now.toISOString().slice(0, 10);
}

export function normalizeAnalyticsPeriodInput(period?: AnalyticsPeriod | LegacyAnalyticsPeriodPreset): AnalyticsPeriod {
  if (!period) {
    return DEFAULT_ANALYTICS_FILTERS.period;
  }
  if (typeof period === 'string') {
    if (period === '7D') {
      return { kind: 'rollingDays', days: 7, anchorDate: analyticsReferenceDateFromNow() };
    }
    if (period === '30D') {
      return { kind: 'rollingDays', days: 30, anchorDate: analyticsReferenceDateFromNow() };
    }
    if (period === '90D') {
      return { kind: 'rollingDays', days: 90, anchorDate: analyticsReferenceDateFromNow() };
    }
    if (period === '1Y') {
      return { kind: 'thisYear' };
    }
    if (period === 'ALL') {
      return { kind: 'allTime' };
    }
    throw new Error(`Unsupported analytics period: ${String(period)}`);
  }
  switch (period.kind) {
    case 'thisMonth':
    case 'lastMonth':
    case 'thisYear':
    case 'allTime':
      return period;
    case 'rollingDays':
      return period.days > 0 && isIsoLocalDate(period.anchorDate)
        ? period
        : { kind: 'rollingDays', days: 30, anchorDate: analyticsReferenceDateFromNow() };
    case 'rollingMonths':
      return period.months > 0 && isIsoLocalDate(period.anchorDate)
        ? period
        : { kind: 'rollingMonths', months: 3, anchorDate: analyticsReferenceDateFromNow() };
    case 'custom':
      return isIsoLocalDate(period.from) && isIsoLocalDate(period.to)
        ? period
        : { kind: 'custom', from: analyticsReferenceDateFromNow(), to: analyticsReferenceDateFromNow() };
    default:
      return DEFAULT_ANALYTICS_FILTERS.period;
  }
}

function normalizeIncludeIgnoredMovements(value?: boolean): boolean {
  return value === true;
}

function normalizeSharedAmountMode(value?: AnalyticsSharedAmountMode): AnalyticsSharedAmountMode {
  return value === 'full' ? 'full' : 'personal';
}

export function normalizeAnalyticsFilters(input?: AnalyticsFiltersInput): AnalyticsFilters {
  return {
    currency: input?.currency?.trim().toUpperCase() ?? '',
    period: normalizeAnalyticsPeriodInput(input?.period),
    tagIds: normalizeIdentifierList(input?.tagIds),
    accountIds: normalizeIdentifierList(input?.accountIds),
    includeIgnoredMovements: normalizeIncludeIgnoredMovements(input?.includeIgnoredMovements),
    sharedAmountMode: normalizeSharedAmountMode(input?.sharedAmountMode),
  };
}

export function mergeAnalyticsFilters(
  base: AnalyticsFilters,
  patch: AnalyticsFiltersInput,
): AnalyticsFilters {
  return normalizeAnalyticsFilters({ ...base, ...patch });
}

export function analyticsPeriodChipLabel(period: AnalyticsPeriod): string {
  switch (period.kind) {
    case 'thisMonth':
      return 'This month';
    case 'lastMonth':
      return 'Last month';
    case 'rollingDays':
      return `${period.days}D`;
    case 'rollingMonths':
      return `${period.months}M`;
    case 'thisYear':
      return 'This year';
    case 'custom':
      return 'Custom';
    case 'allTime':
      return 'All time';
  }
}
