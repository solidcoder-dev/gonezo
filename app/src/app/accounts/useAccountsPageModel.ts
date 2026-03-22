import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  LedgerAccountItem,
  LedgerTransactionListItem,
  TaxonomyCategoryItem,
  TaxonomyTagItem,
} from '../../domain/corePort';

type FieldErrors = {
  amount?: string;
  date?: string;
  expenseItemName?: string;
  expenseItemAmount?: string;
  expenseSplit?: string;
};

type ComposerMode = 'picker' | 'expense' | 'income' | 'transfer';
export type TransactionType = Exclude<ComposerMode, 'picker'>;

type ExpenseItemDraft = {
  id: string;
  name: string;
  amount: string;
};

type TaxonomyCategoryAppliesTo = 'income' | 'expense';

export type AccountsCorePort = {
  ledgerListSupportedCurrencies(): Promise<{ items: string[] }>;
  ledgerListAccounts(): Promise<{ items: LedgerAccountItem[] }>;
  ledgerGetAccountSummary(input: { accountId: string }): Promise<{
    accountId: string;
    name: string;
    type: string;
    currency: string;
    balanceAmount: string;
  }>;
  ledgerListTransactions(input: {
    accountId: string;
    limit?: number;
    includeVoided?: boolean;
  }): Promise<{ items: LedgerTransactionListItem[] }>;
  ledgerOpenAccount(input: {
    name: string;
    type?: string;
    currency: string;
    createdAt?: string;
    openingBalanceAmount?: string;
  }): Promise<{ id: string }>;
  ledgerRecordExpense(input: {
    accountId: string;
    occurredAt: string;
    amount: string;
    currency: string;
    description?: string;
    merchant?: string;
  }): Promise<{ id: string }>;
  ledgerRecordIncome(input: {
    accountId: string;
    occurredAt: string;
    amount: string;
    currency: string;
    description?: string;
    merchant?: string;
  }): Promise<{ id: string }>;
  ledgerRecordTransfer(input: {
    fromAccountId: string;
    toAccountId: string;
    occurredAt: string;
    amount: string;
    currency: string;
    description?: string;
  }): Promise<{ transferOutId: string; transferInId: string }>;
  ledgerCreateExpenseDraft(input: {
    accountId: string;
    occurredAt: string;
    amount: string;
    currency: string;
    description?: string;
    merchant?: string;
  }): Promise<{ id: string }>;
  ledgerAddTransactionItem(input: {
    transactionId: string;
    name: string;
    amount: string;
    currency: string;
    note?: string;
  }): Promise<void>;
  ledgerPostDraftTransaction(input: { transactionId: string }): Promise<void>;
  ledgerVoidTransaction(input: { transactionId: string }): Promise<void>;
  taxonomyListCategories(input?: {
    appliesTo?: TaxonomyCategoryAppliesTo;
    includeArchived?: boolean;
  }): Promise<{ items: TaxonomyCategoryItem[] }>;
  taxonomyCreateCategory(input: {
    name: string;
    appliesTo: TaxonomyCategoryAppliesTo;
  }): Promise<{ id: string }>;
  taxonomyListTags(input?: {
    includeArchived?: boolean;
  }): Promise<{ items: TaxonomyTagItem[] }>;
  orchestrationCategorizeTransaction(input: {
    transactionId: string;
    transactionType: TaxonomyCategoryAppliesTo;
    categoryId?: string;
  }): Promise<{
    status: 'assigned' | 'failed' | 'none';
    categoryId?: string;
    errorCode?: string;
    errorMessage?: string;
  }>;
  orchestrationApplyTransactionTags(input: {
    transactionId: string;
    tagNames: string[];
  }): Promise<{
    status: 'assigned' | 'failed' | 'none';
    tagIds?: string[];
    errorCode?: string;
    errorMessage?: string;
  }>;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

const VOID_COMMIT_DELAY_MS = 5000;

export function useAccountsPageModel(core: AccountsCorePort) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [postingTransaction, setPostingTransaction] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastActionLabel, setToastActionLabel] = useState('');
  const [toastAction, setToastAction] = useState<(() => void) | null>(null);
  const [pendingVoidTransactionId, setPendingVoidTransactionId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const pendingVoidTimerRef = useRef<number | null>(null);

  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('0.00');
  const [transactions, setTransactions] = useState<LedgerTransactionListItem[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const [showCreateAccountForm, setShowCreateAccountForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState('Main account');
  const [newAccountCurrency, setNewAccountCurrency] = useState('USD');
  const [newAccountOpeningBalance, setNewAccountOpeningBalance] = useState('');

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>('picker');
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

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  const transferTargetOptions = useMemo(
    () => accounts.filter((account) => account.id !== selectedAccountId),
    [accounts, selectedAccountId],
  );

  const categoryOptions = useMemo(() => {
    if (composerMode !== 'expense' && composerMode !== 'income') {
      return [];
    }
    const currentType = composerMode;
    return categories
      .filter((category) => category.status === 'active')
      .sort((a, b) => {
        const aWeight = a.appliesTo === currentType ? 0 : 1;
        const bWeight = b.appliesTo === currentType ? 0 : 1;
        if (aWeight !== bWeight) {
          return aWeight - bWeight;
        }
        return a.name.localeCompare(b.name);
      });
  }, [categories, composerMode]);

  const tagOptions = useMemo(
    () => tags
      .filter((tag) => tag.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name)),
    [tags],
  );

  const expenseAssigned = useMemo(
    () => expenseItems.reduce((acc, item) => acc + parseAmount(item.amount), 0),
    [expenseItems],
  );

  const expenseRemaining = useMemo(() => {
    const total = parseAmount(transactionAmount);
    if (total <= 0) {
      return '0.00';
    }
    return (Math.round((total - expenseAssigned) * 100) / 100).toFixed(2);
  }, [transactionAmount, expenseAssigned]);

  const visibleTransactions = useMemo(
    () => (historyExpanded ? transactions : transactions.slice(0, 3)),
    [transactions, historyExpanded],
  );
  const hiddenTransactionsCount = Math.max(0, transactions.length - visibleTransactions.length);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToastMessage('');
      setToastActionLabel('');
      setToastAction(null);
    }, pendingVoidTransactionId ? VOID_COMMIT_DELAY_MS + 400 : 2400);

    return () => window.clearTimeout(timer);
  }, [toastMessage, pendingVoidTransactionId]);

  useEffect(() => () => {
    if (pendingVoidTimerRef.current != null) {
      window.clearTimeout(pendingVoidTimerRef.current);
    }
  }, []);

  function clearPendingVoidTimer() {
    if (pendingVoidTimerRef.current != null) {
      window.clearTimeout(pendingVoidTimerRef.current);
      pendingVoidTimerRef.current = null;
    }
  }

  function clearToastState() {
    setToastMessage('');
    setToastActionLabel('');
    setToastAction(null);
  }

  function showToast(message: string) {
    setToastMessage(message);
    setToastActionLabel('');
    setToastAction(null);
  }

  function cancelPendingVoid(message: string) {
    clearPendingVoidTimer();
    setPendingVoidTransactionId('');
    setToastActionLabel('');
    setToastAction(null);
    setToastMessage(message);
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

  async function refreshAccounts(preferredAccountId?: string) {
    const accountResult = await core.ledgerListAccounts();
    setAccounts(accountResult.items);

    if (accountResult.items.length === 0) {
      setSelectedAccountId('');
      setTransferToAccountId('');
      setBalanceAmount('0.00');
      setTransactions([]);
      return;
    }

    const nextSelectedId =
      preferredAccountId && accountResult.items.some((item) => item.id === preferredAccountId)
        ? preferredAccountId
        : selectedAccountId && accountResult.items.some((item) => item.id === selectedAccountId)
          ? selectedAccountId
          : accountResult.items[0].id;

    setSelectedAccountId(nextSelectedId);

    const fallbackTransferTarget =
      accountResult.items.find((item) => item.id === transferToAccountId && item.id !== nextSelectedId)?.id
      ?? accountResult.items.find((item) => item.id !== nextSelectedId)?.id
      ?? '';
    setTransferToAccountId(fallbackTransferTarget);

    const summary = await core.ledgerGetAccountSummary({ accountId: nextSelectedId });
    setBalanceAmount(summary.balanceAmount);

    const transactionResult = await core.ledgerListTransactions({
      accountId: nextSelectedId,
      limit: 20,
      includeVoided: true,
    });
    setTransactions(transactionResult.items);
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        const currencies = await core.ledgerListSupportedCurrencies();
        setSupportedCurrencies(currencies.items);
        if (currencies.items.length > 0 && !currencies.items.includes(newAccountCurrency)) {
          setNewAccountCurrency(currencies.items[0]);
        }
        const taxonomy = await core.taxonomyListCategories({ includeArchived: false });
        setCategories(taxonomy.items);
        const taxonomyTags = await core.taxonomyListTags({ includeArchived: false });
        setTags(taxonomyTags.items);
        await refreshAccounts();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectAccount(accountId: string) {
    setError('');
    if (pendingVoidTransactionId) {
      cancelPendingVoid('Pending void canceled.');
    } else {
      clearToastState();
    }
    setSelectedAccountId(accountId);
    setComposerOpen(false);
    setRefreshing(true);

    try {
      const summary = await core.ledgerGetAccountSummary({ accountId });
      setBalanceAmount(summary.balanceAmount);
      const transactionResult = await core.ledgerListTransactions({ accountId, limit: 20, includeVoided: true });
      setTransactions(transactionResult.items);
      setHistoryExpanded(false);
      const nextTarget =
        transferToAccountId && transferToAccountId !== accountId && accounts.some((item) => item.id === transferToAccountId)
          ? transferToAccountId
          : accounts.find((item) => item.id !== accountId)?.id ?? '';
      setTransferToAccountId(nextTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  }

  async function submitCreateAccount(event: FormEvent) {
    event.preventDefault();
    setError('');
    clearToastState();

    const name = newAccountName.trim();
    if (!name) {
      setError('Account name is required.');
      return;
    }

    const currency = newAccountCurrency.trim().toUpperCase();
    if (!supportedCurrencies.includes(currency)) {
      setError('Select a supported currency.');
      return;
    }

    const openingBalanceRaw = newAccountOpeningBalance.trim();
    if (openingBalanceRaw && Number.isNaN(Number(openingBalanceRaw))) {
      setError('Opening balance must be a valid number.');
      return;
    }

    setCreatingAccount(true);
    try {
      const created = await core.ledgerOpenAccount({
        name,
        type: 'cash',
        currency,
        openingBalanceAmount: openingBalanceRaw || undefined,
      });
      await refreshAccounts(created.id);
      setShowCreateAccountForm(false);
      setNewAccountOpeningBalance('');
      showToast('Account created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreatingAccount(false);
    }
  }

  function openTransactionComposer() {
    if (!selectedAccount) {
      setError('Select an account first.');
      return;
    }
    setError('');
    setComposerOpen(true);
    resetComposerState();
  }

  function closeTransactionComposer() {
    setComposerOpen(false);
    resetComposerState();
  }

  function selectComposerMode(mode: Exclude<ComposerMode, 'picker'>) {
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

  function setTransactionCategoryInputValue(value: string) {
    setTransactionCategoryInput(value);
  }

  function setTransactionTagInputValue(value: string) {
    setTransactionTagInput(value);
  }

  function addExpenseItem() {
    const name = expenseItemName.trim();
    const amount = parseAmount(expenseItemAmount);

    const nextErrors: FieldErrors = {};
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

    setError('');
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

    const created = await core.taxonomyCreateCategory({
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
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    setTransactionCategoryInput(rawInput);
    return created.id;
  }

  async function categorizeTransaction(
    transactionId: string,
    transactionType: TaxonomyCategoryAppliesTo,
    categoryId?: string,
  ) {
    if (!categoryId) {
      return;
    }
    const result = await core.orchestrationCategorizeTransaction({
      transactionId,
      transactionType,
      categoryId,
    });
    if (result.status === 'failed') {
      throw new Error(result.errorCode ?? result.errorMessage ?? 'Categorization failed');
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

  async function applyTransactionTags(transactionId: string, tagNames: string[]) {
    if (tagNames.length === 0) {
      return;
    }
    const result = await core.orchestrationApplyTransactionTags({
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
    clearToastState();
    setFieldErrors({});

    if (!selectedAccount) {
      setError('Select an account first.');
      return;
    }

    const amount = transactionAmount.trim();
    const nextErrors: FieldErrors = {};
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

    if (composerMode === 'transfer' && transferToAccountId === selectedAccount.id) {
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
      const tagNames = parseTransactionTags();
      let recorded = false;
      if (composerMode === 'expense') {
        const categoryId = await resolveCategorySelection('expense');
        if (!expenseDetailed) {
          const result = await core.ledgerRecordExpense({
            accountId: selectedAccount.id,
            occurredAt: transactionDate,
            amount,
            currency: selectedAccount.currency,
            description: transactionNote.trim() || undefined,
            merchant: transactionNote.trim() || undefined,
          });
          await categorizeTransaction(result.id, 'expense', categoryId);
          await applyTransactionTags(result.id, tagNames);
          showToast(`Expense recorded: ${result.id}`);
          recorded = true;
        } else {
          const draft = await core.ledgerCreateExpenseDraft({
            accountId: selectedAccount.id,
            occurredAt: transactionDate,
            amount,
            currency: selectedAccount.currency,
            description: transactionNote.trim() || undefined,
            merchant: transactionNote.trim() || undefined,
          });
          for (const item of expenseItems) {
            await core.ledgerAddTransactionItem({
              transactionId: draft.id,
              name: item.name,
              amount: item.amount,
              currency: selectedAccount.currency,
            });
          }
          await core.ledgerPostDraftTransaction({ transactionId: draft.id });
          await categorizeTransaction(draft.id, 'expense', categoryId);
          await applyTransactionTags(draft.id, tagNames);
          showToast(`Expense recorded: ${draft.id}`);
          recorded = true;
        }
      }

      if (composerMode === 'income') {
        const categoryId = await resolveCategorySelection('income');
        const result = await core.ledgerRecordIncome({
          accountId: selectedAccount.id,
          occurredAt: transactionDate,
          amount,
          currency: selectedAccount.currency,
          description: transactionNote.trim() || undefined,
          merchant: transactionNote.trim() || undefined,
        });
        await categorizeTransaction(result.id, 'income', categoryId);
        await applyTransactionTags(result.id, tagNames);
        showToast(`Income recorded: ${result.id}`);
        recorded = true;
      }

      if (composerMode === 'transfer') {
        const result = await core.ledgerRecordTransfer({
          fromAccountId: selectedAccount.id,
          toAccountId: transferToAccountId,
          occurredAt: transactionDate,
          amount,
          currency: selectedAccount.currency,
          description: transactionNote.trim() || undefined,
        });
        await applyTransactionTags(result.transferOutId, tagNames);
        await applyTransactionTags(result.transferInId, tagNames);
        showToast(`Transfer recorded: ${result.transferOutId}`);
        recorded = true;
      }

      if (recorded) {
        setComposerOpen(false);
        resetComposerState();
        await refreshAccounts(selectedAccount.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPostingTransaction(false);
    }
  }

  async function executeVoidTransaction(transactionId: string, accountId: string) {
    setPostingTransaction(true);
    try {
      await core.ledgerVoidTransaction({ transactionId });
      showToast('Transaction voided.');
      await refreshAccounts(accountId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPostingTransaction(false);
      setPendingVoidTransactionId('');
      setToastActionLabel('');
      setToastAction(null);
      clearPendingVoidTimer();
    }
  }

  function voidTransaction(transactionId: string) {
    if (!selectedAccount) {
      return;
    }
    setError('');
    clearPendingVoidTimer();
    setPendingVoidTransactionId(transactionId);
    setToastMessage('Transaction will be voided in 5 seconds.');
    setToastActionLabel('Undo');
    setToastAction(() => () => cancelPendingVoid('Void canceled.'));

    const accountId = selectedAccount.id;
    pendingVoidTimerRef.current = window.setTimeout(() => {
      pendingVoidTimerRef.current = null;
      void executeVoidTransaction(transactionId, accountId);
    }, VOID_COMMIT_DELAY_MS);
  }

  return {
    loading,
    refreshing,
    creatingAccount,
    postingTransaction,
    error,
    toastMessage,
    toastActionLabel,
    pendingVoidTransactionId,
    fieldErrors,
    accounts,
    supportedCurrencies,
    selectedAccountId,
    selectedAccount,
    balanceAmount,
    visibleTransactions,
    hiddenTransactionsCount,
    historyExpanded,
    showCreateAccountForm,
    newAccountName,
    newAccountCurrency,
    newAccountOpeningBalance,
    composerOpen,
    composerMode,
    composerAdvancedOpen,
    transactionAmount,
    transactionDate,
    transactionNote,
    transactionCategoryInput,
    transactionTagInput,
    categoryOptions,
    tagOptions,
    transferToAccountId,
    transferTargetOptions,
    expenseDetailed,
    expenseItemName,
    expenseItemAmount,
    expenseItems,
    expenseRemaining,
    expenseItemNameError: fieldErrors.expenseItemName,
    expenseItemAmountError: fieldErrors.expenseItemAmount,
    expenseSplitError: fieldErrors.expenseSplit,
    setNewAccountName,
    setNewAccountCurrency,
    setNewAccountOpeningBalance,
    setTransactionAmount: setTransactionAmountValue,
    setTransactionDate,
    setTransactionNote,
    setTransactionCategoryInput: setTransactionCategoryInputValue,
    setTransactionTagInput: setTransactionTagInputValue,
    setTransferToAccountId,
    setExpenseDetailed: setExpenseDetailedValue,
    setExpenseItemName: setExpenseItemNameValue,
    setExpenseItemAmount: setExpenseItemAmountValue,
    clearToast: () => {
      if (pendingVoidTransactionId) {
        cancelPendingVoid('Void canceled.');
      } else {
        clearToastState();
      }
    },
    runToastAction: () => toastAction?.(),
    openCreateAccountForm: () => setShowCreateAccountForm(true),
    closeCreateAccountForm: () => setShowCreateAccountForm(false),
    expandHistory: () => setHistoryExpanded(true),
    openTransactionComposer,
    closeTransactionComposer,
    selectComposerMode,
    toggleComposerAdvanced: () => setComposerAdvancedOpen((previous) => !previous),
    addExpenseItem,
    removeExpenseItem,
    assignRemaining,
    submitCreateAccount,
    selectAccount,
    submitTransaction,
    voidTransaction,
  };
}
