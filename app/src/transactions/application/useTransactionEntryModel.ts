import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { LedgerAccountItem } from '../../ledger/application/ledger.port';
import { useLedgerAccounts } from '../../ledger/application/useLedgerAccounts';
import { useLedgerTransactionCommands } from '../../ledger/application/useLedgerTransactionCommands';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { SchedulingGatewayPort } from '../../scheduling/application/schedulingGateway.port';
import type { ExpectedGatewayPort } from '../../expected/application/expectedGateway.port';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import type { ComposerMode, TransactionFieldErrors } from './transactions.types';
import type { TransactionEntryViewProvided, TransactionEntryViewRequired } from '../ui/TransactionComposer/TransactionEntryView';
import type { TransactionEntryPrefillRequest } from './TransactionEntryComponent.contract';
import {
  hasTransactionComposerValidationErrors,
  validateTransactionComposerSubmission,
} from './transactionComposerValidation';
import { runTransactionSubmissionPlan } from './transactionSubmissionPlan';
import { useExpenseSplitEditorModel } from './useExpenseSplitEditorModel';
import { useTransactionSchedulingModel } from './useTransactionSchedulingModel';
import { useTransactionTaxonomyModel } from './useTransactionTaxonomyModel';
import { useTransactionTransferFxModel } from './useTransactionTransferFxModel';
import { nextRecurrenceDateIso } from '../../shared/domain/nextRecurrenceDate';

export type TransactionEntryModelPorts = {
  ledger: LedgerGatewayPort;
  scheduling: SchedulingGatewayPort;
  expected: ExpectedGatewayPort;
  taxonomy: TaxonomyGatewayPort;
};

export type TransactionEntryModelClock = {
  now(): Date;
  todayIso(): string;
  resolveOccurredAt(dateInput: string): string;
  dayOfMonthFromDateInput(dateInput: string): string;
  weekDayIsoFromDateInput(dateInput: string): string;
  resolveTimeZoneId(): string;
};

export type TransactionEntryModelIdGenerator = {
  nextId(): string;
};

type UseTransactionEntryModelInput = {
  ports: TransactionEntryModelPorts;
  clock: TransactionEntryModelClock;
  idGenerator: TransactionEntryModelIdGenerator;
  accountId: string | null;
  enabled: boolean;
  prefillRequest?: TransactionEntryPrefillRequest;
  onRecorded?: () => void;
  onError?: (error: { message: string }) => void;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function useTransactionEntryModel(input: UseTransactionEntryModelInput) {
  const { ports, clock, idGenerator, accountId, enabled, prefillRequest, onRecorded, onError } = input;
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
    setTransactionAmount,
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

  const {
    transferToAccountId,
    transferTargetOptions,
    transferAmountIn,
    transferFxRate,
    transferFxMode,
    transferDestinationCurrency,
    transferCrossCurrency,
  } = transferFxModel.state;
  const {
    reset: resetTransferFx,
    setTransferToAccountId,
    setTransferAmountIn,
    setTransferFxRate,
    setTransferFxMode,
    setDefaultTargetForAccounts,
    syncForTransferMode,
    syncSourceAmount,
    setTransferTargetValue,
    setTransferAmountInValue,
    setTransferFxRateValue,
    setTransferFxModeValue,
  } = transferFxModel.actions;

  const {
    expenseDetailed,
    expenseItemName,
    expenseItemAmount,
    editingExpenseItemId,
    expenseItems,
    expenseRemaining,
  } = splitEditorModel.state;
  const {
    reset: resetExpenseSplit,
    prefill: prefillExpenseSplit,
    setExpenseDetailedValue,
    setExpenseItemNameValue,
    setExpenseItemAmountValue,
    addExpenseItem,
    startExpenseItem,
    cancelExpenseItem,
    editExpenseItem,
    removeExpenseItem,
    assignRemaining,
    splitExpenseByParts,
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
  } = schedulingModel.state;
  const {
    reset: resetScheduling,
    prefill: prefillScheduling,
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
  const nextScheduledOccurrenceDate = recurrenceEnabled
    ? nextRecurrenceDateIso({
      fromDate: clock.todayIso(),
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
    transactionCategoryInput,
    transactionTagInput,
    categoryOptions,
    tagOptions,
  } = taxonomyModel.state;
  const {
    resetInputs: resetTaxonomyInputs,
    refreshLookups: refreshTaxonomyLookups,
    refreshCategories: refreshTaxonomyCategories,
    setTransactionCategoryInput,
    setTransactionTagInput,
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
    setComposerMode('picker');
    setComposerAdvancedOpen(false);
    setTransactionAmount('');
    setTransactionDate(today);
    setTransactionNote('');
    resetTaxonomyInputs();
    resetTransferFx();
    resetExpenseSplit();
    resetScheduling(today);
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
    setTransactionCategoryInput(prefillRequest.categoryId ?? '');
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

    void (async () => {
      try {
        await refreshTaxonomyCategories();
      } catch (err) {
        reportError(err);
      }
    })();
  }

  function closeTransactionComposer() {
    setComposerOpen(false);
    resetComposerState();
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
      expectedMovement,
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
      expenseRemaining,
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
      categoryInput: transactionCategoryInput,
      categoryOptions,
      tagInput: transactionTagInput,
      tagOptions,
      transferTargetAccountId: transferToAccountId,
      transferTargetOptions,
      transferAmountIn,
      transferFxRate,
      transferFxMode,
      transferDestinationCurrency: transferDestinationCurrency || undefined,
      transferCrossCurrency,
      splitEnabled: expenseDetailed,
      splitItems: expenseItems,
      splitItemName: expenseItemName,
      splitItemAmount: expenseItemAmount,
      editingSplitItemId: editingExpenseItemId,
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
      expected: expectedMovement,
      editedScheduledMovementId: editedScheduledMovementId || undefined,
      postExpectedMovementId: postExpectedMovementId || undefined,
      currencyCode: accountCurrency,
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
      close: closeTransactionComposer,
      selectMode: selectComposerMode,
      toggleAdvanced: () => setComposerAdvancedOpen((previous) => !previous),
      setAmount: setTransactionAmountValue,
      setDate: setTransactionDateValue,
      setNote: setTransactionNote,
      setCategoryInput: setTransactionCategoryInput,
      setTagInput: setTransactionTagInput,
      setTransferTarget: setTransferTargetValue,
      setTransferAmountIn: setTransferAmountInValue,
      setTransferFxRate: setTransferFxRateValue,
      setTransferFxMode: setTransferFxModeValue,
      setSplitEnabled: setExpenseDetailedValue,
      setSplitItemName: setExpenseItemNameValue,
      setSplitItemAmount: setExpenseItemAmountValue,
        addSplitItem: addExpenseItem,
        startSplitItem: startExpenseItem,
        cancelSplitItem: cancelExpenseItem,
        editSplitItem: editExpenseItem,
      removeSplitItem: removeExpenseItem,
        assignSplitRemaining: assignRemaining,
        splitByParts: splitExpenseByParts,
      setSchedulingMode: setSchedulingModeValue,
      setSchedulingKind: setSchedulingKindValue,
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
      submit: submitTransaction,
    },
  };

  return {
    error,
    required,
    provided,
  };
}
