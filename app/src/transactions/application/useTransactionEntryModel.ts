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
import type { LedgerGatewayPort } from '../../ledger/infrastructure/ledgerGateway';
import type { SchedulingGatewayPort } from '../../scheduling/infrastructure/schedulingGateway';
import type { ExpectedGatewayPort } from '../../expected/infrastructure/expectedGateway';
import { useCategorySuggestions } from '../../taxonomy/application/useCategorySuggestions';
import { useTagSuggestions } from '../../taxonomy/application/useTagSuggestions';
import { useTransactionClassification } from '../../taxonomy/application/useTransactionClassification';
import type { TaxonomyCategoryAppliesTo } from '../../taxonomy/domain/taxonomy.types';
import type { TaxonomyGatewayPort } from '../../taxonomy/infrastructure/taxonomyGateway';
import type { ExpenseItemDraft, TransactionFieldErrors } from '../domain/transactions.types';
import type { TransactionEntryViewProvided, TransactionEntryViewRequired } from '../ui/TransactionEntryView';
import type { TransactionEntryPrefillRequest } from './TransactionEntryComponent.contract';
import {
  buildSchedulingParts,
  buildTransferAmountParts,
} from './transactionComposerPayloads';
import {
  hasTransactionComposerValidationErrors,
  validateTransactionComposerSubmission,
} from './transactionComposerValidation';

export type TransactionEntryModelPorts = {
  ledger: LedgerGatewayPort;
  scheduling: SchedulingGatewayPort;
  expected: ExpectedGatewayPort;
  taxonomy: TaxonomyGatewayPort;
};

type UseTransactionEntryModelInput = {
  ports: TransactionEntryModelPorts;
  accountId: string | null;
  enabled: boolean;
  prefillRequest?: TransactionEntryPrefillRequest;
  onRecorded?: () => void;
  onError?: (error: { message: string }) => void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function formatFxRate(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  const normalized = value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  return normalized || '0';
}

function resolveOccurredAt(dateInput: string): string {
  const raw = dateInput.trim();
  if (!raw) {
    return new Date().toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map((value) => Number(value));
    const now = new Date();
    const localDateTime = new Date(
      year,
      month - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    );
    return localDateTime.toISOString();
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}

function dayOfMonthFromDateInput(dateInput: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return String(Number(dateInput.slice(8, 10)));
  }
  const parsed = new Date(dateInput);
  if (!Number.isNaN(parsed.getTime())) {
    return String(parsed.getUTCDate());
  }
  return String(new Date().getUTCDate());
}

function weekDayIsoFromDateInput(dateInput: string): string {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
    ? new Date(`${dateInput}T12:00:00`)
    : new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) {
    return '1';
  }
  const day = parsed.getDay();
  return String(day === 0 ? 7 : day);
}

function resolveTimeZoneId(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

function cloneExpenseItems(items: Array<{ id: string; name: string; amount: string }>): ExpenseItemDraft[] {
  return items.map((item) => ({
    id: crypto.randomUUID(),
    name: item.name,
    amount: item.amount,
  }));
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
  const { ports, accountId, enabled, prefillRequest, onRecorded, onError } = input;

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
  const [transactionDate, setTransactionDate] = useState(todayIso());
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
  const [recurrenceWeeklyDay, setRecurrenceWeeklyDay] = useState(weekDayIsoFromDateInput(todayIso()));
  const [recurrenceMonthlyPattern, setRecurrenceMonthlyPattern] = useState<SchedulingMonthlyPattern>('day_of_month');
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState(dayOfMonthFromDateInput(todayIso()));
  const [recurrenceMonthlyOrdinal, setRecurrenceMonthlyOrdinal] = useState('1');
  const [recurrenceMonthlyWeekday, setRecurrenceMonthlyWeekday] = useState(weekDayIsoFromDateInput(todayIso()));
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

  const expenseAssigned = useMemo(
    () => expenseItems.reduce((acc, item) => acc + parseAmount(item.amount), 0),
    [expenseItems],
  );

  const expenseRemaining = useMemo(() => {
    const total = parseAmount(transactionAmount);
    return (Math.round((total - expenseAssigned) * 100) / 100).toFixed(2);
  }, [transactionAmount, expenseAssigned]);
  const recurrenceEnabled = schedulingMode === 'scheduled' && schedulingKind === 'recurring';

  function reportError(raw: unknown) {
    const message = toErrorMessage(raw);
    setError(message);
    onError?.({ message });
  }

  function resetComposerState() {
    const today = todayIso();
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
    setRecurrenceWeeklyDay(weekDayIsoFromDateInput(today));
    setRecurrenceMonthlyPattern('day_of_month');
    setRecurrenceDayOfMonth(dayOfMonthFromDateInput(today));
    setRecurrenceMonthlyOrdinal('1');
    setRecurrenceMonthlyWeekday(weekDayIsoFromDateInput(today));
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
    setExpenseItems(cloneExpenseItems(prefillRequest.splitItems ?? []));
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
      const sourceAmount = parseAmount(transactionAmount);
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
        const rate = parseAmount(transferFxRate) > 0 ? parseAmount(transferFxRate) : 1;
        setTransferFxRate(formatFxRate(rate));
        if (sourceAmount > 0) {
          setTransferAmountIn(formatAmount(sourceAmount * rate));
        }
        return;
      }

      const destination = parseAmount(transferAmountIn);
      if (sourceAmount > 0 && destination > 0) {
        setTransferFxRate(formatFxRate(destination / sourceAmount));
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

    const sourceAmount = parseAmount(normalized);
    if (!isTransferCrossCurrency(transferToAccountId)) {
      setTransferAmountIn(normalized);
      setTransferFxRate('1');
      return;
    }

    if (transferFxMode === 'auto_destination') {
      const rate = parseAmount(transferFxRate);
      if (sourceAmount > 0 && rate > 0) {
        setTransferAmountIn(formatAmount(sourceAmount * rate));
      }
      return;
    }

    const destination = parseAmount(transferAmountIn);
    if (sourceAmount > 0 && destination > 0) {
      setTransferFxRate(formatFxRate(destination / sourceAmount));
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

    const sourceAmount = parseAmount(transactionAmount);
    if (!isTransferCrossCurrency(value)) {
      setTransferAmountIn(transactionAmount);
      setTransferFxRate('1');
      return;
    }

    if (transferFxMode === 'auto_destination') {
      const rate = parseAmount(transferFxRate) > 0 ? parseAmount(transferFxRate) : 1;
      setTransferFxRate(formatFxRate(rate));
      if (sourceAmount > 0) {
        setTransferAmountIn(formatAmount(sourceAmount * rate));
      }
      return;
    }

    const destination = parseAmount(transferAmountIn);
    if (sourceAmount > 0 && destination > 0) {
      setTransferFxRate(formatFxRate(destination / sourceAmount));
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

    const sourceAmount = parseAmount(transactionAmount);
    const destination = parseAmount(normalized);
    if (sourceAmount > 0 && destination > 0) {
      setTransferFxRate(formatFxRate(destination / sourceAmount));
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

    const sourceAmount = parseAmount(transactionAmount);
    const rate = parseAmount(normalized);
    if (sourceAmount > 0 && rate > 0) {
      setTransferAmountIn(formatAmount(sourceAmount * rate));
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

    const sourceAmount = parseAmount(transactionAmount);
    if (value === 'auto_destination') {
      const rate = parseAmount(transferFxRate);
      if (sourceAmount > 0 && rate > 0) {
        setTransferAmountIn(formatAmount(sourceAmount * rate));
      }
      return;
    }

    const destination = parseAmount(transferAmountIn);
    if (sourceAmount > 0 && destination > 0) {
      setTransferFxRate(formatFxRate(destination / sourceAmount));
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
    setRecurrenceWeeklyDay(weekDayIsoFromDateInput(value));
    setRecurrenceMonthlyWeekday(weekDayIsoFromDateInput(value));
    if (recurrenceMonthlyPattern === 'day_of_month') {
      setRecurrenceDayOfMonth(dayOfMonthFromDateInput(value));
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
    const total = items.reduce((acc, item) => acc + parseAmount(item.amount), 0);
    const normalizedTotal = formatAmount(total);
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
    const name = expenseItemName.trim();
    const amount = parseAmount(expenseItemAmount);

    const nextErrors: TransactionFieldErrors = {};
    if (!name) {
      nextErrors.expenseItemName = 'Item name is required.';
    }
    if (amount <= 0) {
      nextErrors.expenseItemAmount = 'Item amount must be greater than 0.';
    }

    if (nextErrors.expenseItemName || nextErrors.expenseItemAmount) {
      setFieldErrors((previous) => ({ ...previous, ...nextErrors }));
      return;
    }

    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
      expenseSplit: undefined,
    }));
    setExpenseItems((previous) => {
      const nextItem = {
        id: editingExpenseItemId || crypto.randomUUID(),
        name,
        amount: amount.toFixed(2),
      };
      const next = editingExpenseItemId
        ? previous.map((item) => (item.id === editingExpenseItemId ? nextItem : item))
        : [...previous, nextItem];
      syncTransactionAmountWithSplitTotal(next, 'raise');
      return next;
    });
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
    const remaining = parseAmount(expenseRemaining);
    if (remaining <= 0) {
      return;
    }

    const fallbackName = `Item ${expenseItems.length + 1}`;
    setExpenseItems((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        name: expenseItemName.trim() || fallbackName,
        amount: remaining.toFixed(2),
      },
    ]);
    setTransactionAmount((previous) => {
      const current = parseAmount(previous);
      const nextTotal = parseAmount(transactionAmount) - remaining + remaining;
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
      todayIso: todayIso(),
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
      const occurredAt = resolveOccurredAt(resolvedTransactionDate);
      const tagNames = parseTransactionTags();
      const tagIds = resolveTagSelectionIds(tagNames);
      let recorded = false;
      let postedTransactionId = '';
      const buildCurrentSchedulingParts = (enabled = recurrenceEnabled) => buildSchedulingParts({
        recurrenceEnabled: enabled,
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
        transactionDate,
      });

      if (editedScheduledMovementId) {
        const scheduleKind = schedulingKind;
        const { rule: scheduleRule, recurrenceEnd: scheduleEnd } = buildCurrentSchedulingParts();

        if (composerMode === 'transfer') {
          const transferTargetAccount = accounts.find((candidate) => candidate.id === transferToAccountId);
          if (!transferTargetAccount) {
            throw new Error('Destination account not found');
          }
          const transferAmountParts = buildTransferAmountParts({
            sourceAmount: amount,
            sourceCurrency: accountCurrency,
            targetCurrency: transferTargetAccount.currency,
            transferAmountIn,
            transferFxRate,
            transferFxMode,
          });

          await ports.scheduling.schedulingUpdateMovement({
            recurringMovementId: editedScheduledMovementId,
            type: 'transfer',
            sourceAccountId: accountId,
            targetAccountId: transferToAccountId,
            amount: transferAmountParts.amount,
            currency: transferAmountParts.currency,
            destinationAmount: transferAmountParts.destinationAmount,
            destinationCurrency: transferAmountParts.destinationCurrency,
            exchangeRate: transferAmountParts.exchangeRate,
            description: transactionNote.trim() || undefined,
            merchant: undefined,
            categoryId: undefined,
            tagIds,
            tagNames,
            rule: scheduleRule,
            recurrenceEnd: scheduleEnd,
            startAt: occurredAt,
            zoneId: resolveTimeZoneId(),
            scheduleKind,
          });
        }

        if (composerMode === 'income') {
          const categoryId = await resolveCategorySelection('income');
          await ports.scheduling.schedulingUpdateMovement({
            recurringMovementId: editedScheduledMovementId,
            type: 'income',
            sourceAccountId: accountId,
            amount: formatAmount(parseAmount(amount)),
            currency: accountCurrency,
            description: transactionNote.trim() || undefined,
            merchant: transactionNote.trim() || undefined,
            categoryId,
            splitItems: expenseItems,
            tagIds,
            tagNames,
            rule: scheduleRule,
            recurrenceEnd: scheduleEnd,
            startAt: occurredAt,
            zoneId: resolveTimeZoneId(),
            scheduleKind,
          });
        }

        if (composerMode === 'expense') {
          const categoryId = await resolveCategorySelection('expense');
          await ports.scheduling.schedulingUpdateMovement({
            recurringMovementId: editedScheduledMovementId,
            type: 'expense',
            sourceAccountId: accountId,
            amount: formatAmount(parseAmount(amount)),
            currency: accountCurrency,
            description: transactionNote.trim() || undefined,
            merchant: transactionNote.trim() || undefined,
            categoryId,
            splitItems: expenseItems,
            tagIds,
            tagNames,
            rule: scheduleRule,
            recurrenceEnd: scheduleEnd,
            startAt: occurredAt,
            zoneId: resolveTimeZoneId(),
            scheduleKind,
          });
        }
        recorded = true;
      }

      if (movementExpected && (composerMode === 'expense' || composerMode === 'income')) {
        const categoryId = await resolveCategorySelection(composerMode);
        const expectedPayload = {
          accountId,
          type: composerMode,
          amount: formatAmount(parseAmount(amount)),
          currency: accountCurrency,
          expectedAt: occurredAt,
          description: transactionNote.trim() || undefined,
          merchant: transactionNote.trim() || undefined,
          categoryId,
          splitItems: expenseItems,
        };
        if (editedExpectedMovementId) {
          await ports.expected.expectedUpdateMovement({
            expectedMovementId: editedExpectedMovementId,
            ...expectedPayload,
          });
        } else {
          await ports.expected.expectedCreateMovement(expectedPayload);
        }
        recorded = true;
      }

      if (!editedScheduledMovementId && (composerMode === 'expense' || composerMode === 'income') && recurrenceEnabled) {
        const categoryId = await resolveCategorySelection(composerMode);
        const { rule: scheduleRule, recurrenceEnd: scheduleEnd } = buildCurrentSchedulingParts(true);

        await ports.scheduling.schedulingCreateMovement({
          type: composerMode,
          sourceAccountId: accountId,
          amount: formatAmount(parseAmount(amount)),
          currency: accountCurrency,
          description: transactionNote.trim() || undefined,
          merchant: transactionNote.trim() || undefined,
          categoryId,
          splitItems: expenseItems,
          tagIds,
          tagNames,
          rule: scheduleRule,
          recurrenceEnd: scheduleEnd,
          startAt: occurredAt,
          zoneId: resolveTimeZoneId(),
          scheduleKind: 'recurring',
        });
        recorded = true;
      }

      if (!recorded && (composerMode === 'expense' || composerMode === 'income') && movementScheduled) {
        const categoryId = await resolveCategorySelection(composerMode);
        const { rule: scheduleRule, recurrenceEnd: scheduleEnd } = buildCurrentSchedulingParts(false);
        await ports.scheduling.schedulingCreateMovement({
          type: composerMode,
          sourceAccountId: accountId,
          amount: formatAmount(parseAmount(amount)),
          currency: accountCurrency,
          description: transactionNote.trim() || undefined,
          merchant: transactionNote.trim() || undefined,
          categoryId,
          tagIds,
          tagNames,
          rule: scheduleRule,
          recurrenceEnd: scheduleEnd,
          startAt: occurredAt,
          zoneId: resolveTimeZoneId(),
          scheduleKind: 'one_shot',
        });
        recorded = true;
      }

      if (!recorded && composerMode !== 'expense' && schedulingMode === 'scheduled') {
        const categoryId = composerMode === 'income'
          ? await resolveCategorySelection('income')
          : undefined;
        const { rule: scheduleRule, recurrenceEnd: scheduleEnd } = buildCurrentSchedulingParts();

        if (composerMode === 'transfer') {
          const transferTargetAccount = accounts.find((candidate) => candidate.id === transferToAccountId);
          if (!transferTargetAccount) {
            throw new Error('Destination account not found');
          }
          const transferAmountParts = buildTransferAmountParts({
            sourceAmount: amount,
            sourceCurrency: accountCurrency,
            targetCurrency: transferTargetAccount.currency,
            transferAmountIn,
            transferFxRate,
            transferFxMode,
          });

          await ports.scheduling.schedulingCreateMovement({
            type: 'transfer',
            sourceAccountId: accountId,
            targetAccountId: transferToAccountId,
            amount: transferAmountParts.amount,
            currency: transferAmountParts.currency,
            destinationAmount: transferAmountParts.destinationAmount,
            destinationCurrency: transferAmountParts.destinationCurrency,
            exchangeRate: transferAmountParts.exchangeRate,
            description: transactionNote.trim() || undefined,
            merchant: undefined,
            categoryId: undefined,
            tagIds,
            tagNames,
            rule: scheduleRule,
            recurrenceEnd: scheduleEnd,
            startAt: occurredAt,
            zoneId: resolveTimeZoneId(),
            scheduleKind: schedulingKind,
          });
        }

        if (composerMode === 'income') {
          await ports.scheduling.schedulingCreateMovement({
            type: 'income',
            sourceAccountId: accountId,
            amount: formatAmount(parseAmount(amount)),
            currency: accountCurrency,
            description: transactionNote.trim() || undefined,
            merchant: transactionNote.trim() || undefined,
            categoryId,
            splitItems: expenseItems,
            tagIds,
            tagNames,
            rule: scheduleRule,
            recurrenceEnd: scheduleEnd,
            startAt: occurredAt,
            zoneId: resolveTimeZoneId(),
            scheduleKind: schedulingKind,
          });
        }
        recorded = true;
      }

      if (!recorded && composerMode === 'expense') {
        const categoryId = await resolveCategorySelection('expense');
        if (!expenseDetailed) {
          const result = await ledgerTransactionCommands.recordExpense({
            accountId,
            occurredAt,
            amount,
            currency: accountCurrency,
            description: transactionNote.trim() || undefined,
            merchant: transactionNote.trim() || undefined,
            categoryId,
          });
          postedTransactionId = result.id;
          await categorizeTransaction(result.id, 'expense', categoryId);
          await applyTransactionTags(result.id, tagNames);
          recorded = true;
        } else {
          const draft = await ledgerTransactionCommands.createExpenseDraft({
            accountId,
            occurredAt,
            amount,
            currency: accountCurrency,
            description: transactionNote.trim() || undefined,
            merchant: transactionNote.trim() || undefined,
          });

          for (const item of expenseItems) {
            await ledgerTransactionCommands.addTransactionItem({
              transactionId: draft.id,
              name: item.name,
              amount: item.amount,
              currency: accountCurrency,
            });
          }

          await ledgerTransactionCommands.postDraftTransaction({ transactionId: draft.id });
          postedTransactionId = draft.id;
          await categorizeTransaction(draft.id, 'expense', categoryId);
          await applyTransactionTags(draft.id, tagNames);
          recorded = true;
        }
      }

      if (!recorded && composerMode === 'income') {
        const categoryId = await resolveCategorySelection('income');
        if (!expenseDetailed) {
          const result = await ledgerTransactionCommands.recordIncome({
            accountId,
            occurredAt,
            amount,
            currency: accountCurrency,
            description: transactionNote.trim() || undefined,
            merchant: transactionNote.trim() || undefined,
            categoryId,
          });
          postedTransactionId = result.id;
          await categorizeTransaction(result.id, 'income', categoryId);
          await applyTransactionTags(result.id, tagNames);
          recorded = true;
        } else {
          const draft = await ledgerTransactionCommands.createExpenseDraft({
            accountId,
            occurredAt,
            amount,
            currency: accountCurrency,
            type: 'income',
            description: transactionNote.trim() || undefined,
            merchant: transactionNote.trim() || undefined,
          });

          for (const item of expenseItems) {
            await ledgerTransactionCommands.addTransactionItem({
              transactionId: draft.id,
              name: item.name,
              amount: item.amount,
              currency: accountCurrency,
            });
          }

          await ledgerTransactionCommands.postDraftTransaction({ transactionId: draft.id });
          postedTransactionId = draft.id;
          await categorizeTransaction(draft.id, 'income', categoryId);
          await applyTransactionTags(draft.id, tagNames);
          recorded = true;
        }
      }

      if (!recorded && schedulingMode === 'now' && composerMode === 'transfer') {
        const transferTargetAccount = accounts.find((candidate) => candidate.id === transferToAccountId);
        if (!transferTargetAccount) {
          throw new Error('Destination account not found');
        }

        const transferAmountParts = buildTransferAmountParts({
          sourceAmount: amount,
          sourceCurrency: accountCurrency,
          targetCurrency: transferTargetAccount.currency,
          transferAmountIn,
          transferFxRate,
          transferFxMode,
        });

        let result: { transferOutId: string; transferInId: string };

        if (!transferAmountParts.destinationAmount || !transferAmountParts.destinationCurrency) {
          result = await ledgerTransactionCommands.recordTransfer({
            fromAccountId: accountId,
            toAccountId: transferToAccountId,
            occurredAt,
            amount: transferAmountParts.amount,
            currency: transferAmountParts.currency,
            description: transactionNote.trim() || undefined,
          });
        } else {
          result = await ledgerTransactionCommands.recordTransferFx({
            fromAccountId: accountId,
            toAccountId: transferToAccountId,
            occurredAt,
            sourceAmount: transferAmountParts.amount,
            sourceCurrency: transferAmountParts.currency,
            destinationAmount: transferAmountParts.destinationAmount,
            destinationCurrency: transferAmountParts.destinationCurrency,
            exchangeRate: transferAmountParts.exchangeRate,
            description: transactionNote.trim() || undefined,
          });
        }

        await applyTransactionTags(result.transferOutId, tagNames);
        await applyTransactionTags(result.transferInId, tagNames);
        recorded = true;
      }

      if (recorded) {
        if (editedExpectedMovementId && postedTransactionId) {
          await ports.expected.expectedResolveMovement({
            expectedMovementId: editedExpectedMovementId,
            transactionId: postedTransactionId,
            resolvedAt: new Date().toISOString(),
          });
        } else if (postExpectedMovementId && postedTransactionId) {
          await ports.expected.expectedResolveMovement({
            expectedMovementId: postExpectedMovementId,
            transactionId: postedTransactionId,
            resolvedAt: new Date().toISOString(),
          });
        }
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
