import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  LedgerAccountItem,
  TaxonomyCategoryItem,
  TaxonomyTagItem,
  TransactionVoiceDraft,
  TransactionVoiceType,
} from '../../shared/domain/corePort';
import { useLedgerAccounts } from '../../ledger/application/useLedgerAccounts';
import { useLedgerTransactionCommands } from '../../ledger/application/useLedgerTransactionCommands';
import { createLedgerGateway } from '../../ledger/infrastructure/ledgerGateway';
import { useCategorySuggestions } from '../../taxonomy/application/useCategorySuggestions';
import { useTagSuggestions } from '../../taxonomy/application/useTagSuggestions';
import { useTransactionClassification } from '../../taxonomy/application/useTransactionClassification';
import type { TaxonomyCategoryAppliesTo } from '../../taxonomy/domain/taxonomy.types';
import { createTaxonomyGateway } from '../../taxonomy/infrastructure/taxonomyGateway';
import type { ExpenseItemDraft, TransactionFieldErrors } from '../domain/transactions.types';
import type { TransactionEntryViewProvided, TransactionEntryViewRequired } from '../ui/TransactionEntryView';
import { createTransactionsVoiceGateway } from '../infrastructure/transactionsVoiceGateway';
import type { TransactionsCorePort } from './transactionsCore.port';

type UseTransactionEntryModelInput = {
  core: TransactionsCorePort;
  accountId: string | null;
  enabled: boolean;
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

function toDateInputValue(occurredAt?: string): string {
  if (!occurredAt) {
    return todayIso();
  }
  const parsed = new Date(occurredAt);
  if (Number.isNaN(parsed.getTime())) {
    return todayIso();
  }
  return parsed.toISOString().slice(0, 10);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function useTransactionEntryModel(input: UseTransactionEntryModelInput) {
  const { core, accountId, enabled, onRecorded, onError } = input;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postingTransaction, setPostingTransaction] = useState(false);
  const [voicePhase, setVoicePhase] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [voiceMode, setVoiceMode] = useState<'expense' | 'income' | 'transfer' | null>(null);
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [voiceAnalysisId, setVoiceAnalysisId] = useState<string | null>(null);

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

  const [categories, setCategories] = useState<TaxonomyCategoryItem[]>([]);
  const [tags, setTags] = useState<TaxonomyTagItem[]>([]);

  const [expenseDetailed, setExpenseDetailed] = useState(false);
  const [expenseItemName, setExpenseItemName] = useState('');
  const [expenseItemAmount, setExpenseItemAmount] = useState('');
  const [expenseItems, setExpenseItems] = useState<ExpenseItemDraft[]>([]);
  const [fieldErrors, setFieldErrors] = useState<TransactionFieldErrors>({});

  const ledgerGateway = useMemo(() => createLedgerGateway(core), [core]);
  const taxonomyGateway = useMemo(() => createTaxonomyGateway(core), [core]);
  const transactionsVoiceGateway = useMemo(() => createTransactionsVoiceGateway(core), [core]);

  const ledgerAccounts = useLedgerAccounts(ledgerGateway);
  const ledgerTransactionCommands = useLedgerTransactionCommands(ledgerGateway);
  const categorySuggestions = useCategorySuggestions(taxonomyGateway);
  const tagSuggestions = useTagSuggestions(taxonomyGateway);
  const transactionClassification = useTransactionClassification(taxonomyGateway);

  const transferTargetOptions = useMemo(
    () => accounts.filter((account) => account.id !== accountId),
    [accounts, accountId],
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

  function reportError(raw: unknown) {
    const message = toErrorMessage(raw);
    setError(message);
    onError?.({ message });
  }

  function resetComposerState() {
    setComposerMode('picker');
    setComposerAdvancedOpen(false);
    setTransactionAmount('');
    setTransactionDate(todayIso());
    setTransactionNote('');
    setTransactionCategoryInput('');
    setTransactionTagInput('');
    setExpenseDetailed(false);
    setExpenseItemName('');
    setExpenseItemAmount('');
    setExpenseItems([]);
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
      setVoicePhase('idle');
      setVoiceMode(null);
      setVoiceSessionId(null);
      setVoiceAnalysisId(null);
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

  function openTransactionComposer() {
    if (!accountId) {
      setError('Select an account first.');
      return;
    }

    setError('');
    setComposerOpen(true);
    setVoicePhase('idle');
    setVoiceMode(null);
    setVoiceSessionId(null);
    setVoiceAnalysisId(null);
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
    const sessionIdToClose = voiceSessionId;
    void finalizeVoiceCapture({
      outcome: 'cancelled',
      mode: composerMode === 'picker' ? undefined : composerMode,
    });
    setVoicePhase('idle');
    setVoiceMode(null);
    setVoiceSessionId(null);
    setComposerOpen(false);
    resetComposerState();
    if (sessionIdToClose) {
      void transactionsVoiceGateway.transactionVoiceStop({ sessionId: sessionIdToClose }).catch(() => undefined);
    }
  }

  function startVoiceCapture(mode: Exclude<typeof composerMode, 'picker'>) {
    if (!accountId) {
      setError('Select an account first.');
      return;
    }

    if (voicePhase !== 'idle') {
      return;
    }

    const sessionIdToClose = voiceSessionId;
    setError('');
    setVoiceMode(mode);
    setVoiceSessionId(null);
    setVoicePhase('recording');

    void (async () => {
      try {
        if (sessionIdToClose) {
          await transactionsVoiceGateway.transactionVoiceStop({ sessionId: sessionIdToClose });
        }
      } catch {
        // Ignore orphan session cleanup failures.
      }

      try {
        const started = await transactionsVoiceGateway.transactionVoiceStart({
          accountId,
          expectedType: mode as TransactionVoiceType,
        });
        setVoiceSessionId(started.sessionId);
      } catch (err) {
        reportError(err);
        setVoiceMode(null);
        setVoicePhase('idle');
        setVoiceSessionId(null);
      }
    })();
  }

  function cancelVoiceCapture() {
    if (voicePhase !== 'recording') {
      return;
    }
    const sessionIdToClose = voiceSessionId;
    setVoiceMode(null);
    setVoicePhase('idle');
    setVoiceSessionId(null);
    if (sessionIdToClose) {
      void transactionsVoiceGateway.transactionVoiceStop({ sessionId: sessionIdToClose }).catch(() => undefined);
    }
  }

  function applyVoiceDraft(draft: TransactionVoiceDraft) {
    setComposerMode(draft.type);
    setComposerAdvancedOpen(true);
    setTransactionAmount((draft.amount ?? '').replace('-', ''));
    setTransactionDate(toDateInputValue(draft.occurredAt));
    setTransactionNote(draft.note ?? '');
    setTransactionCategoryInput(draft.categoryName ?? '');
    setTransactionTagInput((draft.tagNames ?? []).join(', '));
    if (draft.type === 'transfer') {
      setTransferToAccountId(draft.transferToAccountId ?? '');
      return;
    }
    setTransferToAccountId('');
  }

  async function confirmVoiceCapture() {
    if (!accountId || !voiceMode || voicePhase !== 'recording' || !voiceSessionId) {
      return;
    }

    await finalizeVoiceCapture({
      outcome: 'cancelled',
      mode: composerMode === 'picker' ? undefined : composerMode,
    });

    setError('');
    setVoicePhase('processing');
    const processingStartedAt = Date.now();

    try {
      await transactionsVoiceGateway.transactionVoiceStop({ sessionId: voiceSessionId });
      const result = await transactionsVoiceGateway.transactionVoiceExtractDraft({ sessionId: voiceSessionId });
      const elapsedMs = Date.now() - processingStartedAt;
      if (elapsedMs < 350) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 350 - elapsedMs);
        });
      }

      setVoiceAnalysisId(result.analysisId);
      resetComposerState();
      applyVoiceDraft(result.draft);
      await refreshTaxonomyLookups();
    } catch (err) {
      reportError(err);
      setComposerMode('picker');
    } finally {
      setVoiceSessionId(null);
      setVoiceMode(null);
      setVoicePhase('idle');
    }
  }

  function selectComposerMode(mode: Exclude<typeof composerMode, 'picker'>) {
    setVoicePhase('idle');
    setVoiceMode(null);
    setVoiceSessionId(null);
    setComposerMode(mode);
    setComposerAdvancedOpen(false);
    setTransactionCategoryInput('');
    setTransactionTagInput('');
  }

  function setTransactionAmountValue(value: string) {
    setTransactionAmount(value.replace('-', ''));
    setFieldErrors((previous) => ({ ...previous, amount: undefined, expenseSplit: undefined }));
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

  function setExpenseItemNameValue(value: string) {
    setExpenseItemName(value);
    setFieldErrors((previous) => ({ ...previous, expenseItemName: undefined }));
  }

  function setExpenseItemAmountValue(value: string) {
    setExpenseItemAmount(value);
    setFieldErrors((previous) => ({ ...previous, expenseItemAmount: undefined }));
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
    setExpenseItems((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        name,
        amount: amount.toFixed(2),
      },
    ]);
    setExpenseItemName('');
    setExpenseItemAmount('');
  }

  function removeExpenseItem(itemId: string) {
    setExpenseItems((previous) => previous.filter((item) => item.id !== itemId));
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
    setExpenseItemName('');
    setExpenseItemAmount('');
    setFieldErrors((previous) => ({ ...previous, expenseSplit: undefined }));
  }

  async function resolveCategorySelection(type: TaxonomyCategoryAppliesTo): Promise<string | undefined> {
    const rawInput = transactionCategoryInput.trim();
    if (!rawInput) {
      return undefined;
    }

    const existing = categories.find(
      (category) =>
        category.status === 'active'
        && category.appliesTo === type
        && category.name.trim().toLowerCase() === rawInput.toLowerCase(),
    );
    if (existing) {
      return existing.id;
    }

    const created = await categorySuggestions.createCategory({
      name: rawInput,
      appliesTo: type,
    });

    setCategories((previous) => {
      const next = [
        ...previous,
        {
          id: created.id,
          name: rawInput,
          appliesTo: type,
          status: 'active',
        } as TaxonomyCategoryItem,
      ];
      next.sort((left, right) => left.name.localeCompare(right.name));
      return next;
    });

    setTransactionCategoryInput(rawInput);
    return created.id;
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

  function buildCurrentVoiceDraft(mode: Exclude<typeof composerMode, 'picker'>): TransactionVoiceDraft {
    const trimmedAmount = transactionAmount.trim();
    const trimmedNote = transactionNote.trim();
    const tagNames = parseTransactionTags();
    return {
      type: mode,
      amount: trimmedAmount || undefined,
      currency: accountCurrency,
      occurredAt: resolveOccurredAt(transactionDate),
      note: trimmedNote || undefined,
      transferToAccountId: mode === 'transfer' ? transferToAccountId || undefined : undefined,
      categoryName: mode === 'transfer' ? undefined : transactionCategoryInput.trim() || undefined,
      tagNames: tagNames.length > 0 ? tagNames : undefined,
    };
  }

  async function finalizeVoiceCapture(input: {
    outcome: 'saved' | 'cancelled' | 'failed';
    mode?: Exclude<typeof composerMode, 'picker'>;
    transactionIds?: string[];
    errorMessage?: string;
  }) {
    if (!voiceAnalysisId) {
      return;
    }

    const analysisIdToFinalize = voiceAnalysisId;
    setVoiceAnalysisId(null);

    try {
      await transactionsVoiceGateway.transactionVoiceFinalize({
        analysisId: analysisIdToFinalize,
        outcome: input.outcome,
        transactionIds: input.transactionIds,
        finalDraft: input.mode ? buildCurrentVoiceDraft(input.mode) : undefined,
        errorMessage: input.errorMessage,
      });
    } catch {
      // Audit persistence must never block the transaction flow.
    }
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

    const amount = transactionAmount.trim();
    const nextErrors: TransactionFieldErrors = {};
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      nextErrors.amount = 'Enter a valid amount greater than 0.';
    }

    if (!transactionDate) {
      nextErrors.date = 'Date is required.';
    }

    if (composerMode === 'transfer' && !transferToAccountId) {
      setError('Select a destination account for transfer.');
      return;
    }

    if (composerMode === 'transfer' && transferToAccountId === accountId) {
      setError('Source and destination accounts must be different.');
      return;
    }

    if (composerMode === 'expense' && expenseDetailed) {
      if (expenseItems.length === 0) {
        nextErrors.expenseSplit = 'Add at least one item before publishing.';
      }
      if (parseAmount(expenseRemaining) !== 0) {
        nextErrors.expenseSplit = 'Items must match the total amount before publishing.';
      }
    }

    if (
      nextErrors.amount
      || nextErrors.date
      || nextErrors.expenseItemName
      || nextErrors.expenseItemAmount
      || nextErrors.expenseSplit
    ) {
      setFieldErrors(nextErrors);
      return;
    }

    setPostingTransaction(true);
    try {
      const occurredAt = resolveOccurredAt(transactionDate);
      const tagNames = parseTransactionTags();
      let recorded = false;
      const recordedTransactionIds: string[] = [];

      if (composerMode === 'expense') {
        const categoryId = await resolveCategorySelection('expense');
        if (!expenseDetailed) {
          const result = await ledgerTransactionCommands.recordExpense({
            accountId,
            occurredAt,
            amount,
            currency: accountCurrency,
            description: transactionNote.trim() || undefined,
            merchant: transactionNote.trim() || undefined,
          });
          await categorizeTransaction(result.id, 'expense', categoryId);
          await applyTransactionTags(result.id, tagNames);
          recordedTransactionIds.push(result.id);
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
          await categorizeTransaction(draft.id, 'expense', categoryId);
          await applyTransactionTags(draft.id, tagNames);
          recordedTransactionIds.push(draft.id);
          recorded = true;
        }
      }

      if (composerMode === 'income') {
        const categoryId = await resolveCategorySelection('income');
        const result = await ledgerTransactionCommands.recordIncome({
          accountId,
          occurredAt,
          amount,
          currency: accountCurrency,
          description: transactionNote.trim() || undefined,
          merchant: transactionNote.trim() || undefined,
        });
        await categorizeTransaction(result.id, 'income', categoryId);
        await applyTransactionTags(result.id, tagNames);
        recordedTransactionIds.push(result.id);
        recorded = true;
      }

      if (composerMode === 'transfer') {
        const result = await ledgerTransactionCommands.recordTransfer({
          fromAccountId: accountId,
          toAccountId: transferToAccountId,
          occurredAt,
          amount,
          currency: accountCurrency,
          description: transactionNote.trim() || undefined,
        });
        await applyTransactionTags(result.transferOutId, tagNames);
        await applyTransactionTags(result.transferInId, tagNames);
        recordedTransactionIds.push(result.transferOutId, result.transferInId);
        recorded = true;
      }

      if (recorded) {
        await finalizeVoiceCapture({
          outcome: 'saved',
          mode: composerMode === 'picker' ? undefined : composerMode,
          transactionIds: recordedTransactionIds,
        });
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
      await finalizeVoiceCapture({
        outcome: 'failed',
        mode: composerMode === 'picker' ? undefined : composerMode,
        errorMessage: toErrorMessage(err),
      });
      reportError(err);
    } finally {
      setPostingTransaction(false);
    }
  }

  const required: TransactionEntryViewRequired = {
    state: {
      open: composerOpen,
      mode: composerMode,
      voicePhase,
      voiceMode,
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
      splitEnabled: expenseDetailed,
      splitItems: expenseItems,
      splitItemName: expenseItemName,
      splitItemAmount: expenseItemAmount,
      splitRemaining: expenseRemaining,
      currencyCode: accountCurrency,
    },
    status: {
      submitting: postingTransaction,
      disabled: loading || refreshing || postingTransaction || voicePhase === 'processing',
      voiceProcessing: voicePhase === 'processing',
      errors: fieldErrors,
    },
  };

  const provided: TransactionEntryViewProvided = {
    commands: {
      open: openTransactionComposer,
      close: closeTransactionComposer,
      startVoiceCapture,
      cancelVoiceCapture,
      confirmVoiceCapture,
      selectMode: selectComposerMode,
      toggleAdvanced: () => setComposerAdvancedOpen((previous) => !previous),
      setAmount: setTransactionAmountValue,
      setDate: setTransactionDate,
      setNote: setTransactionNote,
      setCategoryInput: setTransactionCategoryInput,
      setTagInput: setTransactionTagInput,
      setTransferTarget: setTransferToAccountId,
      setSplitEnabled: setExpenseDetailedValue,
      setSplitItemName: setExpenseItemNameValue,
      setSplitItemAmount: setExpenseItemAmountValue,
      addSplitItem: addExpenseItem,
      removeSplitItem: removeExpenseItem,
      assignSplitRemaining: assignRemaining,
      submit: submitTransaction,
    },
  };

  return {
    error,
    required,
    provided,
  };
}
