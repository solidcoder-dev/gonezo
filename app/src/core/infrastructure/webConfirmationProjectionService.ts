import type { WebExpectedMovementsService } from '../../expected/infrastructure/webExpectedService';
import type { WebSchedulingService } from '../../scheduling/infrastructure/webSchedulingService';

export class WebConfirmationProjectionService {
  private readonly scheduling: WebSchedulingService;
  private readonly expected: WebExpectedMovementsService;

  constructor(
    scheduling: WebSchedulingService,
    expected: WebExpectedMovementsService,
  ) {
    this.scheduling = scheduling;
    this.expected = expected;
  }

  async projectNextOccurrence(recurringMovementId: string): Promise<void> {
    const occurrence = this.scheduling.projectNextConfirmationRequiredOccurrence(recurringMovementId);
    if (!occurrence || occurrence.movement.type === 'transfer') {
      return;
    }

    await this.expected.createMovement({
      accountId: occurrence.movement.sourceAccountId,
      type: occurrence.movement.type,
      amount: occurrence.movement.amount,
      currency: occurrence.movement.currency,
      expectedAt: occurrence.dueAt,
      description: occurrence.movement.description,
      merchant: occurrence.movement.merchant,
      categoryId: occurrence.movement.categoryId,
      splitItems: occurrence.movement.splitItems,
      originOccurrenceId: occurrence.id,
      originRecurringMovementId: occurrence.recurringMovementId,
    });
  }
}
