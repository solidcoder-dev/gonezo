import type {
  SharingApplyShareToPostedTransactionInput,
  SharingApplyShareToPostedTransactionResult,
  SharingGetMovementDetailsInput,
  SharingListMovementDetailsInput,
  SharingListMovementDetailsResult,
  SharingListPeopleResult,
  SharingMovementDetailsResult,
} from '../application/sharing.port';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import type { WebAppState, WebExpenseShare, WebLedgerTransaction, WebSharingPerson } from '../../core/infrastructure/webAppState';
import type { WebLedgerService } from '../../ledger/infrastructure/webLedgerService';
import type { WebExpectedMovementsService } from '../../expected/infrastructure/webExpectedService';

export type WebSharingServiceOptions = {
  state: WebAppState;
  dependencies: WebRuntimeDependencies;
  ledger: WebLedgerService;
  expected: WebExpectedMovementsService;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

export class WebSharingService {
  private readonly state: WebAppState;
  private readonly dependencies: WebRuntimeDependencies;
  private readonly ledger: WebLedgerService;
  private readonly expected: WebExpectedMovementsService;

  constructor(options: WebSharingServiceOptions) {
    this.state = options.state;
    this.dependencies = options.dependencies;
    this.ledger = options.ledger;
    this.expected = options.expected;
  }

  async listPeople(): Promise<SharingListPeopleResult> {
    return {
      items: this.state.sharingPersons
        .filter((person) => !person.archivedAt)
        .map((person) => ({ id: person.id, name: person.name, email: person.email }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    };
  }

  async applyShareToPostedTransaction(
    input: SharingApplyShareToPostedTransactionInput,
  ): Promise<SharingApplyShareToPostedTransactionResult> {
    const transaction = this.ledger.getTransactionOrThrow(input.transactionId);
    if (transaction.status !== 'posted' || transaction.type !== 'expense') {
      throw new Error('Only posted expenses can be shared');
    }
    const appliedAt = input.appliedAt ?? this.dependencies.clock.nowIso();
    const payer = this.findOrCreatePerson(input.payerName, appliedAt);
    const participants = [];
    for (const participantInput of input.participants) {
      const person = this.findOrCreatePerson(participantInput.personName, appliedAt);
      const expectedMovementId = participantInput.reimbursable
        ? (await this.expected.createMovement({
            accountId: transaction.accountId,
            type: 'income',
            amount: formatAmount(parseAmount(participantInput.amount)),
            currency: transaction.currency,
            expectedAt: transaction.occurredAt,
            description: `Reimbursement from ${person.name}`,
            merchant: person.name,
          })).id
        : undefined;
      const participantId = this.dependencies.idGenerator.nextId();
      participants.push({
        participantId,
        personId: person.id,
        amount: formatAmount(parseAmount(participantInput.amount)),
        reimbursable: participantInput.reimbursable,
        expectedMovementId,
      });
      if (participantInput.reimbursable) {
        this.addAnalyticsExclusion('share_participant', participantId, 'shared_expense', appliedAt);
        if (expectedMovementId) {
          this.addAnalyticsExclusion('expected_movement', expectedMovementId, 'reimbursement', appliedAt);
          this.addAnalyticsExclusion('expected_movement', expectedMovementId, 'user_ignored', appliedAt);
        }
      }
    }
    const existingIndex = this.state.expenseShares.findIndex((share) => share.transactionId === transaction.id);
    const share: WebExpenseShare = {
      id: existingIndex >= 0 ? this.state.expenseShares[existingIndex].id : this.dependencies.idGenerator.nextId(),
      transactionId: transaction.id,
      payerPersonId: payer.id,
      totalAmount: transaction.amount,
      currency: transaction.currency,
      participants,
      createdAt: existingIndex >= 0 ? this.state.expenseShares[existingIndex].createdAt : appliedAt,
      updatedAt: appliedAt,
    };
    if (existingIndex >= 0) {
      this.state.expenseShares[existingIndex] = share;
    } else {
      this.state.expenseShares.push(share);
    }
    return this.toApplyResult(share);
  }

  async getMovementDetails(input: SharingGetMovementDetailsInput): Promise<SharingMovementDetailsResult> {
    const share = this.state.expenseShares.find((item) => item.transactionId === input.transactionId);
    if (!share) {
      return null;
    }
    const transaction = this.ledger.getTransactionOrThrow(input.transactionId);
    return this.toMovementDetails(share, transaction);
  }

  async listMovementDetails(input: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult> {
    const items = input.transactionIds
      .map((transactionId) => {
        const share = this.state.expenseShares.find((item) => item.transactionId === transactionId);
        if (!share) {
          return null;
        }
        return this.toMovementDetails(share, this.ledger.getTransactionOrThrow(transactionId));
      })
      .filter((item): item is Exclude<SharingMovementDetailsResult, null> => item != null);
    return { items };
  }

  private findOrCreatePerson(name: string, createdAt: string): WebSharingPerson {
    const normalizedName = normalizeName(name);
    const existing = this.state.sharingPersons.find((person) => person.normalizedName === normalizedName && !person.archivedAt);
    if (existing) {
      return existing;
    }
    const person = {
      id: this.dependencies.idGenerator.nextId(),
      name: name.trim(),
      normalizedName,
      createdAt,
    };
    this.state.sharingPersons.push(person);
    return person;
  }

  private addAnalyticsExclusion(
    scopeType: WebAppState['analyticsExclusions'][number]['scopeType'],
    scopeId: string,
    reason: WebAppState['analyticsExclusions'][number]['reason'],
    createdAt: string,
  ) {
    const existing = this.state.analyticsExclusions.find((item) => (
      item.scopeType === scopeType && item.scopeId === scopeId && item.reason === reason
    ));
    if (existing) {
      existing.createdAt = createdAt;
      return;
    }
    this.state.analyticsExclusions.push({
      id: this.dependencies.idGenerator.nextId(),
      scopeType,
      scopeId,
      reason,
      createdAt,
    });
  }

  private toApplyResult(share: WebExpenseShare): SharingApplyShareToPostedTransactionResult {
    return {
      shareId: share.id,
      transactionId: share.transactionId,
      participants: share.participants.map((participant) => {
        const person = this.state.sharingPersons.find((item) => item.id === participant.personId);
        return {
          participantId: participant.participantId,
          personId: participant.personId,
          displayName: person?.name ?? 'Unknown',
          amount: participant.amount,
          reimbursable: participant.reimbursable,
          expectedMovementId: participant.expectedMovementId,
        };
      }),
    };
  }

  private toMovementDetails(share: WebExpenseShare, transaction: WebLedgerTransaction): SharingMovementDetailsResult {
    const excludedLentAmount = share.participants
      .filter((participant) => participant.reimbursable)
      .reduce((total, participant) => total + parseAmount(participant.amount), 0);
    const excludedReimbursementIncomeAmount = share.participants
      .filter((participant) => {
        const expected = participant.expectedMovementId
          ? this.state.expectedMovements.find((movement) => movement.id === participant.expectedMovementId)
          : undefined;
        return participant.reimbursable && expected?.status === 'resolved';
      })
      .reduce((total, participant) => total + parseAmount(participant.amount), 0);
    return {
      shareId: share.id,
      transactionId: share.transactionId,
      participants: share.participants.map((participant) => {
        const person = this.state.sharingPersons.find((item) => item.id === participant.personId);
        const expected = participant.expectedMovementId
          ? this.state.expectedMovements.find((movement) => movement.id === participant.expectedMovementId)
          : undefined;
        return {
          participantId: participant.participantId,
          personId: participant.personId,
          displayName: person?.name ?? 'Unknown',
          amount: participant.amount,
          reimbursable: participant.reimbursable,
          expectedMovementId: participant.expectedMovementId,
          repaymentStatus: !participant.reimbursable
            ? 'not_expected'
            : expected?.status === 'pending'
              ? 'pending'
              : expected?.status === 'resolved'
                ? 'paid'
                : expected?.status === 'dismissed'
                  ? 'dismissed'
                  : 'missing_expected',
        };
      }),
      analytics: {
        personalExpenseAmount: formatAmount(parseAmount(transaction.amount) - excludedLentAmount),
        excludedLentAmount: formatAmount(excludedLentAmount),
        excludedReimbursementIncomeAmount: formatAmount(excludedReimbursementIncomeAmount),
      },
    };
  }
}
