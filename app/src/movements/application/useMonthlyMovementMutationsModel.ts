import { useCallback, useEffect, useRef, useState } from 'react';
import { useLedgerTransactions } from '../../ledger/application/useLedgerTransactions';
import type { ExpectedGatewayPort } from '../../expected/application/expectedGateway.port';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { SchedulingGatewayPort } from '../../scheduling/application/schedulingGateway.port';
import type { ExpectedMovementView } from '../domain/movementsView.types';

const VOID_COMMIT_DELAY_MS = 5000;

type MonthlyMovementMutationClock = {
  now(): Date;
};

type MonthlyMovementMutationTimers = {
  setTimeout(handler: () => void, timeoutMs: number): number;
  clearTimeout(timerId: number): void;
};

type UseMonthlyMovementMutationsModelInput = {
  ports: {
    ledger: LedgerGatewayPort;
    scheduling: SchedulingGatewayPort;
    expected: ExpectedGatewayPort;
  };
  clock: MonthlyMovementMutationClock;
  timers: MonthlyMovementMutationTimers;
  refreshMovements(): Promise<void>;
  clearError(): void;
  reportError(raw: unknown): void;
  feedback: {
    show(message: string): void;
    showAction(message: string, actionLabel: string, action: () => void): void;
    clearAction(): void;
  };
  onVoided?: (transactionId: string) => void;
  onExpectedDismissed?: () => void;
  onPostExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
};

export function useMonthlyMovementMutationsModel(input: UseMonthlyMovementMutationsModelInput) {
  const {
    ports,
    clock,
    timers,
    refreshMovements,
    clearError,
    reportError,
    feedback,
    onVoided,
    onExpectedDismissed,
    onPostExpectedMovement,
  } = input;

  const [postingTransaction, setPostingTransaction] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [pendingVoidTransactionId, setPendingVoidTransactionId] = useState('');
  const [pendingDeactivateScheduledId, setPendingDeactivateScheduledId] = useState('');
  const [pendingDismissExpectedId, setPendingDismissExpectedId] = useState('');
  const [voidMutationPhase, setVoidMutationPhase] = useState<'idle' | 'scheduled' | 'committing'>('idle');

  const pendingVoidTimerRef = useRef<number | null>(null);
  const ledgerTransactions = useLedgerTransactions(ports.ledger);

  const clearPendingVoidTimer = useCallback(() => {
    if (pendingVoidTimerRef.current != null) {
      timers.clearTimeout(pendingVoidTimerRef.current);
      pendingVoidTimerRef.current = null;
    }
  }, [timers]);

  function cancelPendingVoid(message: string) {
    clearPendingVoidTimer();
    setPendingVoidTransactionId('');
    setVoidMutationPhase('idle');
    feedback.show(message);
  }

  function reset() {
    clearPendingVoidTimer();
    setPendingVoidTransactionId('');
    setPendingDeactivateScheduledId('');
    setPendingDismissExpectedId('');
    setPostingTransaction(false);
    setMutating(false);
    setVoidMutationPhase('idle');
  }

  async function executeVoidTransaction(transactionId: string) {
    setPostingTransaction(true);
    setVoidMutationPhase('committing');
    feedback.clearAction();
    try {
      await ledgerTransactions.voidTransaction({ transactionId });
      await refreshMovements();
      feedback.show('Transaction voided.');
      onVoided?.(transactionId);
    } catch (err) {
      reportError(err);
    } finally {
      setPostingTransaction(false);
      setPendingVoidTransactionId('');
      setVoidMutationPhase('idle');
      feedback.clearAction();
      clearPendingVoidTimer();
    }
  }

  function requestVoid(transactionId: string) {
    clearError();
    clearPendingVoidTimer();
    setPendingVoidTransactionId(transactionId);
    setVoidMutationPhase('scheduled');
    feedback.showAction(
      'Transaction will be voided in 5 seconds.',
      'Undo',
      () => cancelPendingVoid('Void canceled.'),
    );

    pendingVoidTimerRef.current = timers.setTimeout(() => {
      pendingVoidTimerRef.current = null;
      void executeVoidTransaction(transactionId);
    }, VOID_COMMIT_DELAY_MS);
  }

  async function deactivateScheduledMovement(scheduledMovementId: string) {
    setMutating(true);
    setPendingDeactivateScheduledId(scheduledMovementId);
    clearError();
    try {
      await ports.scheduling.schedulingDeactivateMovement({
        recurringMovementId: scheduledMovementId,
      });
      await refreshMovements();
      feedback.show('Scheduled movement deactivated.');
    } catch (err) {
      reportError(err);
    } finally {
      setMutating(false);
      setPendingDeactivateScheduledId('');
    }
  }

  async function postExpectedMovement(movement: ExpectedMovementView, categoryName?: string): Promise<boolean> {
    if (!onPostExpectedMovement) {
      reportError(new Error('Posting expected movements is not available.'));
      return false;
    }

    onPostExpectedMovement(movement, categoryName);
    return true;
  }

  async function dismissExpectedMovement(movement: ExpectedMovementView): Promise<boolean> {
    setMutating(true);
    setPendingDismissExpectedId(movement.id);
    clearError();
    try {
      await ports.expected.expectedDismissMovement({
        expectedMovementId: movement.id,
        dismissedAt: clock.now().toISOString(),
      });
      await refreshMovements();
      onExpectedDismissed?.();
      feedback.show('Expected movement dismissed.');
      return true;
    } catch (err) {
      reportError(err);
      return false;
    } finally {
      setMutating(false);
      setPendingDismissExpectedId('');
    }
  }

  useEffect(() => () => {
    clearPendingVoidTimer();
  }, [clearPendingVoidTimer]);

  return {
    state: {
      postingTransaction,
      mutating,
      pendingVoidTransactionId,
      pendingDeactivateScheduledId,
      pendingDismissExpectedId,
      voidMutationPhase,
    },
    actions: {
      clearPendingVoidTimer,
      cancelPendingVoid,
      reset,
      requestVoid,
      deactivateScheduledMovement,
      postExpectedMovement,
      dismissExpectedMovement,
    },
  };
}
