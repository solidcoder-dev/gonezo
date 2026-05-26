import type {
  MovementsListScheduledInput,
  MovementsListScheduledResult,
} from '../../domain/corePort';
import { filterScheduledMovements } from './coreAdapterWebMovementQueries';
import { paginateWebItems } from './coreAdapterWebPagination';
import type { WebCoreState } from './coreAdapterWebState';

export type WebScheduledMovementsListServiceOptions = {
  state: WebCoreState;
};

export class WebScheduledMovementsListService {
  private readonly state: WebCoreState;

  constructor(options: WebScheduledMovementsListServiceOptions) {
    this.state = options.state;
  }

  async listScheduled(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult> {
    const sorted = [...filterScheduledMovements(this.state.recurringMovements, {
      accountId: input.accountId,
      filters: input.filters,
    })];

    const sort = input.sort && input.sort.length > 0
      ? input.sort
      : [{ field: 'nextDueAt' as const, direction: 'asc' as const }];

    sorted.sort((left, right) => {
      for (const criterion of sort) {
        let comparison = 0;
        if (criterion.field === 'amount') {
          const leftAmount = Number(left.amount);
          const rightAmount = Number(right.amount);
          const safeLeft = Number.isFinite(leftAmount) ? leftAmount : 0;
          const safeRight = Number.isFinite(rightAmount) ? rightAmount : 0;
          comparison = safeLeft - safeRight;
        } else {
          const leftDue = left.nextDueAt ?? left.startAt;
          const rightDue = right.nextDueAt ?? right.startAt;
          comparison = leftDue.localeCompare(rightDue);
        }
        if (comparison !== 0) {
          return criterion.direction === 'asc' ? comparison : -comparison;
        }
      }
      return left.id.localeCompare(right.id);
    });

    const page = paginateWebItems(sorted, input.pagination);
    return {
      ...page,
      content: page.content.map((item) => ({ ...item })),
    };
  }
}
