import type { AnalyticsPort } from '../../analytics/application/analytics.port';
import { useEffect, useRef, useState } from 'react';
import type { ExpectedGatewayPort } from '../../expected/application/expectedGateway.port';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { SchedulingGatewayPort } from '../../scheduling/application/schedulingGateway.port';
import type { SharingGatewayPort } from '../../sharing/application/sharingGateway.port';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import type { ExpectedMovementView } from './movementsView.types';
import { useMovementDetailModel } from './useMovementDetailModel';
import { useMonthlyMovementMutationsModel } from './useMonthlyMovementMutationsModel';
import { useMonthlyMovementNavigationModel } from './useMonthlyMovementNavigationModel';
import { useMonthlyMovementsFeedbackModel } from './useMonthlyMovementsFeedbackModel';
import { useMonthlyMovementsOverviewModel } from './useMonthlyMovementsOverviewModel';
import { useMonthlyMovementsTaxonomyModel } from './useMonthlyMovementsTaxonomyModel';
import { useMonthlyMovementsTimelineModel } from './useMonthlyMovementsTimelineModel';
import type { MonthlyMovementsMode, MonthlyMovementsViewProvided, MonthlyMovementsViewRequired } from '../ui/MonthlyMovements/MonthlyMovementsView.contract';
export type MonthlyMovementsModelPorts = {
  analytics: Pick<AnalyticsPort, 'analyticsSetMovementIgnored'>;
  ledger: LedgerGatewayPort;
  scheduling: SchedulingGatewayPort;
  expected: ExpectedGatewayPort;
  sharing: SharingGatewayPort;
  taxonomy: TaxonomyGatewayPort;
};
export type MonthlyMovementsModelClock = { now(): Date };
export type MonthlyMovementsModelTimers = {
  setTimeout(handler: () => void, timeoutMs: number): number;
  clearTimeout(timerId: number): void;
};

type UseMonthlyMovementsModelInput = {
  ports: MonthlyMovementsModelPorts;
  accountId: string | null;
  scope?: 'account' | 'all';
  enabled: boolean;
  refreshSignal: boolean;
  clock: MonthlyMovementsModelClock;
  timers: MonthlyMovementsModelTimers;
  onVoided?: (transactionId: string) => void;
  onExpectedDismissed?: () => void;
  onPostExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
  onEditExpectedMovement?: (movement: ExpectedMovementView, categoryName?: string) => void;
  onError?: (error: { message: string }) => void;
  confirm?: (message: string) => boolean;
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
    scope = 'account',
    enabled,
    refreshSignal,
    clock,
    timers,
    onVoided,
    onExpectedDismissed,
    onPostExpectedMovement,
    onEditExpectedMovement,
    onError,
    confirm,
  } = input;
  const confirmMovementAction = confirm ?? (() => false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [selectedMode, setSelectedMode] = useState<MonthlyMovementsMode>('posted');
  const previousAccountIdRef = useRef<string | null>(null);
  const feedbackModel = useMonthlyMovementsFeedbackModel();
  const navigationModel = useMonthlyMovementNavigationModel({
    clock,
    resetPage: () => setPage(0),
  });
  const overviewModel = useMonthlyMovementsOverviewModel({
    scheduling: ports.scheduling,
    accountId,
    scope,
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
  const timeline = useMonthlyMovementsTimelineModel({
    postedItems: taxonomyModel.state.historyItems,
    expectedItems: overviewModel.state.expectedItems,
    scheduledItems: overviewModel.state.scheduledItems,
    categoryLabels: taxonomyModel.state.filterOptions.categories,
    tagLabels: taxonomyModel.state.filterOptions.tags,
    viewedYear: navigationModel.state.viewedYear,
    viewedMonthIndex: navigationModel.state.viewedMonthIndex,
    currentYear: navigationModel.state.currentYear,
    currentMonthIndex: navigationModel.state.currentMonthIndex,
  });
  function clearError() {
    setError('');
  }
  function reportError(raw: unknown) {
    const message = toErrorMessage(raw);
    setError(message);
    onError?.({ message });
  }
  async function loadAccountNameById(): Promise<Map<string, string>> {
    if (scope !== 'all') return new Map();
    const result = await ports.ledger.ledgerListAccounts();
    return new Map(result.items.map((account) => [account.id, account.name]));
  }
  async function refreshMovements() {
    const accountNameById = await loadAccountNameById();
    const loadedTransactions = await overviewModel.actions.refresh(accountNameById);
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
  const detailModel = useMovementDetailModel({
    ports: {
      analytics: ports.analytics,
      expected: ports.expected,
      scheduling: ports.scheduling,
      sharing: ports.sharing,
      taxonomy: ports.taxonomy,
    },
    postedItems: taxonomyModel.state.historyItems,
    scheduledItems: overviewModel.state.scheduledItems,
    expectedItems: overviewModel.state.expectedItems,
    categories: taxonomyModel.state.categories,
    tags: taxonomyModel.state.tags,
    refreshMovements,
    requestVoid: mutationsModel.actions.requestVoid,
    pendingVoidTransactionId: mutationsModel.state.pendingVoidTransactionId || undefined,
    clearError,
    reportError,
    clock,
    confirm: confirmMovementAction,
    onEditExpectedMovement,
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
    if (!enabled || (scope === 'account' && !accountId)) {
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
    scope,
    refreshSignal,
    page,
    monthStartTime,
    monthEndTime,
  ]);
  const disabled = loading || mutationsModel.state.mutating || mutationsModel.state.postingTransaction || mutationsModel.state.voidMutationPhase === 'committing';
  const required: MonthlyMovementsViewRequired = {
    state: {
      selectedMode,
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
      postedGroups: timeline.postedGroups,
      plannedGroups: timeline.plannedGroups,
    },
    status: {
      loading,
      disabled,
    },
    detail: detailModel.required,
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
      openPostedMovementDetail: detailModel.actions.openPostedMovementDetail,
      openScheduledMovementDetail: detailModel.actions.openScheduledMovementDetail,
      openExpectedMovementDetail: detailModel.actions.openExpectedMovementDetail,
      selectMode: setSelectedMode,
    },
    detail: detailModel.provided,
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
