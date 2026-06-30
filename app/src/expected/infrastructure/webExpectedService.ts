import type {
  ExpectedCreateMovementInput,
  ExpectedCreateMovementResult,
  ExpectedDismissMovementInput,
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
  ExpectedResolveMovementInput,
  ExpectedUpdateMovementInput,
  ExpectedUpdateMovementResult,
} from '../application/expected.port';
import { filterExpectedMovements } from '../application/expectedMovementFilters';
import type { ExpectedLedgerPort } from '../application/expectedLedger.port';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import type { WebAppState } from '../../core/infrastructure/webAppState';

function isIgnoredExpectedMovementExclusion(item: WebAppState['analyticsExclusions'][number]): boolean {
  return item.scopeType === 'expected_movement' && item.reason === 'user_ignored';
}

export type WebExpectedMovementsServiceOptions = {
  state: WebAppState;
  dependencies: WebRuntimeDependencies;
  ledger: ExpectedLedgerPort;
};

export class WebExpectedMovementsService {
  private readonly state: WebAppState;

  private readonly dependencies: WebRuntimeDependencies;

  private readonly ledger: ExpectedLedgerPort;

  constructor(options: WebExpectedMovementsServiceOptions) {
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

  private setExpectedMovementIgnored(expectedMovementId: string, ignored?: boolean): void {
    this.state.analyticsExclusions = this.state.analyticsExclusions.filter((item) => !(
      isIgnoredExpectedMovementExclusion(item) && item.scopeId === expectedMovementId
    ));
    if (ignored) {
      this.state.analyticsExclusions.push({
        id: this.nextId(),
        scopeType: 'expected_movement',
        scopeId: expectedMovementId,
        reason: 'user_ignored',
        createdAt: this.nowIso(),
      });
    }
  }

  private ignoredExpectedMovementIds(): Set<string> {
    return new Set(
      this.state.analyticsExclusions
        .filter(isIgnoredExpectedMovementExclusion)
        .map((item) => item.scopeId),
    );
  }

  async createMovement(input: ExpectedCreateMovementInput): Promise<ExpectedCreateMovementResult> {
    const account = this.ledger.getAccountOrThrow(input.accountId);
    this.ledger.ensureAccountCanPost(account, input.currency);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Expected movement amount must be greater than 0');
    }
    const expectedAt = input.expectedAt.trim() || this.nowIso();
    const now = this.nowIso();
    const id = this.nextId();
    this.state.expectedMovements.push({
      id,
      accountId: input.accountId,
      type: input.type,
      amount: amount.toFixed(2),
      currency: input.currency.toUpperCase(),
      expectedAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      originOccurrenceId: input.originOccurrenceId?.trim() || undefined,
      originRecurringMovementId: input.originRecurringMovementId?.trim() || undefined,
      splitItems: (input.splitItems ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        amount: Number(item.amount).toFixed(2),
      })),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    this.setExpectedMovementIgnored(id, input.ignored);
    return { id };
  }

  async updateMovement(input: ExpectedUpdateMovementInput): Promise<ExpectedUpdateMovementResult> {
    const movementIndex = this.state.expectedMovements.findIndex((item) => item.id === input.expectedMovementId);
    if (movementIndex < 0) {
      throw new Error(`Expected movement not found: ${input.expectedMovementId}`);
    }
    const current = this.state.expectedMovements[movementIndex];
    if (current.status !== 'pending') {
      throw new Error('Only pending expected movements can be changed');
    }
    const account = this.ledger.getAccountOrThrow(input.accountId);
    this.ledger.ensureAccountCanPost(account, input.currency);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Expected movement amount must be greater than 0');
    }
    const expectedAt = input.expectedAt.trim() || this.nowIso();
    const now = this.nowIso();
    this.state.expectedMovements[movementIndex] = {
      ...current,
      accountId: input.accountId,
      type: input.type,
      amount: amount.toFixed(2),
      currency: input.currency.toUpperCase(),
      expectedAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      splitItems: (input.splitItems ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        amount: Number(item.amount).toFixed(2),
      })),
      updatedAt: now,
    };
    if (input.ignored !== undefined) {
      this.setExpectedMovementIgnored(current.id, input.ignored);
    }
    return { id: current.id };
  }

  async listMovements(input: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult> {
    this.ledger.getAccountOrThrow(input.accountId);
    const ignoredIds = this.ignoredExpectedMovementIds();
    return {
      items: filterExpectedMovements(this.state.expectedMovements, {
        accountId: input.accountId,
        includeClosed: input.includeClosed === true,
      }).map((item) => ({
        ...item,
        ignored: ignoredIds.has(item.id),
      })),
    };
  }

  async resolveMovement(input: ExpectedResolveMovementInput): Promise<void> {
    const movement = this.state.expectedMovements.find((item) => item.id === input.expectedMovementId);
    if (!movement) {
      throw new Error(`Expected movement not found: ${input.expectedMovementId}`);
    }
    const transactionId = input.transactionId.trim();
    if (!transactionId) {
      throw new Error('transactionId is required');
    }
    movement.status = 'resolved';
    movement.resolvedTransactionId = transactionId;
    movement.resolvedAt = input.resolvedAt ?? this.nowIso();
    movement.updatedAt = movement.resolvedAt;
  }

  async dismissMovement(input: ExpectedDismissMovementInput): Promise<void> {
    const movement = this.state.expectedMovements.find((item) => item.id === input.expectedMovementId);
    if (!movement) {
      throw new Error(`Expected movement not found: ${input.expectedMovementId}`);
    }
    movement.status = 'dismissed';
    movement.dismissedAt = input.dismissedAt ?? this.nowIso();
    movement.updatedAt = movement.dismissedAt;
  }
}
