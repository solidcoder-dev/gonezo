import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { AccountItem, ExpenseItem } from '../../domain/corePort';

const DEFAULT_BUDGET_PLAN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

export type AccountsCorePort = {
  listAccounts(): Promise<{ items: AccountItem[] }>;
  getAccountSummary(input: { accountId: string }): Promise<{
    accountId: string;
    name: string;
    type: string;
    currency: string;
    netAmount: string;
  }>;
  listExpenses(input: { accountId: string; limit?: number }): Promise<{ items: ExpenseItem[] }>;
  createAccount(input: { name: string; type?: string; currency?: string }): Promise<{ id: string }>;
  postExpense(input: {
    accountId: string;
    postedDate: string;
    effectiveDate: string;
    amount: string;
    currency: string;
    merchant?: string;
  }): Promise<{ id: string }>;
  postIncome(input: {
    budgetPlanId: string;
    accountId: string;
    postedDate: string;
    effectiveDate: string;
    amount: string;
    currency: string;
    merchant?: string;
  }): Promise<{ id: string }>;
};

export type TransactionType = 'expense' | 'income';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useAccountsPageModel(core: AccountsCorePort) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [postingTransaction, setPostingTransaction] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [netAmount, setNetAmount] = useState('0.00');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  const [newAccountName, setNewAccountName] = useState('Main account');
  const [newAccountCurrency, setNewAccountCurrency] = useState('USD');

  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(todayIso());
  const [counterparty, setCounterparty] = useState('');

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const recentExpenses = useMemo(() => expenses.slice(0, 3), [expenses]);
  const hiddenExpensesCount = Math.max(0, expenses.length - recentExpenses.length);

  async function refreshAccounts(preferredAccountId?: string) {
    const accountResult = await core.listAccounts();
    setAccounts(accountResult.items);

    if (accountResult.items.length === 0) {
      setSelectedAccountId('');
      setNetAmount('0.00');
      setExpenses([]);
      return;
    }

    const nextSelectedId =
      preferredAccountId && accountResult.items.some((item) => item.id === preferredAccountId)
        ? preferredAccountId
        : selectedAccountId && accountResult.items.some((item) => item.id === selectedAccountId)
          ? selectedAccountId
          : accountResult.items[0].id;

    setSelectedAccountId(nextSelectedId);

    const summary = await core.getAccountSummary({ accountId: nextSelectedId });
    setNetAmount(summary.netAmount);

    const expenseResult = await core.listExpenses({ accountId: nextSelectedId, limit: 10 });
    setExpenses(expenseResult.items);
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
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
    setSuccess('');
    setSelectedAccountId(accountId);
    setRefreshing(true);

    try {
      const summary = await core.getAccountSummary({ accountId });
      setNetAmount(summary.netAmount);
      const expenseResult = await core.listExpenses({ accountId, limit: 10 });
      setExpenses(expenseResult.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  }

  async function createFirstAccount(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const name = newAccountName.trim();
    if (!name) {
      setError('Account name is required.');
      return;
    }

    const currency = newAccountCurrency.trim().toUpperCase();
    if (currency.length !== 3) {
      setError('Currency must have 3 letters.');
      return;
    }

    setCreatingAccount(true);
    try {
      const created = await core.createAccount({
        name,
        type: 'cash',
        currency,
      });
      await refreshAccounts(created.id);
      setSuccess('Account created. You can now post transactions.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreatingAccount(false);
    }
  }

  async function submitTransaction(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedAccount) {
      setError('Select an account first.');
      return;
    }

    const amount = transactionAmount.trim();
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid amount greater than 0.');
      return;
    }

    if (!transactionDate) {
      setError('Date is required.');
      return;
    }

    setPostingTransaction(true);
    try {
      if (transactionType === 'expense') {
        const result = await core.postExpense({
          accountId: selectedAccount.id,
          postedDate: transactionDate,
          effectiveDate: transactionDate,
          amount,
          currency: selectedAccount.currency,
          merchant: counterparty.trim() || undefined,
        });
        setSuccess(`Expense posted: ${result.id}`);
      } else {
        const result = await core.postIncome({
          budgetPlanId: DEFAULT_BUDGET_PLAN_ID,
          accountId: selectedAccount.id,
          postedDate: transactionDate,
          effectiveDate: transactionDate,
          amount,
          currency: selectedAccount.currency,
          merchant: counterparty.trim() || undefined,
        });
        setSuccess(`Income posted: ${result.id}`);
      }

      setTransactionAmount('');
      setCounterparty('');
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
    success,
    accounts,
    selectedAccountId,
    selectedAccount,
    netAmount,
    recentExpenses,
    hiddenExpensesCount,
    newAccountName,
    newAccountCurrency,
    transactionType,
    transactionAmount,
    transactionDate,
    counterparty,
    setNewAccountName,
    setNewAccountCurrency,
    setTransactionType,
    setTransactionAmount,
    setTransactionDate,
    setCounterparty,
    createFirstAccount,
    selectAccount,
    submitTransaction,
  };
}
