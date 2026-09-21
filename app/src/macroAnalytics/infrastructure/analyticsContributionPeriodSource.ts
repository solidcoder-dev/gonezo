import type { AnalyticsListMovementFactsInput, AnalyticsListMovementFactsResult } from '../../analytics/application/analytics.port';
import type { ContributionPeriodSourcePort } from '../application/contributionPeriodSource.port';
import { analyticsPeriodForFact, createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import { adaptAnalyticsMovementFact } from './analyticsMovementFactAdapter';

type AnalyticsMovementFactReader = Readonly<{
  analyticsListMovementFacts(input: AnalyticsListMovementFactsInput): Promise<AnalyticsListMovementFactsResult>;
  analyticsGetAccountBalanceCoverage(input: { zoneId: string }): Promise<{ firstAccountLocalDate?: string }>;
}>;

export function createAnalyticsContributionPeriodSource(analytics: AnalyticsMovementFactReader): ContributionPeriodSourcePort {
  return {
    async listPeriods(timeZone, through) {
      const year = Number(through.value.slice(0, 4));
      const month = Number(through.value.slice(5, 7));
      const lastDay = new Date(0);
      lastDay.setUTCFullYear(year, month, 0);
      const result = await analytics.analyticsListMovementFacts({
        fromLocalDate: '0001-01-01',
        toLocalDate: `${through.value}-${String(lastDay.getUTCDate()).padStart(2, '0')}`,
        zoneId: timeZone,
        includePlannedMovements: true,
        includeIgnoredMovements: false,
      });
      const coverage = await analytics.analyticsGetAccountBalanceCoverage({ zoneId: timeZone });
      const periods = new Map<string, AnalyticsPeriod>();
      if (coverage.firstAccountLocalDate) {
        const firstMonth = coverage.firstAccountLocalDate.slice(0, 7);
        for (let current = firstMonth; current <= through.value; current = nextMonth(current)) {
          const period = createAnalyticsPeriod(current);
          periods.set(period.value, period);
        }
      }
      for (const item of result.items) {
        const fact = adaptAnalyticsMovementFact(item);
        if (!fact) continue;
        const period = analyticsPeriodForFact(fact, timeZone);
        if (period.value <= through.value) periods.set(period.value, period);
      }
      return [...periods.values()].sort((left, right) => left.value.localeCompare(right.value));
    },
  };
}

function nextMonth(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const next = new Date(0);
  next.setUTCFullYear(year, month, 1);
  return next.toISOString().slice(0, 7);
}
