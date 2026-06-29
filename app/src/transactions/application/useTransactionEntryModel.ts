import { useEffect, useState, type FormEvent } from 'react';
import type { LedgerAccountItem } from '../../ledger/application/ledger.port';
import { useLedgerAccounts } from '../../ledger/application/useLedgerAccounts';
import { useLedgerTransactionCommands } from '../../ledger/application/useLedgerTransactionCommands';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { SchedulingGatewayPort } from '../../scheduling/application/schedulingGateway.port';
import type { ExpectedGatewayPort } from '../../expected/application/expectedGateway.port';
import type { SharingGatewayPort } from '../../sharing/application/sharingGateway.port';
import { useShareDraftModel } from '../../sharing/application/useShareDraftModel';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import type { ComposerMode, TransactionFieldErrors } from './transactions.types';
import type { TransactionEntryViewProvided, TransactionEntryViewRequired } from '../ui/TransactionComposer/TransactionEntryView';
import type { TransactionEntryPrefillRequest } from './TransactionEntryComponent.contract';
import { hasTransactionComposerValidationErrors, validateTransactionComposerSubmission } from './transactionComposerValidation';
import { runTransactionSubmissionPlan } from './transactionSubmissionPlan';
import { useExpenseSplitEditorModel } from './useExpenseSplitEditorModel';
import { useTransactionSchedulingModel } from './useTransactionSchedulingModel';
import { useTransactionTaxonomyModel } from './useTransactionTaxonomyModel';
import { useTransactionTransferFxModel } from './useTransactionTransferFxModel';
import { useTransactionEntryOpenSignal } from './useTransactionEntryOpenSignal';
import { nextRecurrenceDateIso } from '../../shared/domain/nextRecurrenceDate';
import { applyTransactionEntryInitialMode, type TransactionEntryInitialMode } from './transactionEntryInitialMode';

export type TransactionEntryModelPorts = {
  ledger: LedgerGatewayPort; scheduling: SchedulingGatewayPort; expected: ExpectedGatewayPort; sharing: SharingGatewayPort; taxonomy: TaxonomyGatewayPort;
};

export type TransactionEntryModelClock = {
  now(): Date; todayIso(): string; resolveOccurredAt(dateInput: string): string;
  dayOfMonthFromDateInput(dateInput: string): string; weekDayIsoFromDateInput(dateInput: string): string; resolveTimeZoneId(): string;
};

export type TransactionEntryModelIdGenerator = { nextId(): string };

type UseTransactionEntryModelInput = {
  ports: TransactionEntryModelPorts;
  clock: TransactionEntryModelClock;
  idGenerator: TransactionEntryModelIdGenerator;
  accountId: string | null; enabled: boolean; prefillRequest?: TransactionEntryPrefillRequest; openSignal?: number;
  initialMode?: TransactionEntryInitialMode; movementAccountContext?: { name: string; type?: TransactionEntryInitialMode };
  onRecorded?: () => void; onClosed?: () => void; onCollapsed?: () => void; onAccountChanged?: (account: { id: string; name: string }) => void; onError?: (error: { message: string }) => void;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function resolveSubmitExpectedIntent(event: FormEvent, fallback: boolean): boolean {
  const nativeEvent = event.nativeEvent;
  const submitter = nativeEvent && 'submitter' in nativeEvent
    ? (nativeEvent as Event & { submitter?: EventTarget | null }).submitter
    : undefined;
  if (
    typeof HTMLButtonElement !== 'undefined'
    && submitter instanceof HTMLButtonElement
    && submitter.name === 'transactionIntent'
  ) {
    return submitter.value === 'expected';
  }
  return fallback;
}

export function useTransactionEntryModel(input: UseTransactionEntryModelInput) {
  const { ports, clock, idGenerator, accountId, enabled, prefillRequest, openSignal, initialMode, movementAccountContext, onRecorded, onClosed, onCollapsed, onAccountChanged, onError } = input;
  const initialToday = clock.todayIso();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postingTransaction, setPostingTransaction] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<LedgerAccountItem[]>([]);
  const [accountCurrency, setAccountCurrency] = useState('USD');
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>('picker');
  const [composerAdvancedOpen, setComposerAdvancedOpen] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(initialToday);
  const [transactionNote, setTransactionNote] = useState('');
  const [fieldErrors, setFieldErrors] = useState<TransactionFieldErrors>({});
  const shareDraftModel = useShareDraftModel(ports.sharing);
  const ledgerAccounts = useLedgerAccounts(ports.ledger);
  const ledgerTransactionCommands = useLedgerTransactionCommands(ports.ledger);
  const transferFxModel = useTransactionTransferFxModel({
    accounts,
    accountId,
    accountCurrency,
    composerMode,
    transactionAmount,
    setFieldErrors,
  });
  const splitEditorModel = useExpenseSplitEditorModel({
    transactionAmount,
    nextId: idGenerator.nextId,
    setFieldErrors,
  });
  const schedulingModel = useTransactionSchedulingModel({
    clock,
    initialToday,
    setFieldErrors,
  });
  const taxonomyModel = useTransactionTaxonomyModel({
    taxonomy: ports.taxonomy,
    composerMode,
  });
  const { transferToAccountId, transferTargetOptions, transferAmountIn, transferFxRate, transferFxMode, transferDestinationCurrency, transferCrossCurrency } =
    transferFxModel.state;
  const {
    reset: resetTransferFx, setTransferToAccountId, setTransferAmountIn, setTransferFxRate, setTransferFxMode,
    setDefaultTargetForAccounts, syncForTransferMode, syncSourceAmount, setTransferTargetValue,
    setTransferAmountInValue, setTransferFxRateValue, setTransferFxModeValue,
  } = transferFxModel.actions;
  const {
    expenseDetailed, splitEditorOpen, splitApplied, splitDraftMode, expenseItemName, expenseItemAmount,
    editingExpenseItemId, expenseItems, expenseItemOptions, expenseRemaining, expenseSplitTotal,
  } = splitEditorModel.state;
  const {
    reset: resetExpenseSplit, prefill: prefillExpenseSplit, openSplitEditor, closeSplitEditor, applySplit, removeSplit,
    setSplitDraftMode, setExpenseDetailedValue, setExpenseItemNameValue, setExpenseItemAmountValue, addExpenseItem, startExpenseItem,
    cancelExpenseItem, editExpenseItem, removeExpenseItem, splitExpenseByParts,
  } = splitEditorModel.actions;
  const {
    schedulingMode,
    expectedMovement,
    editedExpectedMovementId,
    editedScheduledMovementId,
    postExpectedMovementId,
    schedulingKind,
    recurrenceFrequency,
    recurrenceInterval,
    recurrenceWeeklyDay,
    recurrenceMonthlyPattern,
    recurrenceDayOfMonth,
    recurrenceMonthlyOrdinal,
    recurrenceMonthlyWeekday,
    recurrenceEndKind,
    recurrenceEndDate,
    recurrenceEndCount,
    recurrenceEnabled,
    scheduleEditorOpen,
  } = schedulingModel.state;
  const {
    reset: resetScheduling,
    prefill: prefillScheduling,
    openRecurringScheduleEditor,
    applyRecurringSchedule,
    closeRecurringScheduleEditor,
    removeRecurringSchedule,
    syncDateFields,
    setSchedulingModeValue,
    setSchedulingKindValue,
    setRecurrenceFrequencyValue,
    setRecurrenceIntervalValue,
    setRecurrenceWeeklyDay,
    setRecurrenceMonthlyPattern,
    setRecurrenceDayOfMonth,
    setRecurrenceMonthlyOrdinal,
    setRecurrenceMonthlyWeekday,
    setRecurrenceEndKindValue,
    setRecurrenceEndDateValue,
    setRecurrenceEndCountValue,
    setExpectedMovement,
    setExpectedMovementValue,
  } = schedulingModel.actions;
  const scheduleBaseDate = /^\d{4}-\d{2}-\d{2}$/.test(transactionDate)
    ? transactionDate
    : clock.todayIso();
  const nextScheduledOccurrenceDate = (recurrenceEnabled || scheduleEditorOpen)
    ? nextRecurrenceDateIso({
      fromDate: scheduleBaseDate,
      frequency: recurrenceFrequency,
      interval: recurrenceInterval,
      weeklyDay: recurrenceWeeklyDay,
      monthlyPattern: recurrenceMonthlyPattern,
      dayOfMonth: recurrenceDayOfMonth,
      monthlyOrdinal: recurrenceMonthlyOrdinal,
      monthlyWeekday: recurrenceMonthlyWeekday,
    })
    : undefined;
  const effectiveTransactionDate = nextScheduledOccurrenceDate ?? transactionDate;

  const {
    transactionCategoryId,
    transactionTagInput,
    selectedTagOptions,
    tagSuggestions,
    tagCreateCandidate,
    categoryOptions,
  } = taxonomyModel.state;
  const {
    resetInputs: resetTaxonomyInputs,
    refreshLookups: refreshTaxonomyLookups,
    refreshCategories: refreshTaxonomyCategories,
    setTransactionCategoryId,
    setTransactionTagInput,
    selectTag,
    createTag,
    removeTag,
    removeLastTag,
    resolveCategorySelection,
    parseTransactionTags,
    resolveTagSelectionIds,
    categorizeTransaction,
    applyTransactionTags,
  } = taxonomyModel.actions;
  function reportError(raw: unknown) {
    const message = toErrorMessage(raw);
    setError(message);
    onError?.({ message });
  }

  function resetComposerState() {
    const today = clock.todayIso();
    setComposerMode('expense');
    setComposerAdvancedOpen(false);
    setTransactionAmount('');
    setTransactionDate(today);
    setTransactionNote('');
    resetTaxonomyInputs();
    resetTransferFx();
    resetExpenseSplit();
    resetScheduling(today);
    shareDraftModel.actions.reset();
    setFieldErrors({});
  }

  async function refreshAccountSnapshot() {
    const accountResult = await ledgerAccounts.listAccounts();
    setAccounts(accountResult.items);
    if (!accountId) {
      setAccountCurrency('USD');
      setTransferToAccountId('');
      return;
    }
    const selectedAccount = accountResult.items.find((item) => item.id === accountId);
    if (!selectedAccount) {
      setAccountCurrency('USD');
      setTransferToAccountId('');
      return;
    }

    const summary = await ledgerAccounts.getAccountSummary({ accountId });
    setAccountCurrency(summary.currency);
    setDefaultTargetForAccounts(accountResult.items, accountId);
  }

  useEffect(() => {
    if (!enabled || !accountId) {
      setLoading(false);
      setComposerOpen(false);
      setError('');
      return;
    }
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError('');
      try {
        await refreshAccountSnapshot();
        await refreshTaxonomyLookups();
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, accountId]);

  useEffect(() => {
    if (!enabled || !accountId || !prefillRequest) {
      return;
    }
    setError('');
    resetComposerState();
    setComposerOpen(true);
    setComposerMode(prefillRequest.mode);
    setComposerAdvancedOpen(true);
    setTransactionAmount(prefillRequest.amount.replace('-', ''));
    setTransactionDate(prefillRequest.date);
    setTransactionNote(prefillRequest.note ?? '');
    setTransactionCategoryId(prefillRequest.categoryId ?? '');
    if (prefillRequest.mode === 'transfer') {
      setTransferToAccountId(prefillRequest.transferTargetAccountId ?? '');
      setTransferAmountIn(prefillRequest.transferAmountIn ?? '');
      setTransferFxRate(prefillRequest.transferFxRate ?? '1');
      setTransferFxMode(prefillRequest.transferFxMode ?? 'auto_destination');
    }
    prefillScheduling(prefillRequest);
    prefillExpenseSplit(prefillRequest.splitItems ?? []);
    void (async () => {
      try {
        await refreshTaxonomyLookups();
      } catch (err) {
        reportError(err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, accountId, prefillRequest?.requestId]);

  function openTransactionComposer() {
    if (!accountId) {
      setError('Select an account first.');
      return;
    }
    setError('');
    setComposerOpen(true);
    resetComposerState();
    applyTransactionEntryInitialMode(initialMode ?? 'expense', setComposerMode, () => {
      setExpectedMovement(false);
      syncForTransferMode();
    });
    void (async () => {
      try {
        await refreshTaxonomyCategories();
        await shareDraftModel.actions.refreshPeopleSuggestions();
      } catch (err) {
        reportError(err);
      }
    })();
  }

  useTransactionEntryOpenSignal(openSignal, enabled, accountId, openTransactionComposer);

  function finishTransactionComposer(callback?: () => void) {
    setComposerOpen(false);
    resetComposerState();
    callback?.();
  }

  function selectComposerMode(mode: Exclude<ComposerMode, 'picker'>) {
    setComposerMode(mode);
    setComposerAdvancedOpen(false);
    resetTaxonomyInputs();
    if (mode !== 'transfer') {
      return;
    }

    setExpectedMovement(false);
    syncForTransferMode();
  }

  function selectSourceAccount(accountIdValue: string) {
    const account = accounts.find((item) => item.id === accountIdValue);
    if (account && account.id !== accountId) onAccountChanged?.({ id: account.id, name: account.name });
  }

  function setTransactionAmountValue(value: string) {
    const normalized = value.replace('-', '');
    setTransactionAmount(normalized);
    setFieldErrors((previous) => ({
      ...previous,
      amount: undefined,
      transferAmountIn: undefined,
      transferFxRate: undefined,
      expenseSplit: undefined,
    }));
    syncSourceAmount(normalized);
  }

  function setTransactionDateValue(value: string) {
    setTransactionDate(value);
    setFieldErrors((previous) => ({
      ...previous,
      date: undefined,
      recurrenceEndDate: undefined,
    }));
    syncDateFields(value);
  }

  function applyRecurringScheduleValue() {
    const nextDate = nextScheduledOccurrenceDate ?? scheduleBaseDate;
    setTransactionDate(nextDate);
    applyRecurringSchedule();
  }

  function removeRecurringScheduleValue() {
    setTransactionDate(effectiveTransactionDate);
    removeRecurringSchedule();
  }

  function applySplitValue() {
    if (expenseItems.length === 0) {
      setFieldErrors((previous) => ({
        ...previous,
        amount: undefined,
        expenseSplit: undefined,
      }));
      removeSplit();
      return;
    }

    setFieldErrors((previous) => ({
      ...previous,
      amount: undefined,
      expenseSplit: undefined,
    }));
    if (Number(expenseSplitTotal) > 0) {
      setTransactionAmount(expenseSplitTotal);
      syncSourceAmount(expenseSplitTotal);
    }
    applySplit();
  }

  async function submitTransaction(event: FormEvent) {
    event.preventDefault();
    setError('');
    setFieldErrors({});

    if (!accountId) {
      setError('Select an account first.');
      return;
    }

    const transferTarget = composerMode === 'transfer'
      ? accounts.find((account) => account.id === transferToAccountId)
      : undefined;

    const validation = validateTransactionComposerSubmission({
      accountId,
      mode: composerMode,
      amount: transactionAmount,
      transactionDate: effectiveTransactionDate,
      schedulingMode,
      recurrenceEnabled,
      expectedMovement: resolveSubmitExpectedIntent(event, expectedMovement),
      editedExpectedMovementId,
      editedScheduledMovementId,
      postExpectedMovementId,
      transferToAccountId,
      transferTarget,
      accountCurrency,
      transferAmountIn,
      transferFxRate,
      transferFxMode,
      expenseDetailed,
      expenseItemsLength: expenseItems.length,
      recurrenceInterval,
      recurrenceEndKind,
      recurrenceEndDate,
      recurrenceEndCount,
      todayIso: clock.todayIso(),
    });

    if (validation.blockingError) {
      setError(validation.blockingError);
      return;
    }

    if (hasTransactionComposerValidationErrors(validation.errors)) {
      setFieldErrors(validation.errors);
      return;
    }

    const amount = transactionAmount.trim();
    const resolvedTransactionDate = validation.resolvedTransactionDate;
    const movementExpected = validation.movementExpected;
    const movementScheduled = validation.movementScheduled;

    setPostingTransaction(true);
    try {
      const result = await runTransactionSubmissionPlan({
        ports: {
          scheduling: ports.scheduling,
          expected: ports.expected,
          sharing: ports.sharing,
        },
        ledgerTransactionCommands,
        clock,
        accountId,
        accounts,
        accountCurrency,
        composerMode,
        amount,
        resolvedTransactionDate,
        transactionNote,
        transferToAccountId,
        transferAmountIn,
        transferFxRate,
        transferFxMode,
        schedulingMode,
        schedulingKind,
        recurrenceEnabled,
        recurrenceFrequency,
        recurrenceInterval,
        recurrenceWeeklyDay,
        recurrenceMonthlyPattern,
        recurrenceDayOfMonth,
        recurrenceMonthlyOrdinal,
        recurrenceMonthlyWeekday,
        recurrenceEndKind,
        recurrenceEndDate,
        recurrenceEndCount,
        movementExpected,
        movementScheduled,
        expenseDetailed,
        expenseItems,
        editedScheduledMovementId,
        editedExpectedMovementId,
        postExpectedMovementId,
        shareDraft: shareDraftModel.state.draft,
        resolveCategorySelection,
        parseTransactionTags,
        resolveTagSelectionIds,
        categorizeTransaction,
        applyTransactionTags,
      });

      if (result.recorded) {
        onRecorded?.();
        setComposerOpen(false);
        resetComposerState();

        setRefreshing(true);
        try {
          await refreshAccountSnapshot();
        } finally {
          setRefreshing(false);
        }
      }
    } catch (err) {
      reportError(err);
    } finally {
      setPostingTransaction(false);
    }
  }

  const required: TransactionEntryViewRequired = {
    state: {
      open: composerOpen,
      mode: composerMode,
      advancedOpen: composerAdvancedOpen,
      amount: transactionAmount,
      date: effectiveTransactionDate,
      nextScheduledOccurrenceDate,
      note: transactionNote,
      categoryId: transactionCategoryId,
      categoryOptions,
      tagInput: transactionTagInput,
      selectedTagOptions,
      tagSuggestions,
      tagCreateCandidate,
      transferTargetAccountId: transferToAccountId,
      sourceAccountId: accountId ?? '',
      sourceAccountOptions: accounts.filter((account) => account.status === 'active')
        .map((account) => ({ id: account.id, name: account.name, currency: account.currency, type: account.type })),
      transferTargetOptions,
      transferAmountIn,
      transferFxRate,
      transferFxMode,
      transferDestinationCurrency: transferDestinationCurrency || undefined,
      transferCrossCurrency,
      splitEnabled: expenseDetailed,
      splitEditorOpen,
      splitApplied,
      splitDraftMode, splitItems: expenseItems,
      splitItemOptions: expenseItemOptions,
      splitItemName: expenseItemName,
      splitItemAmount: expenseItemAmount,
      editingSplitItemId: editingExpenseItemId,
      splitTotal: expenseSplitTotal,
      splitRemaining: expenseRemaining,
      schedulingMode,
      schedulingKind,
      recurrenceFrequency,
      recurrenceInterval,
      recurrenceWeeklyDay,
      recurrenceMonthlyPattern,
      recurrenceDayOfMonth,
      recurrenceMonthlyOrdinal,
      recurrenceMonthlyWeekday,
      recurrenceEndKind,
      recurrenceEndDate,
      recurrenceEndCount,
      scheduleEditorOpen,
      expected: expectedMovement,
      shareEditorOpen: shareDraftModel.state.editorOpen,
      shareDraft: shareDraftModel.state.draft,
      shareSummary: shareDraftModel.state.summary,
      sharePeopleSuggestions: shareDraftModel.state.peopleSuggestions,
      editedScheduledMovementId: editedScheduledMovementId || undefined,
      postExpectedMovementId: postExpectedMovementId || undefined,
      currencyCode: accountCurrency,
      movementAccountContext,
    },
    status: {
      submitting: postingTransaction,
      disabled: loading || refreshing || postingTransaction,
      errors: fieldErrors,
    },
  };

  const provided: TransactionEntryViewProvided = {
    commands: {
      open: openTransactionComposer,
      close: () => finishTransactionComposer(onClosed),
      collapse: () => finishTransactionComposer(onCollapsed),
      selectMode: selectComposerMode,
      selectSourceAccount,
      toggleAdvanced: () => setComposerAdvancedOpen((previous) => !previous),
      setAmount: setTransactionAmountValue,
      setDate: setTransactionDateValue,
      setNote: setTransactionNote,
      setCategoryId: setTransactionCategoryId,
      setTagInput: setTransactionTagInput,
      selectTag,
      createTag,
      removeTag,
      removeLastTag,
      setTransferTarget: setTransferTargetValue,
      setTransferAmountIn: setTransferAmountInValue,
      setTransferFxRate: setTransferFxRateValue,
      setTransferFxMode: setTransferFxModeValue,
      setSplitEnabled: setExpenseDetailedValue,
      openSplitEditor,
      closeSplitEditor,
      applySplit: applySplitValue,
      removeSplit,
      setSplitItemName: setExpenseItemNameValue,
      setSplitItemAmount: setExpenseItemAmountValue,
      addSplitItem: addExpenseItem,
      startSplitItem: startExpenseItem,
      cancelSplitItem: cancelExpenseItem,
      editSplitItem: editExpenseItem,
      removeSplitItem: removeExpenseItem,
      splitByParts: splitExpenseByParts,
      splitByWeightedParts: splitEditorModel.actions.splitExpenseByWeightedParts,
      selectSplitMode: setSplitDraftMode,
      setSchedulingMode: setSchedulingModeValue,
      setSchedulingKind: setSchedulingKindValue,
      openRecurringScheduleEditor: () => openRecurringScheduleEditor(scheduleBaseDate),
      applyRecurringSchedule: applyRecurringScheduleValue,
      closeRecurringScheduleEditor,
      removeRecurringSchedule: removeRecurringScheduleValue,
      setRecurrenceFrequency: setRecurrenceFrequencyValue,
      setRecurrenceInterval: setRecurrenceIntervalValue,
      setRecurrenceWeeklyDay,
      setRecurrenceMonthlyPattern,
      setRecurrenceDayOfMonth,
      setRecurrenceMonthlyOrdinal,
      setRecurrenceMonthlyWeekday,
      setRecurrenceEndKind: setRecurrenceEndKindValue,
      setRecurrenceEndDate: setRecurrenceEndDateValue,
      setRecurrenceEndCount: setRecurrenceEndCountValue,
      setExpected: setExpectedMovementValue,
      openShareEditor: shareDraftModel.actions.openEditor,
      closeShareEditor: shareDraftModel.actions.closeEditor,
      applyShareDraft: shareDraftModel.actions.applyShareDraft,
      removeShareDraft: shareDraftModel.actions.removeShareDraft,
      submit: submitTransaction,
    },
  };

  return { error, required, provided };
}
