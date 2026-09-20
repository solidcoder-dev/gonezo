import type { AnalyticsListMovementFactsInput } from '../../analytics/application/analytics.port';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';

export type AnalyticsMovementFactQuery = Readonly<{
  period: AnalyticsPeriod;
  timeZone: string;
  currency?: string;
}>;

export function toAnalyticsListMovementFactsInput(query: AnalyticsMovementFactQuery): AnalyticsListMovementFactsInput {
  const [yearText, monthText] = query.period.value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const lastDay = new Date(0);
  lastDay.setUTCFullYear(year, month, 0);

  return {
    fromLocalDate: `${query.period.value}-01`,
    toLocalDate: `${query.period.value}-${String(lastDay.getUTCDate()).padStart(2, '0')}`,
    zoneId: query.timeZone,
    ...(query.currency === undefined ? {} : { currency: query.currency }),
    includePlannedMovements: true,
    includeIgnoredMovements: false,
  };
}
