import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { LedgerAccountItem, LedgerTransactionListItem } from '../../domain/corePort';

type FieldErrors = {
  amount?: string;
  date?: string;
};

type ComposerMode = 'picker' | 'expense' | 'income' | 'transfer';
export type TransactionType = Exclude<ComposerMode, 'picker'>;

type ExpenseItemDraft = {
  id: string;
  name: string;
  amount: string;
};

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
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function useAccountsPageModel(core: AccountsCorePort) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [postingTransaction, setPostingTransaction] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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
  const [transferToAccountId, setTransferToAccountId] = useState('');

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
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  function resetComposerState() {
    setComposerMode('picker');
    setComposerAdvancedOpen(false);
    setTransactionAmount('');
    setTransactionDate(todayIso());
    setTransactionNote('');
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
    setToastMessage('');
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
    setToastMessage('');

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
      setToastMessage('Account created.');
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
  }

  function setTransactionAmountValue(value: string) {
    setTransactionAmount(value.replace('-', ''));
    setFieldErrors((previous) => ({ ...previous, amount: undefined }));
  }

  function addExpenseItem() {
    const name = expenseItemName.trim();
    const amount = parseAmount(expenseItemAmount);

    if (!name) {
      setError('Item name is required.');
      return;
    }
    if (amount <= 0) {
      setError('Item amount must be greater than 0.');
      return;
    }

    setError('');
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
  }

  async function submitTransaction(event: FormEvent) {
    event.preventDefault();
    setError('');
    setToastMessage('');
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

    if (nextErrors.amount || nextErrors.date) {
      setFieldErrors(nextErrors);
      return;
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
        setError('Add at least one item.');
        return;
      }
      if (parseAmount(expenseRemaining) !== 0) {
        setError('Items must match the total amount before publishing.');
        return;
      }
    }

    setPostingTransaction(true);
    try {
      if (composerMode === 'expense') {
        if (!expenseDetailed) {
          const result = await core.ledgerRecordExpense({
            accountId: selectedAccount.id,
            occurredAt: transactionDate,
            amount,
            currency: selectedAccount.currency,
            description: transactionNote.trim() || undefined,
            merchant: transactionNote.trim() || undefined,
          });
          setToastMessage(`Expense recorded: ${result.id}`);
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
          setToastMessage(`Expense recorded: ${draft.id}`);
        }
      }

      if (composerMode === 'income') {
        const result = await core.ledgerRecordIncome({
          accountId: selectedAccount.id,
          occurredAt: transactionDate,
          amount,
          currency: selectedAccount.currency,
          description: transactionNote.trim() || undefined,
          merchant: transactionNote.trim() || undefined,
        });
        setToastMessage(`Income recorded: ${result.id}`);
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
        setToastMessage(`Transfer recorded: ${result.transferOutId}`);
      }

      await refreshAccounts(selectedAccount.id);
      setComposerOpen(false);
      resetComposerState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPostingTransaction(false);
    }
  }

  async function voidTransaction(transactionId: string) {
    if (!selectedAccount) {
      return;
    }
    setError('');
    setToastMessage('');
    setPostingTransaction(true);
    try {
      await core.ledgerVoidTransaction({ transactionId });
      setToastMessage('Transaction voided.');
      await refreshAccounts(selectedAccount.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPostingTransaction(false);
    }
  }

  return {
    loading,
    refreshing,
    creatingAccount,
    postingTransaction,
    error,
    toastMessage,
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
    transferToAccountId,
    transferTargetOptions,
    expenseDetailed,
    expenseItemName,
    expenseItemAmount,
    expenseItems,
    expenseRemaining,
    setNewAccountName,
    setNewAccountCurrency,
    setNewAccountOpeningBalance,
    setTransactionAmount: setTransactionAmountValue,
    setTransactionDate,
    setTransactionNote,
    setTransferToAccountId,
    setExpenseDetailed,
    setExpenseItemName,
    setExpenseItemAmount,
    clearToast: () => setToastMessage(''),
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
    canPostAgain: false,
    postAgain: () => undefined,
  };
}
