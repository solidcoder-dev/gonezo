import { useState } from 'react';
import {
  expectedMovementToComposerPrefill,
  postExpectedMovementToComposerPrefill,
  scheduledMovementToComposerPrefill,
} from '../../account/application/movementComposerPrefill';
import type { ExpectedMovementView, ScheduledMovementView } from '../../movements/application/movementsView.types';
import type { TransactionEntryPrefillRequest } from '../../transactions/application/TransactionEntryComponent.contract';
import type { TransactionType } from '../../transactions/application/transactions.types';

type MovementComposerCoordinatorInput = {
  selectedAccountId: string | null;
};

export function useMovementComposerCoordinator({ selectedAccountId }: MovementComposerCoordinatorInput) {
  const [transactionEntryPrefill, setTransactionEntryPrefill] = useState<TransactionEntryPrefillRequest | undefined>();
  const [movementEntryAccountId, setMovementEntryAccountId] = useState<string | null>(null);
  const [movementEntryAccountName, setMovementEntryAccountName] = useState<string | null>(null);
  const [movementEntryType, setMovementEntryType] = useState<TransactionType | undefined>();
  const [movementEntryOpenSignal, setMovementEntryOpenSignal] = useState(0);

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

  function clearMovementEntryAccount() {
    setMovementEntryAccountId(null);
    setMovementEntryAccountName(null);
    setMovementEntryType(undefined);
  }

  function createMovementForAccount(movement: { account: { id: string; name: string }; type: TransactionType }) {
    setMovementEntryAccountId(movement.account.id);
    setMovementEntryAccountName(movement.account.name);
    setMovementEntryType(movement.type);
    setTransactionEntryPrefill(undefined);
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
      editExpectedMovement,
      editScheduledMovement,
      postExpectedMovement,
      resetTransactionEntryPrefill: () => setTransactionEntryPrefill(undefined),
    },
  };
}
