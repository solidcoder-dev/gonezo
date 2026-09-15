import { useRef, useState } from 'react';
import {
  expectedMovementToComposerPrefill,
  postExpectedMovementToComposerPrefill,
  scheduledMovementToComposerPrefill,
} from '../../account/application/movementComposerPrefill';
import type { ExpectedMovementView, ScheduledMovementView } from '../../movements/application/movementsView.types';
import type { MovementDetailViewModel } from '../../movements/application/movementDetailView.types';
import { createDraftFromMovementDetail } from '../../movements/application/movementDuplicateDraft';
import type { TransactionEntryPrefillRequest } from '../../transactions/application/TransactionEntryComponent.contract';
import type { MovementEntryDraft } from '../../transactions/application/MovementVoiceEntry/MovementEntryDraftInterpreterPort';
import { mapMovementEntryDraftToTransactionEntryPrefill } from '../../transactions/application/movementEntryPrefill';
import type { TransactionType } from '../../transactions/application/transactions.types';
import type { ShareDraft } from '../../sharing/domain/shareDraft';
import { formatShareCents, parseShareCents } from '../../sharing/application/shareDraftCalculator';

function shareDraftFromMovement(movement: MovementDetailViewModel): ShareDraft | undefined {
  if (movement.source !== 'posted' || movement.sharing.phase !== 'loaded' || !movement.sharing.value) return undefined;
  const totalCents = parseShareCents(movement.amount.value);
  const participantCents = movement.sharing.value.participants.reduce((sum, participant) => sum + parseShareCents(participant.amount), 0);
  return {
    mode: 'amounts',
    people: [
      { id: 'owner', role: 'owner', name: 'You (Payer)', parts: 1, amount: formatShareCents(totalCents - participantCents), avatarTone: 'you', includedInAllocation: true },
      ...movement.sharing.value.participants.map((participant) => ({
        id: participant.id,
        role: 'participant' as const,
        personId: participant.personId,
        name: participant.name,
        parts: 1,
        amount: participant.amount,
        avatarTone: 'custom' as const,
        settlementChoice: participant.reimbursementStatus === 'paid' || participant.reimbursementStatus === 'dismissed' ? 'settled' as const : participant.reimbursementStatus === 'pending' ? 'pending' as const : 'not_required' as const,
      })),
    ],
  };
}

type MovementComposerCoordinatorInput = {
  selectedAccountId: string | null;
};

export function useMovementComposerCoordinator({ selectedAccountId }: MovementComposerCoordinatorInput) {
  const [transactionEntryPrefill, setTransactionEntryPrefill] = useState<TransactionEntryPrefillRequest | undefined>();
  const [movementEntryAccountId, setMovementEntryAccountId] = useState<string | null>(null);
  const [movementEntryAccountName, setMovementEntryAccountName] = useState<string | null>(null);
  const [movementEntryType, setMovementEntryType] = useState<TransactionType | undefined>();
  const [movementEntryOpenSignal, setMovementEntryOpenSignal] = useState(0);
  const duplicateRequestId = useRef(0);
  const featureEditRequestId = useRef(0);

  function editExpectedMovement(movement: ExpectedMovementView, categoryName?: string) {
    setMovementEntryAccountId(movement.accountId);
    setMovementEntryAccountName(null);
    setTransactionEntryPrefill(expectedMovementToComposerPrefill(movement, categoryName));
  }

  function editScheduledMovement(movement: ScheduledMovementView, categoryName?: string) {
    setMovementEntryAccountId(movement.sourceAccountId);
    setMovementEntryAccountName(null);
    setTransactionEntryPrefill(scheduledMovementToComposerPrefill(movement, categoryName));
  }

  function postExpectedMovement(movement: ExpectedMovementView, categoryName?: string) {
    setMovementEntryAccountId(movement.accountId);
    setMovementEntryAccountName(null);
    setTransactionEntryPrefill(postExpectedMovementToComposerPrefill(movement, categoryName));
  }

  function duplicateMovement(movement: MovementDetailViewModel) {
    const accountId = movement.source === 'posted'
      ? movement.raw.accountId
      : movement.source === 'scheduled'
        ? movement.raw.sourceAccountId
        : movement.raw.accountId;
    setMovementEntryAccountId(accountId);
    setMovementEntryAccountName(null);
    setTransactionEntryPrefill({
      ...createDraftFromMovementDetail(movement),
      requestId: ++duplicateRequestId.current,
    });
    setMovementEntryOpenSignal((previous) => previous + 1);
  }

  function editMovementFeature(request: { feature: 'items' | 'sharing'; movement: MovementDetailViewModel }) {
    if (request.movement.financialType === 'transfer') {
      return;
    }
    const movement = request.movement;
    const source = movement.source;
    const accountId = source === 'scheduled' ? movement.raw.sourceAccountId : movement.raw.accountId;
    const date = source === 'posted'
      ? movement.raw.occurredAt
      : source === 'expected'
        ? movement.raw.expectedAt
        : movement.raw.nextDueAt ?? movement.raw.startAt;
    const prefill: TransactionEntryPrefillRequest = {
      requestId: ++featureEditRequestId.current,
      initialEditor: request.feature,
      mode: movement.financialType,
      amount: movement.amount.value,
      date,
      note: movement.note ?? movement.title,
      splitItems: movement.items.map((item) => ({ id: item.id, name: item.name, amount: item.amount })),
      shareDraft: shareDraftFromMovement(movement),
      ...(source === 'posted' && request.feature === 'items' ? { editedPostedMovementId: movement.id } : {}),
      ...(source === 'posted' ? { editedPostedMovementFeature: request.feature } : {}),
      ...(source === 'expected'
        ? { editedExpectedMovementId: movement.id, editNotice: 'expected' as const }
        : source === 'scheduled'
          ? { editedScheduledMovementId: movement.id, editNotice: 'scheduled' as const }
          : {}),
    };
    setMovementEntryAccountId(accountId);
    setMovementEntryAccountName(null);
    setTransactionEntryPrefill(prefill);
  }

  function clearMovementEntryAccount() {
    setMovementEntryAccountId(null);
    setMovementEntryAccountName(null);
    setMovementEntryType(undefined);
  }

  function createMovementForAccount(
    movement: {
      account: { id: string; name: string };
      type: TransactionType;
      prefillRequest?: TransactionEntryPrefillRequest;
    },
  ) {
    setMovementEntryAccountId(movement.account.id);
    setMovementEntryAccountName(movement.account.name);
    setMovementEntryType(movement.type);
    setTransactionEntryPrefill(movement.prefillRequest);
    setMovementEntryOpenSignal((previous) => previous + 1);
  }

  function createMovementForDraft(
    movement: {
      account: { id: string; name: string; currency: string };
      draft: MovementEntryDraft;
    },
  ) {
    setMovementEntryAccountId(movement.account.id);
    setMovementEntryAccountName(movement.account.name);
    setMovementEntryType(movement.draft.type);
    setTransactionEntryPrefill(mapMovementEntryDraftToTransactionEntryPrefill(movement.draft));
    setMovementEntryOpenSignal((previous) => previous + 1);
  }

  function changeMovementComposerAccount(account: { id: string; name: string }) {
    setMovementEntryAccountId(account.id);
    setMovementEntryAccountName(account.name);
  }

  return {
    state: {
      transactionEntryAccountId: movementEntryAccountId ?? selectedAccountId,
      transactionEntryPrefill,
      movementEntryOpenSignal,
      movementEntryType,
      movementAccountContext: movementEntryAccountName ? { name: movementEntryAccountName, type: movementEntryType } : undefined,
    },
    actions: {
      changeMovementComposerAccount,
      clearMovementEntryAccount,
      createMovementForAccount,
      createMovementForDraft,
      editExpectedMovement,
      editScheduledMovement,
      postExpectedMovement,
      editMovementFeature,
      duplicateMovement,
      resetTransactionEntryPrefill: () => setTransactionEntryPrefill(undefined),
    },
  };
}
