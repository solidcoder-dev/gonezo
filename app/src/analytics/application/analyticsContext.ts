import {
  DEFAULT_ANALYTICS_FILTERS,
  normalizeAnalyticsFilters,
  normalizeAnalyticsPeriodInput,
  type AnalyticsFilters,
  type AnalyticsFiltersInput,
  type AnalyticsPeriod,
} from './analyticsFilters';

export type AnalyticsContext = AnalyticsFilters;

export function serializeAnalyticsContext(input: AnalyticsFiltersInput | AnalyticsFilters): string {
  const context = normalizeAnalyticsFilters(input);
  const params = new URLSearchParams();
  if (context.currency) params.set('currency', context.currency);
  writePeriod(params, context.period);
  if (context.accountIds.length) params.set('accounts', context.accountIds.join(','));
  if (context.tagIds.length) params.set('tags', context.tagIds.join(','));
  if (context.includeIgnoredMovements) params.set('ignored', '1');
  if (!context.includePlannedMovements) params.set('planned', '0');
  if (context.sharedAmountMode === 'full') params.set('shared', 'full');
  return params.toString();
}

export function parseAnalyticsContext(search: string): AnalyticsContext {
  const params = new URLSearchParams(search);
  const period = readPeriod(params);
  return normalizeAnalyticsFilters({
    currency: params.get('currency') ?? DEFAULT_ANALYTICS_FILTERS.currency,
    period,
    accountIds: splitList(params.get('accounts')),
    tagIds: splitList(params.get('tags')),
    includeIgnoredMovements: params.get('ignored') === '1',
    includePlannedMovements: params.get('planned') !== '0',
    sharedAmountMode: params.get('shared') === 'full' ? 'full' : 'personal',
  });
}

function writePeriod(params: URLSearchParams, period: AnalyticsPeriod): void {
  switch (period.kind) {
    case 'thisMonth': params.set('period', 'thisMonth'); break;
    case 'lastMonth': params.set('period', 'lastMonth'); break;
    case 'thisYear': params.set('period', 'thisYear'); break;
    case 'allTime': params.set('period', 'allTime'); break;
    case 'rollingDays':
      params.set('period', 'rollingDays');
      params.set('days', String(period.days));
      params.set('anchor', period.anchorDate);
      break;
    case 'rollingMonths':
      params.set('period', 'rollingMonths');
      params.set('months', String(period.months));
      params.set('anchor', period.anchorDate);
      break;
    case 'custom':
      params.set('period', 'custom');
      params.set('from', period.from);
      params.set('to', period.to);
      break;
  }
}

function readPeriod(params: URLSearchParams): AnalyticsPeriod {
  const kind = params.get('period');
  if (kind === 'lastMonth' || kind === 'thisYear' || kind === 'allTime' || kind === 'thisMonth') return { kind };
  if (kind === 'rollingDays') return normalizeAnalyticsPeriodInput({ kind, days: numberParam(params.get('days'), 30), anchorDate: params.get('anchor') ?? '' });
  if (kind === 'rollingMonths') return normalizeAnalyticsPeriodInput({ kind, months: numberParam(params.get('months'), 3), anchorDate: params.get('anchor') ?? '' });
  if (kind === 'custom') return normalizeAnalyticsPeriodInput({ kind, from: params.get('from') ?? '', to: params.get('to') ?? '' });
  return DEFAULT_ANALYTICS_FILTERS.period;
}

function numberParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function splitList(value: string | null): string[] {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}
