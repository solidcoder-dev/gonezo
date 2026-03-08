import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { AccountItem, ExpenseItem } from '../../domain/corePort';

const DEFAULT_BUDGET_PLAN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const LAST_TYPE_KEY = 'gonezo:last-transaction-type';

type FieldErrors = {
  amount?: string;
  date?: string;
};

type LastSubmittedTransaction = {
  type: TransactionType;
  accountId: string;
  amount: string;
  date: string;
  currency: string;
  counterparty?: string;
};

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

function readLastType(): TransactionType {
  if (typeof window === 'undefined') {
    return 'expense';
  }

  const saved = window.localStorage.getItem(LAST_TYPE_KEY);
  return saved === 'income' ? 'income' : 'expense';
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIso(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return now.toISOString().slice(0, 10);
}

export function useAccountsPageModel(core: AccountsCorePort) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [postingTransaction, setPostingTransaction] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [netAmount, setNetAmount] = useState('0.00');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const [showCreateAccountForm, setShowCreateAccountForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState('Main account');
  const [newAccountCurrency, setNewAccountCurrency] = useState('USD');

  const [transactionType, setTransactionType] = useState<TransactionType>(readLastType());
  const [transactionAmount, setTransactionAmount] = useState('');
  const [lastTransactionAmount, setLastTransactionAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(todayIso());
  const [counterparty, setCounterparty] = useState('');
  const [showStepSettings, setShowStepSettings] = useState(false);
  const [stepSize, setStepSize] = useState('0.10');
  const [lastSubmittedTransaction, setLastSubmittedTransaction] = useState<LastSubmittedTransaction | null>(null);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const visibleExpenses = useMemo(
    () => (historyExpanded ? expenses : expenses.slice(0, 3)),
    [expenses, historyExpanded]
  );
  const hiddenExpensesCount = Math.max(0, expenses.length - visibleExpenses.length);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToastMessage('');
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

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

  function selectTransactionType(value: TransactionType) {
    setTransactionType(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_TYPE_KEY, value);
    }
  }

  async function selectAccount(accountId: string) {
    setError('');
    setToastMessage('');
    setSelectedAccountId(accountId);
    setRefreshing(true);

    try {
      const summary = await core.getAccountSummary({ accountId });
      setNetAmount(summary.netAmount);
      const expenseResult = await core.listExpenses({ accountId, limit: 10 });
      setExpenses(expenseResult.items);
      setHistoryExpanded(false);
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
      setShowCreateAccountForm(false);
      setToastMessage('Account created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreatingAccount(false);
    }
  }

  function applyAmountDelta(delta: number) {
    const current = Number(transactionAmount || '0');
    const next = Number.isNaN(current) ? delta : current + delta;
    setTransactionAmount(next.toFixed(2));
    setFieldErrors((previous) => ({ ...previous, amount: undefined }));
  }

  function applyStepUnits(units: number) {
    const step = Number(stepSize);
    if (Number.isNaN(step) || step <= 0) {
      return;
    }
    applyAmountDelta(units * step);
  }

  function setTransactionAmountValue(value: string) {
    setTransactionAmount(value);
    setFieldErrors((previous) => ({ ...previous, amount: undefined }));
  }

  function formatAmount() {
    if (!transactionAmount.trim()) {
      return;
    }

    const numeric = Number(transactionAmount);
    if (Number.isNaN(numeric)) {
      return;
    }

    setTransactionAmount(numeric.toFixed(2));
  }

  function useLastAmount() {
    if (!lastTransactionAmount) {
      return;
    }
    setTransactionAmount(lastTransactionAmount);
    setFieldErrors((previous) => ({ ...previous, amount: undefined }));
  }

  function setToday() {
    setTransactionDate(todayIso());
    setFieldErrors((previous) => ({ ...previous, date: undefined }));
  }

  function setYesterday() {
    setTransactionDate(yesterdayIso());
    setFieldErrors((previous) => ({ ...previous, date: undefined }));
  }

  function setStepSizeValue(value: string) {
    setStepSize(value);
  }

  async function postTransaction(data: LastSubmittedTransaction, announce = true) {
    if (data.type === 'expense') {
      const result = await core.postExpense({
        accountId: data.accountId,
        postedDate: data.date,
        effectiveDate: data.date,
        amount: data.amount,
        currency: data.currency,
        merchant: data.counterparty,
      });
      if (announce) {
        setToastMessage(`Expense posted: ${result.id}`);
      }
      return;
    }

    const result = await core.postIncome({
      budgetPlanId: DEFAULT_BUDGET_PLAN_ID,
      accountId: data.accountId,
      postedDate: data.date,
      effectiveDate: data.date,
      amount: data.amount,
      currency: data.currency,
      merchant: data.counterparty,
    });
    if (announce) {
      setToastMessage(`Income posted: ${result.id}`);
    }
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

    setPostingTransaction(true);
    try {
      const payload: LastSubmittedTransaction = {
        type: transactionType,
        accountId: selectedAccount.id,
        amount,
        date: transactionDate,
        currency: selectedAccount.currency,
        counterparty: counterparty.trim() || undefined,
      };

      await postTransaction(payload);
      setLastSubmittedTransaction(payload);
      setLastTransactionAmount(amount);
      setTransactionAmount('');
      setCounterparty('');
      await refreshAccounts(selectedAccount.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPostingTransaction(false);
    }
  }

  async function postAgain() {
    if (!lastSubmittedTransaction || postingTransaction) {
      return;
    }

    setError('');
    setPostingTransaction(true);
    try {
      await postTransaction(lastSubmittedTransaction, false);
      setToastMessage('Posted again.');
      await refreshAccounts(lastSubmittedTransaction.accountId);
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
    selectedAccountId,
    selectedAccount,
    netAmount,
    visibleExpenses,
    hiddenExpensesCount,
    historyExpanded,
    showCreateAccountForm,
    newAccountName,
    newAccountCurrency,
    transactionType,
    transactionAmount,
    transactionDate,
    counterparty,
    lastTransactionAmount,
    showStepSettings,
    stepSize,
    canPostAgain: Boolean(lastSubmittedTransaction),
    setNewAccountName,
    setNewAccountCurrency,
    setTransactionAmount: setTransactionAmountValue,
    setTransactionDate,
    setCounterparty,
    selectTransactionType,
    setStepSize: setStepSizeValue,
    formatAmount,
    openCreateAccountForm: () => setShowCreateAccountForm(true),
    closeCreateAccountForm: () => setShowCreateAccountForm(false),
    expandHistory: () => setHistoryExpanded(true),
    toggleStepSettings: () => setShowStepSettings((previous) => !previous),
    applyStepUnits,
    useLastAmount,
    setToday,
    setYesterday,
    postAgain,
    clearToast: () => setToastMessage(''),
    submitCreateAccount,
    selectAccount,
    submitTransaction,
  };
}
