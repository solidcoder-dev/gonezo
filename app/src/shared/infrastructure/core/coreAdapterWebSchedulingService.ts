import type {
  RecurrenceCreateRecurringMovementInput,
  RecurrenceCreateRecurringMovementResult,
  RecurrenceDeactivateRecurringMovementInput,
  RecurrenceListRecurringMovementsInput,
  RecurrenceListRecurringMovementsResult,
  MovementsListScheduledInput,
  MovementsListScheduledResult,
  SchedulingCreateMovementInput,
  SchedulingCreateMovementResult,
  SchedulingDeactivateMovementInput,
  SchedulingListMovementsInput,
  SchedulingListMovementsResult,
  SchedulingMovementItem,
  SchedulingUpdateMovementInput,
  SchedulingUpdateMovementResult,
} from '../../domain/corePort';
import { resolveSchedulingKind } from '../../domain/schedulingKind';
import type { CoreAdapterWebDependencies } from './coreAdapterWebEffects';
import type { WebLedgerService } from './coreAdapterWebLedgerService';
import {
  compareScheduledMovementByDue,
  filterScheduledMovements,
  isScheduledMovementVisibleForAccount,
} from './coreAdapterWebMovementQueries';
import {
  firstDueAtForWebRecurrence,
  normalizeWebRecurrenceEnd,
  normalizeWebRecurrenceRule,
} from './coreAdapterWebRecurrence';
import type {
  WebCoreState,
  WebRecurringMovement,
} from './coreAdapterWebState';

export type WebSchedulingServiceOptions = {
  state: WebCoreState;
  dependencies: CoreAdapterWebDependencies;
  ledger: WebLedgerService;
};

export class WebSchedulingService {
  private readonly state: WebCoreState;

  private readonly dependencies: CoreAdapterWebDependencies;

  private readonly ledger: WebLedgerService;

  constructor(options: WebSchedulingServiceOptions) {
    this.state = options.state;
    this.dependencies = options.dependencies;
    this.ledger = options.ledger;
  }

  private nowIso(): string {
    return this.dependencies.clock.nowIso();
  }

  private nextId(): string {
    return this.dependencies.idGenerator.nextId();
  }

  async createRecurringMovement(
    input: RecurrenceCreateRecurringMovementInput,
  ): Promise<RecurrenceCreateRecurringMovementResult> {
    const sourceAccount = this.ledger.getAccountOrThrow(input.sourceAccountId);
    if (sourceAccount.status !== 'active') {
      throw new Error('Source account is archived');
    }

    if (input.type === 'transfer') {
      if (!input.targetAccountId) {
        throw new Error('targetAccountId is required for transfer recurrence');
      }
      const targetAccount = this.ledger.getAccountOrThrow(input.targetAccountId);
      if (targetAccount.status !== 'active') {
        throw new Error('Target account is archived');
      }
      if (targetAccount.id === sourceAccount.id) {
        throw new Error('Source and target accounts must be different');
      }
    }

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Recurring amount must be greater than 0');
    }
    const destinationAmount = input.destinationAmount == null ? undefined : Number(input.destinationAmount);
    if (destinationAmount != null && (!Number.isFinite(destinationAmount) || destinationAmount <= 0)) {
      throw new Error('Recurring destination amount must be greater than 0');
    }
    const normalizedRule = normalizeWebRecurrenceRule(input.rule);
    const normalizedEnd = normalizeWebRecurrenceEnd(input.recurrenceEnd);
    const nextDueAt = firstDueAtForWebRecurrence({
      startAt: input.startAt,
      zoneId: input.zoneId,
      rule: normalizedRule,
      recurrenceEnd: normalizedEnd,
    });
    const id = this.nextId();
    const movement: WebRecurringMovement = {
      id,
      type: input.type,
      sourceAccountId: input.sourceAccountId,
      targetAccountId: input.targetAccountId?.trim() || undefined,
      amount: amount.toFixed(2),
      currency: input.currency.trim().toUpperCase(),
      destinationAmount: destinationAmount?.toFixed(2),
      destinationCurrency: input.destinationCurrency?.trim().toUpperCase() || undefined,
      exchangeRate: input.exchangeRate ? String(Number(input.exchangeRate)) : undefined,
      description: input.description?.trim() || undefined,
      merchant: input.merchant?.trim() || undefined,
      categoryId: input.categoryId?.trim() || undefined,
      tagIds: [...new Set((input.tagIds ?? []).map((value) => value.trim()).filter((value) => value.length > 0))],
      tagNames: [...new Set((input.tagNames ?? []).map((value) => value.trim()).filter((value) => value.length > 0))],
      splitItems: (input.splitItems ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        amount: Number(item.amount).toFixed(2),
      })),
      scheduleKind: 'recurring',
      origin: 'recurring',
      status: nextDueAt ? 'active' : 'completed',
      startAt: new Date(input.startAt).toISOString(),
      nextDueAt,
      zoneId: input.zoneId.trim(),
      generatedOccurrences: 0,
      rule: normalizedRule,
      recurrenceEnd: normalizedEnd,
      createdAt: this.nowIso(),
      completedAt: nextDueAt ? undefined : this.nowIso(),
    };
    this.state.recurringMovements.push(movement);
    return { id };
  }

  async deactivateRecurringMovement(input: RecurrenceDeactivateRecurringMovementInput): Promise<void> {
    const movement = this.state.recurringMovements.find((item) => item.id === input.recurringMovementId);
    if (!movement) {
      throw new Error(`Recurring movement not found: ${input.recurringMovementId}`);
    }
    if (movement.status !== 'active') {
      return;
    }
    movement.status = 'deactivated';
    movement.nextDueAt = undefined;
    movement.deactivatedAt = input.deactivatedAt ? new Date(input.deactivatedAt).toISOString() : this.nowIso();
  }

  async listRecurringMovements(
    input: RecurrenceListRecurringMovementsInput,
  ): Promise<RecurrenceListRecurringMovementsResult> {
    const items = this.state.recurringMovements
      .filter((movement) => isScheduledMovementVisibleForAccount(movement, input.sourceAccountId))
      .sort(compareScheduledMovementByDue)
      .map((movement) => ({ ...movement }));
    return { items };
  }

  async createMovement(
    input: SchedulingCreateMovementInput,
  ): Promise<SchedulingCreateMovementResult> {
    const result = await this.createRecurringMovement(input);
    if (input.scheduleKind === 'one_shot') {
      const movement = this.state.recurringMovements.find((item) => item.id === result.id);
      if (movement) {
        movement.scheduleKind = 'one_shot';
        movement.origin = 'one_shot';
      }
    }
    return result;
  }

  async updateMovement(
    input: SchedulingUpdateMovementInput,
  ): Promise<SchedulingUpdateMovementResult> {
    const movement = this.state.recurringMovements.find((item) => item.id === input.recurringMovementId);
    if (!movement) {
      throw new Error(`Recurring movement not found: ${input.recurringMovementId}`);
    }
    if (movement.status !== 'active') {
      throw new Error('Only active scheduled movements can be edited');
    }

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Recurring amount must be greater than 0');
    }

    const destinationAmount = input.destinationAmount == null ? undefined : Number(input.destinationAmount);
    if (destinationAmount != null && (!Number.isFinite(destinationAmount) || destinationAmount <= 0)) {
      throw new Error('Recurring destination amount must be greater than 0');
    }

    const normalizedRule = normalizeWebRecurrenceRule(input.rule);
    const normalizedEnd = normalizeWebRecurrenceEnd(input.recurrenceEnd);
    const nextDueAt = movement.generatedOccurrences === 0
      ? firstDueAtForWebRecurrence({
          startAt: input.startAt,
          zoneId: input.zoneId,
          rule: normalizedRule,
          recurrenceEnd: normalizedEnd,
        })
      : movement.nextDueAt;

    movement.type = input.type;
    movement.sourceAccountId = input.sourceAccountId;
    movement.targetAccountId = input.targetAccountId?.trim() || undefined;
    movement.amount = amount.toFixed(2);
    movement.currency = input.currency.trim().toUpperCase();
    movement.destinationAmount = destinationAmount?.toFixed(2);
    movement.destinationCurrency = input.destinationCurrency?.trim().toUpperCase() || undefined;
    movement.exchangeRate = input.exchangeRate ? String(Number(input.exchangeRate)) : undefined;
    movement.description = input.description?.trim() || undefined;
    movement.merchant = input.merchant?.trim() || undefined;
    movement.categoryId = input.categoryId?.trim() || undefined;
    movement.tagIds = [...new Set((input.tagIds ?? []).map((value) => value.trim()).filter((value) => value.length > 0))];
    movement.tagNames = [...new Set((input.tagNames ?? []).map((value) => value.trim()).filter((value) => value.length > 0))];
    movement.splitItems = (input.splitItems ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      amount: Number(item.amount).toFixed(2),
    }));
    movement.scheduleKind = input.scheduleKind ?? movement.scheduleKind ?? resolveSchedulingKind(movement);
    movement.origin = movement.scheduleKind;
    movement.rule = normalizedRule;
    movement.recurrenceEnd = normalizedEnd;
    movement.startAt = new Date(input.startAt).toISOString();
    movement.zoneId = input.zoneId.trim();
    movement.nextDueAt = nextDueAt;
    movement.deactivatedAt = undefined;
    movement.completedAt = nextDueAt ? undefined : this.nowIso();
    movement.status = nextDueAt ? 'active' : 'completed';

    return { id: movement.id };
  }

  async deactivateMovement(input: SchedulingDeactivateMovementInput): Promise<void> {
    await this.deactivateRecurringMovement(input);
  }

  async listMovements(input: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult> {
    const result = await this.listRecurringMovements(input);
    return {
      items: result.items.map((item) => ({ ...item })) as SchedulingMovementItem[],
    };
  }

  async listScheduled(input: SchedulingListMovementsInput): Promise<SchedulingListMovementsResult> {
    return this.listMovements(input);
  }

  async listScheduledPage(input: MovementsListScheduledInput): Promise<MovementsListScheduledResult> {
    const requestedPage = input.pagination?.page ?? 0;
    const requestedSize = input.pagination?.size ?? 20;
    const page = Number.isFinite(requestedPage) && requestedPage >= 0 ? Math.trunc(requestedPage) : 0;
    const size = Number.isFinite(requestedSize) && requestedSize > 0 ? Math.min(Math.trunc(requestedSize), 100) : 20;

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

    const totalElements = sorted.length;
    const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
    const resolvedPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
    const startIndex = resolvedPage * size;
    const content = sorted.slice(startIndex, startIndex + size).map((item) => ({ ...item }));

    return {
      content,
      page: resolvedPage,
      size,
      totalElements,
      totalPages,
      hasNext: totalPages > 0 && resolvedPage + 1 < totalPages,
      hasPrevious: resolvedPage > 0,
    };
  }
}
