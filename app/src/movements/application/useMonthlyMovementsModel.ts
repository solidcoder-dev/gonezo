import { useEffect, useRef, useState } from 'react';
import type { ExpectedGatewayPort } from '../../expected/application/expectedGateway.port';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { SchedulingGatewayPort } from '../../scheduling/application/schedulingGateway.port';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import type { ExpectedMovementView, ScheduledMovementView } from '../domain/movementsView.types';
import type { MonthlyMovementsViewProvided, MonthlyMovementsViewRequired } from '../ui/MonthlyMovementsView.contract';
import { useMonthlyMovementMutationsModel } from './useMonthlyMovementMutationsModel';
import { useMonthlyMovementNavigationModel } from './useMonthlyMovementNavigationModel';
import { useMonthlyMovementsFeedbackModel } from './useMonthlyMovementsFeedbackModel';
import { useMonthlyMovementsOverviewModel } from './useMonthlyMovementsOverviewModel';
import { useMonthlyMovementsTaxonomyModel } from './useMonthlyMovementsTaxonomyModel';

export type MonthlyMovementsModelPorts = {
  ledger: LedgerGatewayPort;
  scheduling: SchedulingGatewayPort;
  expected: ExpectedGatewayPort;
  taxonomy: TaxonomyGatewayPort;
};

export type MonthlyMovementsModelClock = {
  now(): Date;
};

export type MonthlyMovementsModelTimers = {
  setTimeout(handler: () => void, timeoutMs: number): number;
  clearTimeout(timerId: number): void;
};

type UseMonthlyMovementsModelInput = {
  ports: MonthlyMovementsModelPorts;
  accountId: string | null;
  enabled: boolean;
  refreshSignal: boolean;
  clock: MonthlyMovementsModelClock;
  timers: MonthlyMovementsModelTimers;
  onVoided?: (transactionId: string) => void;
  onExpectedPosted?: () => void;
  onExpectedDismissed?: () => void;
  onPostExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
  onEditExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
  onEditScheduledMovement?: (movement: ScheduledMovementView, categoryName?: string) => void;
  onError?: (error: { message: string }) => void;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function useMonthlyMovementsModel(input: UseMonthlyMovementsModelInput) {
  const {
    ports,
    accountId,
    enabled,
    refreshSignal,
    clock,
    timers,
    onVoided,
    onExpectedDismissed,
    onPostExpectedMovement,
    onEditExpectedMovement,
    onEditScheduledMovement,
    onError,
  } = input;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const previousAccountIdRef = useRef<string | null>(null);

  const feedbackModel = useMonthlyMovementsFeedbackModel();
  const navigationModel = useMonthlyMovementNavigationModel({
    clock,
    resetPage: () => setPage(0),
  });
  const overviewModel = useMonthlyMovementsOverviewModel({
    scheduling: ports.scheduling,
    accountId,
    page,
    setPage,
    monthStartDate: navigationModel.state.monthStartDate,
    monthEndDate: navigationModel.state.monthEndDate,
  });
  const taxonomyModel = useMonthlyMovementsTaxonomyModel({
    taxonomy: ports.taxonomy,
    transactions: overviewModel.state.transactions,
  });
  const monthStartTime = navigationModel.state.monthStartDate.getTime();
  const monthEndTime = navigationModel.state.monthEndDate.getTime();

  function clearError() {
    setError('');
  }

  function reportError(raw: unknown) {
    const message = toErrorMessage(raw);
    setError(message);
    onError?.({ message });
  }

  async function refreshMovements() {
    const loadedTransactions = await overviewModel.actions.refresh();
    await taxonomyModel.actions.refreshAssignments(loadedTransactions);
  }

  const mutationsModel = useMonthlyMovementMutationsModel({
    ports: {
      ledger: ports.ledger,
      scheduling: ports.scheduling,
      expected: ports.expected,
    },
    clock,
    timers,
    refreshMovements,
    clearError,
    reportError,
    feedback: {
      show: feedbackModel.actions.show,
      showAction: feedbackModel.actions.showAction,
      clearAction: feedbackModel.actions.clearAction,
    },
    onVoided,
    onExpectedDismissed,
    onPostExpectedMovement,
  });

  function resetTransientState() {
    mutationsModel.actions.clearPendingVoidTimer();
    clearError();
    feedbackModel.actions.clear();
    overviewModel.actions.reset();
    taxonomyModel.actions.resetAssignments();
    mutationsModel.actions.reset();
    navigationModel.actions.resetPanels();
  }

  useEffect(() => {
    if (!enabled || !accountId) {
      previousAccountIdRef.current = accountId;
      resetTransientState();
      setLoading(false);
      return;
    }

    const accountChanged = previousAccountIdRef.current !== accountId;
    if (accountChanged) {
      previousAccountIdRef.current = accountId;
      setPage(0);
      resetTransientState();
      setLoading(true);
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      clearError();
      try {
        await Promise.all([refreshMovements(), taxonomyModel.actions.ensureLoaded()]);
      } catch (err) {
        if (!cancelled) {
          reportError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      mutationsModel.actions.clearPendingVoidTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    accountId,
    refreshSignal,
    page,
    monthStartTime,
    monthEndTime,
  ]);

  const disabled = loading
    || mutationsModel.state.mutating
    || mutationsModel.state.postingTransaction
    || mutationsModel.state.voidMutationPhase === 'committing';

  const required: MonthlyMovementsViewRequired = {
    state: {
      accountId: accountId ?? '',
      monthLabel: navigationModel.state.monthLabel,
      isCurrentMonth: navigationModel.state.isCurrentMonth,
      monthMenuOpen: navigationModel.state.monthMenuOpen,
      monthPickerOpen: navigationModel.state.monthPickerOpen,
      monthPickerYear: navigationModel.state.monthPickerYear,
      viewedMonthIndex: navigationModel.state.viewedMonthIndex,
      viewedYear: navigationModel.state.viewedYear,
      currentMonthIndex: navigationModel.state.currentMonthIndex,
      currentYear: navigationModel.state.currentYear,
      items: taxonomyModel.state.historyItems,
      scheduledItems: overviewModel.state.scheduledItems,
      scheduledTotal: overviewModel.state.scheduledTotal,
      scheduledHasMore: overviewModel.state.scheduledHasMore,
      expectedItems: overviewModel.state.expectedItems,
      expectedTotal: overviewModel.state.expectedTotal,
      expectedHasMore: overviewModel.state.expectedHasMore,
      filterOptions: taxonomyModel.state.filterOptions,
      pagination: overviewModel.state.pagination,
      pendingVoidTransactionId: mutationsModel.state.pendingVoidTransactionId || undefined,
      pendingDeactivateScheduledId: mutationsModel.state.pendingDeactivateScheduledId || undefined,
      pendingDismissExpectedId: mutationsModel.state.pendingDismissExpectedId || undefined,
    },
    status: {
      loading,
      disabled,
    },
  };

  const provided: MonthlyMovementsViewProvided = {
    commands: {
      goToPreviousMonth: navigationModel.actions.goToPreviousMonth,
      goToCurrentMonth: navigationModel.actions.goToCurrentMonth,
      goToNextMonth: navigationModel.actions.goToNextMonth,
      toggleMonthMenu: navigationModel.actions.toggleMonthMenu,
      closeMonthMenu: navigationModel.actions.closeMonthMenu,
      openMonthPicker: navigationModel.actions.openMonthPicker,
      closeMonthPicker: navigationModel.actions.closeMonthPicker,
      goToPreviousPickerYear: navigationModel.actions.goToPreviousPickerYear,
      goToNextPickerYear: navigationModel.actions.goToNextPickerYear,
      selectPickerMonth: navigationModel.actions.selectPickerMonth,
      goToPreviousPage: () => setPage((previous) => Math.max(0, previous - 1)),
      goToNextPage: () => {
        if (!overviewModel.state.pagination.hasNext) {
          return;
        }
        setPage((previous) => previous + 1);
      },
      requestVoid: mutationsModel.actions.requestVoid,
      deactivateScheduledMovement: mutationsModel.actions.deactivateScheduledMovement,
      editScheduledMovement: (movement, categoryName) => onEditScheduledMovement?.(movement, categoryName),
      postExpectedMovement: mutationsModel.actions.postExpectedMovement,
      dismissExpectedMovement: mutationsModel.actions.dismissExpectedMovement,
      editExpectedMovement: (movement, categoryName) => onEditExpectedMovement?.(movement, categoryName),
    },
  };

  return {
    error,
    toast: {
      message: feedbackModel.state.message,
      actionLabel: feedbackModel.state.actionLabel,
      dismiss: () => {
        if (mutationsModel.state.pendingVoidTransactionId) {
          mutationsModel.actions.cancelPendingVoid('Void canceled.');
        } else {
          feedbackModel.actions.clear();
        }
      },
      runAction: feedbackModel.actions.runAction,
    },
    required,
    provided,
  };
}
