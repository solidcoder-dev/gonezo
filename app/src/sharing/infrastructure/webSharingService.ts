import type {
  SharingApplyShareToPostedMovementInput,
  SharingApplyShareToPostedMovementResult,
  SharingReplaceMovementShareInput,
  SharingReplaceMovementShareResult,
  SharingRemoveMovementShareInput,
  SharingGetMovementDetailsInput,
  SharingListMovementDetailsInput,
  SharingListMovementDetailsResult,
  SharingListPeopleResult,
  SharingPersonReference,
  SharingMovementDetailsResult,
  SharingGetPlannedShareInput,
  SharingPlannedShareResult,
} from '../application/sharing.port';
import { listSharingGroupSuggestions } from '../application/listSharingGroupSuggestions';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import type { WebAppState, WebExpenseShare, WebLedgerTransaction, WebSharingPerson, WebShareParticipant } from '../../core/infrastructure/webAppState';
import type { WebLedgerService } from '../../ledger/infrastructure/webLedgerService';
import type { WebExpectedMovementsService } from '../../expected/infrastructure/webExpectedService';
import { displayedMovementTitle } from '../../shared/utils/movementTitle';
import { ExactDecimal } from '../../shared/domain/exactDecimal';
import { resolveSharingAnalyticsAttribution } from '../application/sharingAnalyticsAttribution';

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

  private nextId(): string {
    return this.dependencies.idGenerator.nextId();
  }

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

  async renamePerson(input: { personId: string; displayName: string }): Promise<void> {
    const person = this.state.sharingPersons.find((item) => item.id === input.personId && !item.archivedAt);
    if (!person) throw new Error(`Sharing person not found: ${input.personId}`);
    const displayName = input.displayName.trim();
    if (!displayName) throw new Error('sharing person display name is required');
    const normalizedName = normalizeName(displayName);
    const collision = this.state.sharingPersons.find((item) => item.id !== person.id && item.normalizedName === normalizedName && !item.archivedAt);
    if (collision) throw new Error(`Sharing person already exists: ${displayName}`);
    person.name = displayName;
    person.normalizedName = normalizedName;
  }

  async listGroupSuggestions() {
    const history = this.state.expenseShares.map((share) => ({
      ownerId: share.payerPersonId,
      participantIds: share.participants.map((participant) => participant.personId),
      usedAt: share.updatedAt,
    }));
    return { items: listSharingGroupSuggestions(history, await this.listPeople().then((result) => result.items)) };
  }

  async applyShareToPostedMovement(
    input: SharingApplyShareToPostedMovementInput,
  ): Promise<SharingApplyShareToPostedMovementResult> {
    const transaction = this.ledger.getTransactionOrThrow(input.transactionId);
    if (transaction.status !== 'posted' || (transaction.type !== 'expense' && transaction.type !== 'income')) {
      throw new Error('Only posted expenses and incomes can be shared');
    }
    const appliedAt = input.appliedAt ?? this.dependencies.clock.nowIso();
    const sourceTitle = displayedMovementTitle({
      merchant: transaction.merchant,
      description: transaction.description,
      fallback: transaction.type === 'expense' ? 'Expense' : 'Income',
    });
    const payer = this.resolvePerson(input.payer, appliedAt);
    const participants = [];
    for (const participantInput of input.participants) {
      const person = this.resolvePerson(participantInput.person, appliedAt);
      const requestedSettlement = participantInput.settlementChoice ?? (participantInput.reimbursable ? 'pending' : 'not_required');
      const settlementChoice = parseAmount(participantInput.amount) === 0 ? 'not_required' : requestedSettlement;
      const expectedMovementId = settlementChoice === 'pending' && parseAmount(participantInput.amount) > 0
        ? (await this.expected.createMovement({
            accountId: transaction.accountId,
            type: transaction.type === 'expense' ? 'income' : 'expense',
            amount: formatAmount(parseAmount(participantInput.amount)),
            currency: transaction.currency,
            expectedAt: transaction.occurredAt,
            description: `${sourceTitle} · ${person.name.trim()}`,
            merchant: person.name,
          })).id
        : undefined;
      const participantId = this.dependencies.idGenerator.nextId();
      participants.push({
        participantId,
        personId: person.id,
        amount: formatAmount(parseAmount(participantInput.amount)),
        reimbursable: settlementChoice === 'pending',
        settlementChoice,
        expectedMovementId,
      });
      if (settlementChoice !== 'not_required') {
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
      movementType: transaction.type,
    };
    if (existingIndex >= 0) {
      this.state.expenseShares[existingIndex] = share;
    } else {
      this.state.expenseShares.push(share);
    }
    return this.toApplyResult(share);
  }

  async replaceMovementShare(
    input: SharingReplaceMovementShareInput,
  ): Promise<SharingReplaceMovementShareResult> {
    const transaction = this.ledger.getTransactionOrThrow(input.transactionId);
    if (transaction.status !== 'posted' || (transaction.type !== 'expense' && transaction.type !== 'income')) {
      throw new Error('Only posted expenses and incomes can be shared');
    }
    const updatedAt = input.updatedAt ?? this.dependencies.clock.nowIso();
    const previous = this.state.expenseShares.find((share) => share.transactionId === transaction.id);
    if (input.participants.length === 0) {
      await this.removeMovementShare({ transactionId: transaction.id, removedAt: updatedAt });
      return { shareId: previous?.id ?? '', transactionId: transaction.id };
    }
    const payer = this.resolvePerson(input.payer, updatedAt);
    const oldByPerson = new Map((previous?.participants ?? []).map((participant) => [participant.personId, participant]));
    const participants: WebShareParticipant[] = [];
    for (const participantInput of input.participants) {
      const person = this.resolvePerson(participantInput.person, updatedAt);
      const old = oldByPerson.get(person.id);
      const requestedStatus = participantInput.settlementChoice ?? (participantInput.reimbursable ? 'pending' : 'not_required');
      const amount = formatAmount(parseAmount(participantInput.amount));
      const settlementChoice = parseAmount(amount) === 0 ? 'not_required' : requestedStatus;
      if (old?.settlementChoice === 'settled' && (old.amount !== amount || settlementChoice !== 'settled')) {
        throw new Error('Published settlements cannot be changed');
      }
      let expectedMovementId = old?.expectedMovementId;
      if (settlementChoice === 'pending' && parseAmount(amount) > 0) {
        if (expectedMovementId) {
          const expectedMovement = this.state.expectedMovements.find((movement) => movement.id === expectedMovementId);
          if (expectedMovement?.status === 'pending') {
            expectedMovement.amount = amount;
            expectedMovement.updatedAt = updatedAt;
          }
        } else {
          expectedMovementId = (await this.expected.createMovement({
            accountId: transaction.accountId,
            type: transaction.type === 'expense' ? 'income' : 'expense',
            amount,
            currency: transaction.currency,
            expectedAt: transaction.occurredAt,
            description: `${transaction.merchant ?? transaction.description ?? 'Movement'} · ${person.name.trim()}`,
            merchant: person.name,
          })).id;
        }
      } else if (expectedMovementId) {
        const expectedMovement = this.state.expectedMovements.find((movement) => movement.id === expectedMovementId);
          if (expectedMovement?.status === 'pending') await this.expected.dismissMovement({ expectedMovementId, originKind: 'manual', dismissedAt: updatedAt });
        expectedMovementId = undefined;
      }
      participants.push({ participantId: old?.participantId ?? this.nextId(), personId: person.id, amount, reimbursable: settlementChoice === 'pending', settlementChoice, expectedMovementId });
    }
    for (const old of previous?.participants ?? []) {
      if (!participants.some((participant) => participant.personId === old.personId) && old.expectedMovementId) {
        const expectedMovement = this.state.expectedMovements.find((movement) => movement.id === old.expectedMovementId);
        if (expectedMovement?.status === 'pending') await this.expected.dismissMovement({ expectedMovementId: old.expectedMovementId, originKind: 'manual', dismissedAt: updatedAt });
      }
      this.removeAnalyticsExclusions(old);
    }
    const share: WebExpenseShare = {
      id: previous?.id ?? this.nextId(), transactionId: transaction.id, payerPersonId: payer.id,
      totalAmount: transaction.amount, currency: transaction.currency, participants,
      createdAt: previous?.createdAt ?? updatedAt, updatedAt, movementType: transaction.type,
    };
    if (previous) this.state.expenseShares[this.state.expenseShares.indexOf(previous)] = share;
    else this.state.expenseShares.push(share);
    participants.filter((participant) => participant.settlementChoice !== 'not_required').forEach((participant) => {
      this.addAnalyticsExclusion('share_participant', participant.participantId, 'shared_expense', updatedAt);
      if (participant.expectedMovementId) this.addAnalyticsExclusion('expected_movement', participant.expectedMovementId, 'reimbursement', updatedAt);
    });
    return { shareId: share.id, transactionId: share.transactionId };
  }

  async removeMovementShare(input: SharingRemoveMovementShareInput): Promise<void> {
    const shareIndex = this.state.expenseShares.findIndex((share) => share.transactionId === input.transactionId);
    if (shareIndex < 0) return;
    const share = this.state.expenseShares[shareIndex];
    if (share.participants.some((participant) => participant.settlementChoice === 'settled')) throw new Error('Published settlements cannot be deleted');
    for (const participant of share.participants) {
      if (participant.expectedMovementId) {
        const expectedMovement = this.state.expectedMovements.find((movement) => movement.id === participant.expectedMovementId);
        if (expectedMovement?.status === 'pending') await this.expected.dismissMovement({ expectedMovementId: participant.expectedMovementId, originKind: 'manual', dismissedAt: input.removedAt ?? this.dependencies.clock.nowIso() });
      }
      this.removeAnalyticsExclusions(participant);
    }
    this.state.expenseShares.splice(shareIndex, 1);
  }

  private removeAnalyticsExclusions(participant: WebShareParticipant) {
    this.state.analyticsExclusions = this.state.analyticsExclusions.filter((item) => !(
      (item.scopeType === 'share_participant' && item.scopeId === participant.participantId && item.reason === 'shared_expense')
      || (item.scopeType === 'expected_movement' && item.scopeId === participant.expectedMovementId && item.reason === 'reimbursement')
    ));
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

  async getPlannedShare(input: SharingGetPlannedShareInput): Promise<SharingPlannedShareResult> {
    void input;
    return null;
  }

  private resolvePerson(reference: SharingPersonReference, createdAt: string): WebSharingPerson {
    if ('currentUser' in reference) {
      const existing = this.state.sharingPersons.find((person) => person.normalizedName === 'you' && !person.archivedAt);
      if (existing) return existing;
      const person = { id: this.dependencies.idGenerator.nextId(), name: 'You', normalizedName: 'you', createdAt };
      this.state.sharingPersons.push(person);
      return person;
    }
    if ('personId' in reference) {
      const existing = this.state.sharingPersons.find((person) => person.id === reference.personId && !person.archivedAt);
      if (!existing) {
        throw new Error(`Sharing person not found: ${reference.personId}`);
      }
      return existing;
    }
    const name = reference.displayName;
    const normalizedName = normalizeName(name);
    const existing = this.state.sharingPersons.find((person) => person.normalizedName === normalizedName && !person.archivedAt);
    if (existing) {
      throw new Error(`Sharing person already exists: ${name}`);
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

  private toApplyResult(share: WebExpenseShare): SharingApplyShareToPostedMovementResult {
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
          settlementChoice: participant.settlementChoice ?? (participant.reimbursable ? 'pending' : 'not_required'),
          expectedMovementId: participant.expectedMovementId,
        };
      }),
    };
  }

  private toMovementDetails(share: WebExpenseShare, transaction: WebLedgerTransaction): SharingMovementDetailsResult {
    const attribution = resolveSharingAnalyticsAttribution(transaction.amount, share.participants.map((participant) => ({
      amount: participant.amount,
      requiresSettlement: (participant.settlementChoice ?? (participant.reimbursable ? 'pending' : 'not_required')) !== 'not_required',
    })));
    const excludedReimbursementIncomeAmount = share.participants.reduce((total, participant) => {
      const isResolvedExpected = (() => {
        const expected = participant.expectedMovementId
          ? this.state.expectedMovements.find((movement) => movement.id === participant.expectedMovementId)
          : undefined;
        return (participant.settlementChoice ?? (participant.reimbursable ? 'pending' : 'not_required')) === 'pending' && expected?.status === 'resolved';
      })();
      return isResolvedExpected ? total.add(ExactDecimal.from(participant.amount)) : total;
    }, ExactDecimal.from('0'));
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
          settlementChoice: participant.settlementChoice ?? (participant.reimbursable ? 'pending' : 'not_required'),
          expectedMovementId: participant.expectedMovementId,
          repaymentStatus: (participant.settlementChoice ?? (participant.reimbursable ? 'pending' : 'not_required')) === 'not_required'
            ? 'not_expected'
            : (participant.settlementChoice ?? (participant.reimbursable ? 'pending' : 'not_required')) === 'settled'
              ? 'paid'
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
        personalExpenseAmount: ExactDecimal.from(attribution.personalAmount).toFixed(2),
        excludedLentAmount: ExactDecimal.from(attribution.settlementRequiredAmount).toFixed(2),
        excludedReimbursementIncomeAmount: excludedReimbursementIncomeAmount.toFixed(2),
        personalIncomeAmount: ExactDecimal.from(attribution.personalAmount).toFixed(2),
      },
    };
  }
}
