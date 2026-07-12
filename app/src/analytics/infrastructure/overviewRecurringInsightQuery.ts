import { resolveSchedulingKind } from '../../shared/domain/schedulingKind';
import { filterScheduledMovements } from '../../scheduling/application/scheduledMovementFilters';
import type {
  SchedulingListMovementsInput,
  SchedulingListMovementsResult,
  SchedulingMovementItem,
} from '../../scheduling/application/scheduling.port';
import type { AnalyticsFiltersInput } from '../application/analyticsFilters';
import { buildOverviewRecurringInsight } from '../application/overviewRecurringInsight';

type OverviewRecurringInsightQueryPort = {
  schedulingListMovements(input: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult>;
};

function recurringWindowFilters(
  filters: AnalyticsFiltersInput | undefined,
  window: { start: Date; end: Date },
) {
  return {
    fromDate: window.start.toISOString(),
    toDate: new Date(window.end.getTime() - 1).toISOString(),
    tagIds: filters?.tagIds,
  };
}

export async function analyticsGetOverviewRecurringInsight(
  port: OverviewRecurringInsightQueryPort,
  input: {
    accountIds: string[];
    filters?: AnalyticsFiltersInput;
    window: { start: Date; end: Date };
  },
) {
  const scheduledByAccount = await Promise.all(
    input.accountIds.map(async (accountId) => {
      const result = await port.schedulingListMovements({ sourceAccountId: accountId });
      return filterScheduledMovements(
        result.items.map((item) => ({ ...item, createdAt: item.startAt })),
        {
          accountId,
          filters: recurringWindowFilters(input.filters, input.window),
        },
      );
    }),
  );

  const recurringMovements = scheduledByAccount
    .flat()
    .filter((movement) => movement.status === 'active')
    .filter((movement): movement is SchedulingMovementItem => resolveSchedulingKind(movement) === 'recurring');

  return buildOverviewRecurringInsight(recurringMovements);
}
