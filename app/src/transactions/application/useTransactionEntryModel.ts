import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  LedgerAccountItem,
  SchedulingEndInput,
  SchedulingFrequency,
  SchedulingMonthlyPattern,
  TaxonomyCategoryItem,
  TaxonomyTagItem,
} from '../../shared/domain/corePort';
import { useLedgerAccounts } from '../../ledger/application/useLedgerAccounts';
import { useLedgerTransactionCommands } from '../../ledger/application/useLedgerTransactionCommands';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import type { SchedulingGatewayPort } from '../../scheduling/application/schedulingGateway.port';
import type { ExpectedGatewayPort } from '../../expected/application/expectedGateway.port';
import { useCategorySuggestions } from '../../taxonomy/application/useCategorySuggestions';
import { useTagSuggestions } from '../../taxonomy/application/useTagSuggestions';
import { useTransactionClassification } from '../../taxonomy/application/useTransactionClassification';
import type { TaxonomyCategoryAppliesTo } from '../../taxonomy/domain/taxonomy.types';
import type { TaxonomyGatewayPort } from '../../taxonomy/application/taxonomyGateway.port';
import type { ExpenseItemDraft, TransactionFieldErrors } from '../domain/transactions.types';
import type { TransactionEntryViewProvided, TransactionEntryViewRequired } from '../ui/TransactionEntryView';
import type { TransactionEntryPrefillRequest } from './TransactionEntryComponent.contract';
import {
  hasTransactionComposerValidationErrors,
  validateTransactionComposerSubmission,
} from './transactionComposerValidation';
import { runTransactionSubmissionPlan } from './transactionSubmissionPlan';
import {
  calculateSplitRemaining,
  cloneSplitItems,
  createRemainingSplitItem,
  formatSplitTotal,
  sumSplitItems,
  upsertSplitItem,
} from './transactionSplitItems';
import {
  calculateTransferDestinationAmount,
  calculateTransferFxRate,
  normalizePositiveFxRate,
} from './transactionTransferFx';

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

function parseAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function normalizeTaxonomyName(value: string): string {
  return value.trim().toLowerCase();
}

function findActiveCategoryByName(
  items: TaxonomyCategoryItem[],
  appliesTo: TaxonomyCategoryAppliesTo,
  normalizedName: string,
): TaxonomyCategoryItem | undefined {
  return items.find(
    (category) =>
      category.status === 'active'
      && category.appliesTo === appliesTo
      && normalizeTaxonomyName(category.name) === normalizedName,
  );
}

function mergeCategories(
  previous: TaxonomyCategoryItem[],
  incoming: TaxonomyCategoryItem[],
): TaxonomyCategoryItem[] {
  const byScopeAndName = new Map<string, TaxonomyCategoryItem>();
  for (const category of [...previous, ...incoming]) {
    byScopeAndName.set(`${category.appliesTo}:${normalizeTaxonomyName(category.name)}`, category);
  }
  return [...byScopeAndName.values()].sort((left, right) => left.name.localeCompare(right.name));
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
  const [composerMode, setComposerMode] = useState<'picker' | 'expense' | 'income' | 'transfer'>('picker');
  const [composerAdvancedOpen, setComposerAdvancedOpen] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(initialToday);
  const [transactionNote, setTransactionNote] = useState('');
  const [transactionCategoryInput, setTransactionCategoryInput] = useState('');
  const [transactionTagInput, setTransactionTagInput] = useState('');
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [transferAmountIn, setTransferAmountIn] = useState('');
  const [transferFxRate, setTransferFxRate] = useState('1');
  const [transferFxMode, setTransferFxMode] = useState<'auto_destination' | 'auto_rate'>('auto_destination');

  const [categories, setCategories] = useState<TaxonomyCategoryItem[]>([]);
  const [tags, setTags] = useState<TaxonomyTagItem[]>([]);

  const [expenseDetailed, setExpenseDetailed] = useState(false);
  const [expenseItemName, setExpenseItemName] = useState('');
  const [expenseItemAmount, setExpenseItemAmount] = useState('');
  const [expenseItems, setExpenseItems] = useState<ExpenseItemDraft[]>([]);
  const [editingExpenseItemId, setEditingExpenseItemId] = useState('');
  const [schedulingMode, setSchedulingMode] = useState<'now' | 'scheduled'>('now');
  const [expectedMovement, setExpectedMovement] = useState(false);
  const [editedExpectedMovementId, setEditedExpectedMovementId] = useState('');
  const [editedScheduledMovementId, setEditedScheduledMovementId] = useState('');
  const [postExpectedMovementId, setPostExpectedMovementId] = useState('');
  const [schedulingKind, setSchedulingKind] = useState<'one_shot' | 'recurring'>('one_shot');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<SchedulingFrequency>('monthly');
  const [recurrenceInterval, setRecurrenceInterval] = useState('1');
  const [recurrenceWeeklyDay, setRecurrenceWeeklyDay] = useState(clock.weekDayIsoFromDateInput(initialToday));
  const [recurrenceMonthlyPattern, setRecurrenceMonthlyPattern] = useState<SchedulingMonthlyPattern>('day_of_month');
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState(clock.dayOfMonthFromDateInput(initialToday));
  const [recurrenceMonthlyOrdinal, setRecurrenceMonthlyOrdinal] = useState('1');
  const [recurrenceMonthlyWeekday, setRecurrenceMonthlyWeekday] = useState(clock.weekDayIsoFromDateInput(initialToday));
  const [recurrenceEndKind, setRecurrenceEndKind] = useState<SchedulingEndInput['kind']>('never');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceEndCount, setRecurrenceEndCount] = useState('12');
  const [fieldErrors, setFieldErrors] = useState<TransactionFieldErrors>({});

  const ledgerAccounts = useLedgerAccounts(ports.ledger);
  const ledgerTransactionCommands = useLedgerTransactionCommands(ports.ledger);
  const categorySuggestions = useCategorySuggestions(ports.taxonomy);
  const tagSuggestions = useTagSuggestions(ports.taxonomy);
  const transactionClassification = useTransactionClassification(ports.taxonomy);

  const transferTargetOptions = useMemo(
    () => accounts.filter((account) => account.id !== accountId),
    [accounts, accountId],
  );
  const selectedTransferTarget = useMemo(
    () => transferTargetOptions.find((account) => account.id === transferToAccountId),
    [transferTargetOptions, transferToAccountId],
  );
  const transferDestinationCurrency = selectedTransferTarget?.currency ?? '';
  const transferCrossCurrency = Boolean(
    transferToAccountId
    && transferDestinationCurrency
    && transferDestinationCurrency.toUpperCase() !== accountCurrency.toUpperCase(),
  );

  const categoryOptions = useMemo(() => {
    if (composerMode !== 'expense' && composerMode !== 'income') {
      return [] as Array<{ id: string; name: string }>;
    }
    return categories
      .filter((category) => category.status === 'active')
      .map((category) => ({ id: category.id, name: category.name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [categories, composerMode]);

  const tagOptions = useMemo(
    () => tags
      .filter((tag) => tag.status === 'active')
      .map((tag) => ({ id: tag.id, name: tag.name }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    [tags],
  );

  const expenseRemaining = useMemo(
    () => calculateSplitRemaining(transactionAmount, expenseItems),
    [transactionAmount, expenseItems],
  );
  const recurrenceEnabled = schedulingMode === 'scheduled' && schedulingKind === 'recurring';

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
    setTransactionCategoryInput('');
    setTransactionTagInput('');
    setTransferAmountIn('');
    setTransferFxRate('1');
    setTransferFxMode('auto_destination');
    setExpenseDetailed(false);
    setExpenseItemName('');
    setExpenseItemAmount('');
    setExpenseItems([]);
    setEditingExpenseItemId('');
    setSchedulingMode('now');
    setExpectedMovement(false);
    setEditedExpectedMovementId('');
    setEditedScheduledMovementId('');
    setPostExpectedMovementId('');
    setSchedulingKind('one_shot');
    setRecurrenceFrequency('monthly');
    setRecurrenceInterval('1');
    setRecurrenceWeeklyDay(clock.weekDayIsoFromDateInput(today));
    setRecurrenceMonthlyPattern('day_of_month');
    setRecurrenceDayOfMonth(clock.dayOfMonthFromDateInput(today));
    setRecurrenceMonthlyOrdinal('1');
    setRecurrenceMonthlyWeekday(clock.weekDayIsoFromDateInput(today));
    setRecurrenceEndKind('never');
    setRecurrenceEndDate('');
    setRecurrenceEndCount('12');
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

    setTransferToAccountId((previous) =>
      accountResult.items.find((item) => item.id === previous && item.id !== accountId)?.id
      ?? accountResult.items.find((item) => item.id !== accountId)?.id
      ?? '',
    );
  }

  async function refreshTaxonomyLookups() {
    const taxonomy = await categorySuggestions.listCategories({ includeArchived: false });
    setCategories(taxonomy.items);
    const taxonomyTags = await tagSuggestions.listTags({ includeArchived: false });
    setTags(taxonomyTags.items);
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
    const isScheduledEdit = Boolean(prefillRequest.editedScheduledMovementId);
    const isExpectedEdit = Boolean(prefillRequest.editedExpectedMovementId);
    const isPostExpected = Boolean(prefillRequest.postExpectedMovementId);
    setSchedulingMode(prefillRequest.schedulingMode ?? (isScheduledEdit ? 'scheduled' : 'now'));
    setSchedulingKind(prefillRequest.schedulingKind ?? 'one_shot');
    if (prefillRequest.recurrenceFrequency) {
      setRecurrenceFrequency(prefillRequest.recurrenceFrequency);
    }
    if (prefillRequest.recurrenceInterval != null) {
      setRecurrenceInterval(prefillRequest.recurrenceInterval);
    }
    if (prefillRequest.recurrenceWeeklyDay != null) {
      setRecurrenceWeeklyDay(prefillRequest.recurrenceWeeklyDay);
    }
    if (prefillRequest.recurrenceMonthlyPattern) {
      setRecurrenceMonthlyPattern(prefillRequest.recurrenceMonthlyPattern);
    }
    if (prefillRequest.recurrenceDayOfMonth != null) {
      setRecurrenceDayOfMonth(prefillRequest.recurrenceDayOfMonth);
    }
    if (prefillRequest.recurrenceMonthlyOrdinal != null) {
      setRecurrenceMonthlyOrdinal(prefillRequest.recurrenceMonthlyOrdinal);
    }
    if (prefillRequest.recurrenceMonthlyWeekday != null) {
      setRecurrenceMonthlyWeekday(prefillRequest.recurrenceMonthlyWeekday);
    }
    if (prefillRequest.recurrenceEndKind) {
      setRecurrenceEndKind(prefillRequest.recurrenceEndKind);
    }
    if (prefillRequest.recurrenceEndDate != null) {
      setRecurrenceEndDate(prefillRequest.recurrenceEndDate);
    }
    if (prefillRequest.recurrenceEndCount != null) {
      setRecurrenceEndCount(prefillRequest.recurrenceEndCount);
    }
    setExpectedMovement(isExpectedEdit && !isPostExpected && !isScheduledEdit);
    setExpenseDetailed((prefillRequest.splitItems?.length ?? 0) > 0);
    setExpenseItems(cloneSplitItems(prefillRequest.splitItems ?? [], idGenerator.nextId));
    setEditingExpenseItemId('');
    setEditedExpectedMovementId(prefillRequest.postExpectedMovementId ? '' : (prefillRequest.editedExpectedMovementId ?? ''));
    setEditedScheduledMovementId(prefillRequest.editedScheduledMovementId ?? '');
    setPostExpectedMovementId(prefillRequest.postExpectedMovementId ?? '');

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
        const taxonomy = await categorySuggestions.listCategories({ includeArchived: false });
        setCategories(taxonomy.items);
      } catch (err) {
        reportError(err);
      }
    })();
  }

  function closeTransactionComposer() {
    setComposerOpen(false);
    resetComposerState();
  }

  function selectComposerMode(mode: Exclude<typeof composerMode, 'picker'>) {
    setComposerMode(mode);
    setComposerAdvancedOpen(false);
    setTransactionCategoryInput('');
    setTransactionTagInput('');
    if (mode === 'transfer') {
      setExpectedMovement(false);
    }

    if (mode === 'transfer') {
      const target = accounts.find((account) => account.id === transferToAccountId);
      const crossCurrency = Boolean(
        target
        && target.currency.toUpperCase() !== accountCurrency.toUpperCase(),
      );

      if (!crossCurrency) {
        setTransferAmountIn(transactionAmount);
        setTransferFxRate('1');
        return;
      }

      if (transferFxMode === 'auto_destination') {
        const nextRate = normalizePositiveFxRate(transferFxRate);
        setTransferFxRate(nextRate);
        const destinationAmount = calculateTransferDestinationAmount(transactionAmount, nextRate);
        if (destinationAmount) {
          setTransferAmountIn(destinationAmount);
        }
        return;
      }

      const nextRate = calculateTransferFxRate(transactionAmount, transferAmountIn);
      if (nextRate) {
        setTransferFxRate(nextRate);
      }
    }
  }

  function isTransferCrossCurrency(targetAccountId: string): boolean {
    const target = accounts.find((account) => account.id === targetAccountId);
    if (!target) {
      return false;
    }
    return target.currency.toUpperCase() !== accountCurrency.toUpperCase();
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

    if (composerMode !== 'transfer') {
      return;
    }

    if (!isTransferCrossCurrency(transferToAccountId)) {
      setTransferAmountIn(normalized);
      setTransferFxRate('1');
      return;
    }

    if (transferFxMode === 'auto_destination') {
      const destinationAmount = calculateTransferDestinationAmount(normalized, transferFxRate);
      if (destinationAmount) {
        setTransferAmountIn(destinationAmount);
      }
      return;
    }

    const nextRate = calculateTransferFxRate(normalized, transferAmountIn);
    if (nextRate) {
      setTransferFxRate(nextRate);
    }
  }

  function setTransferTargetValue(value: string) {
    setTransferToAccountId(value);
    setFieldErrors((previous) => ({
      ...previous,
      transferAmountIn: undefined,
      transferFxRate: undefined,
    }));

    if (!value) {
      setTransferAmountIn('');
      setTransferFxRate('1');
      return;
    }

    if (!isTransferCrossCurrency(value)) {
      setTransferAmountIn(transactionAmount);
      setTransferFxRate('1');
      return;
    }

    if (transferFxMode === 'auto_destination') {
      const nextRate = normalizePositiveFxRate(transferFxRate);
      setTransferFxRate(nextRate);
      const destinationAmount = calculateTransferDestinationAmount(transactionAmount, nextRate);
      if (destinationAmount) {
        setTransferAmountIn(destinationAmount);
      }
      return;
    }

    const nextRate = calculateTransferFxRate(transactionAmount, transferAmountIn);
    if (nextRate) {
      setTransferFxRate(nextRate);
    }
  }

  function setTransferAmountInValue(value: string) {
    const normalized = value.replace('-', '');
    setTransferAmountIn(normalized);
    setFieldErrors((previous) => ({ ...previous, transferAmountIn: undefined, transferFxRate: undefined }));

    if (composerMode !== 'transfer') {
      return;
    }
    if (!isTransferCrossCurrency(transferToAccountId)) {
      return;
    }
    if (transferFxMode !== 'auto_rate') {
      return;
    }

    const nextRate = calculateTransferFxRate(transactionAmount, normalized);
    if (nextRate) {
      setTransferFxRate(nextRate);
    }
  }

  function setTransferFxRateValue(value: string) {
    const normalized = value.replace('-', '');
    setTransferFxRate(normalized);
    setFieldErrors((previous) => ({ ...previous, transferFxRate: undefined, transferAmountIn: undefined }));

    if (composerMode !== 'transfer') {
      return;
    }
    if (!isTransferCrossCurrency(transferToAccountId)) {
      setTransferFxRate('1');
      setTransferAmountIn(transactionAmount);
      return;
    }
    if (transferFxMode !== 'auto_destination') {
      return;
    }

    const destinationAmount = calculateTransferDestinationAmount(transactionAmount, normalized);
    if (destinationAmount) {
      setTransferAmountIn(destinationAmount);
    }
  }

  function setTransferFxModeValue(value: 'auto_destination' | 'auto_rate') {
    setTransferFxMode(value);
    setFieldErrors((previous) => ({ ...previous, transferAmountIn: undefined, transferFxRate: undefined }));

    if (composerMode !== 'transfer') {
      return;
    }
    if (!isTransferCrossCurrency(transferToAccountId)) {
      setTransferFxRate('1');
      setTransferAmountIn(transactionAmount);
      return;
    }

    if (value === 'auto_destination') {
      const destinationAmount = calculateTransferDestinationAmount(transactionAmount, transferFxRate);
      if (destinationAmount) {
        setTransferAmountIn(destinationAmount);
      }
      return;
    }

    const nextRate = calculateTransferFxRate(transactionAmount, transferAmountIn);
    if (nextRate) {
      setTransferFxRate(nextRate);
    }
  }

  function setTransactionDateValue(value: string) {
    setTransactionDate(value);
    setFieldErrors((previous) => ({
      ...previous,
      date: undefined,
      recurrenceEndDate: undefined,
    }));
    if (!recurrenceEnabled) {
      return;
    }
    setRecurrenceWeeklyDay(clock.weekDayIsoFromDateInput(value));
    setRecurrenceMonthlyWeekday(clock.weekDayIsoFromDateInput(value));
    if (recurrenceMonthlyPattern === 'day_of_month') {
      setRecurrenceDayOfMonth(clock.dayOfMonthFromDateInput(value));
    }
  }

  function setSchedulingModeValue(value: 'now' | 'scheduled') {
    setSchedulingMode(value);
    setFieldErrors((previous) => ({
      ...previous,
      date: undefined,
      recurrenceInterval: undefined,
      recurrenceEndDate: undefined,
      recurrenceEndCount: undefined,
      expenseSplit: undefined,
    }));
  }

  function setSchedulingKindValue(value: 'one_shot' | 'recurring') {
    setSchedulingKind(value);
    setFieldErrors((previous) => ({
      ...previous,
      recurrenceInterval: undefined,
      recurrenceEndDate: undefined,
      recurrenceEndCount: undefined,
      expenseSplit: undefined,
    }));
  }

  function setRecurrenceFrequencyValue(value: SchedulingFrequency) {
    setRecurrenceFrequency(value);
    setFieldErrors((previous) => ({
      ...previous,
      recurrenceInterval: undefined,
    }));
  }

  function setRecurrenceIntervalValue(value: string) {
    setRecurrenceInterval(value.replace('-', ''));
    setFieldErrors((previous) => ({
      ...previous,
      recurrenceInterval: undefined,
    }));
  }

  function setRecurrenceEndKindValue(value: SchedulingEndInput['kind']) {
    setRecurrenceEndKind(value);
    setFieldErrors((previous) => ({
      ...previous,
      recurrenceEndDate: undefined,
      recurrenceEndCount: undefined,
    }));
  }

  function setRecurrenceEndDateValue(value: string) {
    setRecurrenceEndDate(value);
    setFieldErrors((previous) => ({
      ...previous,
      recurrenceEndDate: undefined,
    }));
  }

  function setRecurrenceEndCountValue(value: string) {
    setRecurrenceEndCount(value.replace('-', ''));
    setFieldErrors((previous) => ({
      ...previous,
      recurrenceEndCount: undefined,
    }));
  }

  function setExpenseDetailedValue(value: boolean) {
    setExpenseDetailed(value);
    if (!value) {
      setFieldErrors((previous) => ({
        ...previous,
        expenseItemName: undefined,
        expenseItemAmount: undefined,
        expenseSplit: undefined,
      }));
    }
  }

  function setExpectedMovementValue(value: boolean) {
    setExpectedMovement(value);
    setFieldErrors((previous) => ({
      ...previous,
      expectedConflict: undefined,
      date: undefined,
      expenseSplit: undefined,
    }));
  }

  function setExpenseItemNameValue(value: string) {
    setExpenseItemName(value);
    setFieldErrors((previous) => ({ ...previous, expenseItemName: undefined }));
  }

  function setExpenseItemAmountValue(value: string) {
    setExpenseItemAmount(value);
    setFieldErrors((previous) => ({ ...previous, expenseItemAmount: undefined }));
  }

  function syncTransactionAmountWithSplitTotal(items: ExpenseItemDraft[], mode: 'raise' | 'set') {
    const total = sumSplitItems(items);
    const normalizedTotal = formatSplitTotal(items);
    if (mode === 'set') {
      setTransactionAmount(normalizedTotal);
      return;
    }

    setTransactionAmount((previous) => {
      const current = parseAmount(previous);
      if (!previous.trim() || current < total) {
        return normalizedTotal;
      }
      return previous;
    });
  }

  function addExpenseItem() {
    const result = upsertSplitItem({
      items: expenseItems,
      editingItemId: editingExpenseItemId,
      nameInput: expenseItemName,
      amountInput: expenseItemAmount,
      nextId: idGenerator.nextId,
    });

    if (result.errors.expenseItemName || result.errors.expenseItemAmount) {
      setFieldErrors((previous) => ({ ...previous, ...result.errors }));
      return;
    }

    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
      expenseSplit: undefined,
    }));
    setExpenseItems(result.items);
    syncTransactionAmountWithSplitTotal(result.items, 'raise');
    setExpenseItemName('');
    setExpenseItemAmount('');
    setEditingExpenseItemId('');
  }

  function editExpenseItem(itemId: string) {
    const item = expenseItems.find((candidate) => candidate.id === itemId);
    if (!item) {
      return;
    }

    setEditingExpenseItemId(item.id);
    setExpenseItemName(item.name);
    setExpenseItemAmount(item.amount);
    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
      expenseSplit: undefined,
    }));
  }

  function removeExpenseItem(itemId: string) {
    setExpenseItems((previous) => {
      const next = previous.filter((item) => item.id !== itemId);
      syncTransactionAmountWithSplitTotal(next, 'set');
      return next;
    });
    if (editingExpenseItemId === itemId) {
      setEditingExpenseItemId('');
      setExpenseItemName('');
      setExpenseItemAmount('');
    }
  }

  function assignRemaining() {
    const nextItem = createRemainingSplitItem({
      itemsLength: expenseItems.length,
      remaining: expenseRemaining,
      nameInput: expenseItemName,
      nextId: idGenerator.nextId,
    });
    if (!nextItem) {
      return;
    }

    setExpenseItems((previous) => [
      ...previous,
      nextItem,
    ]);
    setTransactionAmount((previous) => {
      const current = parseAmount(previous);
      const nextTotal = parseAmount(transactionAmount);
      if (!previous.trim() || current < nextTotal) {
        return formatAmount(nextTotal);
      }
      return previous;
    });
    setExpenseItemName('');
    setExpenseItemAmount('');
    setFieldErrors((previous) => ({ ...previous, expenseSplit: undefined }));
  }

  async function resolveCategorySelection(type: TaxonomyCategoryAppliesTo): Promise<string | undefined> {
    const rawInput = transactionCategoryInput.trim();
    if (!rawInput) {
      return undefined;
    }

    const normalizedInput = normalizeTaxonomyName(rawInput);
    const existing = findActiveCategoryByName(categories, type, normalizedInput);
    if (existing) {
      return existing.id;
    }

    const fresh = await categorySuggestions.listCategories({ appliesTo: type, includeArchived: false });
    setCategories((previous) => mergeCategories(previous, fresh.items));

    const existingFromBackend = findActiveCategoryByName(fresh.items, type, normalizedInput);
    if (existingFromBackend) {
      return existingFromBackend.id;
    }

    try {
      const created = await categorySuggestions.createCategory({
        name: rawInput,
        appliesTo: type,
      });

      setCategories((previous) => mergeCategories(previous, [
        ...fresh.items,
        {
          id: created.id,
          name: rawInput,
          appliesTo: type,
          status: 'active',
        } as TaxonomyCategoryItem,
      ]));

      setTransactionCategoryInput(rawInput);
      return created.id;
    } catch (err) {
      const retry = await categorySuggestions.listCategories({ appliesTo: type, includeArchived: false });
      setCategories((previous) => mergeCategories(previous, retry.items));
      const existingAfterRace = findActiveCategoryByName(retry.items, type, normalizedInput);
      if (existingAfterRace) {
        return existingAfterRace.id;
      }
      throw err;
    }
  }

  function parseTransactionTags(): string[] {
    const uniqueByNormalizedName = new Map<string, string>();
    for (const rawTag of transactionTagInput.split(',')) {
      const tag = rawTag.trim();
      if (!tag) {
        continue;
      }
      const normalized = tag.toLowerCase();
      if (!uniqueByNormalizedName.has(normalized)) {
        uniqueByNormalizedName.set(normalized, tag);
      }
    }
    return [...uniqueByNormalizedName.values()];
  }

  function resolveTagSelectionIds(tagNames: string[]): string[] {
    if (tagNames.length === 0) {
      return [];
    }
    const knownByNormalizedName = new Map<string, string>();
    for (const tag of tags) {
      if (tag.status !== 'active') {
        continue;
      }
      knownByNormalizedName.set(tag.name.trim().toLowerCase(), tag.id);
    }
    return [...new Set(
      tagNames
        .map((name) => knownByNormalizedName.get(name.trim().toLowerCase()))
        .filter((value): value is string => Boolean(value)),
    )];
  }

  async function categorizeTransaction(
    transactionId: string,
    transactionType: TaxonomyCategoryAppliesTo,
    categoryId?: string,
  ) {
    if (!categoryId) {
      return;
    }
    const result = await transactionClassification.categorizeTransaction({
      transactionId,
      transactionType,
      categoryId,
    });
    if (result.status === 'failed') {
      throw new Error(result.errorCode ?? result.errorMessage ?? 'Categorization failed');
    }
  }

  async function applyTransactionTags(transactionId: string, tagNames: string[]) {
    if (tagNames.length === 0) {
      return;
    }
    const result = await transactionClassification.applyTransactionTags({
      transactionId,
      tagNames,
    });
    if (result.status === 'failed') {
      throw new Error(result.errorCode ?? result.errorMessage ?? 'Tag assignment failed');
    }
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
      transactionDate,
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
      date: transactionDate,
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
      editSplitItem: editExpenseItem,
      removeSplitItem: removeExpenseItem,
      assignSplitRemaining: assignRemaining,
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
