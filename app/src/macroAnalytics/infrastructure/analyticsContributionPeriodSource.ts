import type { AnalyticsListMovementFactsInput, AnalyticsListMovementFactsResult } from '../../analytics/application/analytics.port';
import type { ContributionPeriodSourcePort } from '../application/contributionPeriodSource.port';
import { analyticsPeriodForFact } from '../domain/analyticsPeriod';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import { adaptAnalyticsMovementFact } from './analyticsMovementFactAdapter';

type AnalyticsMovementFactReader = Readonly<{
  analyticsListMovementFacts(input: AnalyticsListMovementFactsInput): Promise<AnalyticsListMovementFactsResult>;
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
      const periods = new Map<string, AnalyticsPeriod>();
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
