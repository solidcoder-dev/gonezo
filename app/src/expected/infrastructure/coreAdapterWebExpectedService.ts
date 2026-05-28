import type {
  ExpectedCreateMovementInput,
  ExpectedCreateMovementResult,
  ExpectedDismissMovementInput,
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
  ExpectedResolveMovementInput,
  ExpectedUpdateMovementInput,
  ExpectedUpdateMovementResult,
} from '../application/expectedCore.port';
import type { CoreAdapterWebDependencies } from '../../core/infrastructure/coreAdapterWebEffects';
import type { WebLedgerService } from '../../ledger/infrastructure/coreAdapterWebLedgerService';
import { filterExpectedMovements } from '../../movements/infrastructure/coreAdapterWebMovementQueries';
import type { WebCoreState } from '../../core/infrastructure/coreAdapterWebState';

export type WebExpectedMovementsServiceOptions = {
  state: WebCoreState;
  dependencies: CoreAdapterWebDependencies;
  ledger: WebLedgerService;
};

export class WebExpectedMovementsService {
  private readonly state: WebCoreState;

  private readonly dependencies: CoreAdapterWebDependencies;

  private readonly ledger: WebLedgerService;

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
      originOccurrenceId: undefined,
      splitItems: (input.splitItems ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        amount: Number(item.amount).toFixed(2),
      })),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
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
    return { id: current.id };
  }

  async listMovements(input: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult> {
    this.ledger.getAccountOrThrow(input.accountId);
    return {
      items: filterExpectedMovements(this.state.expectedMovements, {
        accountId: input.accountId,
        includeClosed: input.includeClosed === true,
      }),
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
