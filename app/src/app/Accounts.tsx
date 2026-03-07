import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { CoreAdapter } from '../data/coreAdapter';
import type { AccountItem, ExpenseItem } from '../domain/corePort';

const core = new CoreAdapter();
const DEFAULT_BUDGET_PLAN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Accounts() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [postingExpense, setPostingExpense] = useState(false);
  const [postingIncome, setPostingIncome] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [netAmount, setNetAmount] = useState('0.00');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

  const [newAccountName, setNewAccountName] = useState('Main account');
  const [newAccountType, setNewAccountType] = useState('cash');
  const [newAccountCurrency, setNewAccountCurrency] = useState('USD');

  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [expenseMerchant, setExpenseMerchant] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState(todayIso());
  const [incomeSource, setIncomeSource] = useState('');

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

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

  async function handleSelectAccount(accountId: string) {
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

  async function handleCreateFirstAccount(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const name = newAccountName.trim();
    if (!name) {
      setError('Account name is required.');
      return;
    }

    try {
      setCreatingAccount(true);
      const created = await core.createAccount({
        name,
        type: newAccountType,
        currency: newAccountCurrency,
      });
      await refreshAccounts(created.id);
      setSuccess('Account created. You can now post expenses.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreatingAccount(false);
    }
  }

  async function handlePostExpense(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedAccount) {
      setError('Select an account first.');
      return;
    }

    const amount = expenseAmount.trim();
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid amount greater than 0.');
      return;
    }

    if (!expenseDate) {
      setError('Date is required.');
      return;
    }

    try {
      setPostingExpense(true);
      const result = await core.postExpense({
        accountId: selectedAccount.id,
        postedDate: expenseDate,
        effectiveDate: expenseDate,
        amount,
        currency: selectedAccount.currency,
        merchant: expenseMerchant.trim() || undefined,
      });

      setExpenseAmount('');
      setExpenseMerchant('');
      await refreshAccounts(selectedAccount.id);
      setSuccess(`Expense posted: ${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPostingExpense(false);
    }
  }

  async function handlePostIncome(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedAccount) {
      setError('Select an account first.');
      return;
    }

    const amount = incomeAmount.trim();
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid income amount greater than 0.');
      return;
    }

    if (!incomeDate) {
      setError('Date is required.');
      return;
    }

    try {
      setPostingIncome(true);
      const result = await core.postIncome({
        budgetPlanId: DEFAULT_BUDGET_PLAN_ID,
        accountId: selectedAccount.id,
        postedDate: incomeDate,
        effectiveDate: incomeDate,
        amount,
        currency: selectedAccount.currency,
        merchant: incomeSource.trim() || undefined,
      });

      setIncomeAmount('');
      setIncomeSource('');
      await refreshAccounts(selectedAccount.id);
      setSuccess(`Income posted: ${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPostingIncome(false);
    }
  }

  if (loading) {
    return (
      <section className="card">
        <h1>Accounts</h1>
        <p>Loading accounts...</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h1>Accounts</h1>
      <p>Account summary and expense history in one place.</p>

      {error ? (
        <div className="banner error" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="banner success" role="status" aria-live="polite">
          {success}
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <form className="stack" onSubmit={handleCreateFirstAccount} aria-busy={creatingAccount}>
          <h2>Create your first account</h2>
          <label htmlFor="new-account-name">Account name</label>
          <input
            id="new-account-name"
            value={newAccountName}
            onChange={(event) => setNewAccountName(event.target.value)}
            placeholder="Account name"
            autoComplete="off"
          />
          <label htmlFor="new-account-type">Account type</label>
          <select
            id="new-account-type"
            value={newAccountType}
            onChange={(event) => setNewAccountType(event.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="card">Card</option>
            <option value="investment">Investment</option>
            <option value="other">Other</option>
          </select>
          <label htmlFor="new-account-currency">Currency</label>
          <input
            id="new-account-currency"
            value={newAccountCurrency}
            onChange={(event) => setNewAccountCurrency(event.target.value.toUpperCase())}
            placeholder="USD"
            maxLength={3}
            autoCapitalize="characters"
          />
          <button type="submit" disabled={creatingAccount}>
            {creatingAccount ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      ) : (
        <>
          <div className="stack" aria-busy={refreshing}>
            <label htmlFor="account-picker">Account</label>
            <select
              id="account-picker"
              value={selectedAccountId}
              onChange={(event) => handleSelectAccount(event.target.value)}
              disabled={refreshing || postingExpense || postingIncome}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))}
            </select>
          </div>

          {selectedAccount ? (
            <section className="summary-card">
              <h2>{selectedAccount.name}</h2>
              <p className="summary-label">Net balance</p>
              <div className="summary-amount">
                {netAmount} {selectedAccount.currency}
              </div>
            </section>
          ) : null}

          <form className="stack section-gap" onSubmit={handlePostIncome} aria-busy={postingIncome}>
            <h2>Add income</h2>
            <label htmlFor="income-amount">Amount</label>
            <input
              id="income-amount"
              value={incomeAmount}
              onChange={(event) => setIncomeAmount(event.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              disabled={postingIncome || refreshing || postingExpense}
            />
            <label htmlFor="income-date">Date</label>
            <input
              id="income-date"
              type="date"
              value={incomeDate}
              onChange={(event) => setIncomeDate(event.target.value)}
              disabled={postingIncome || refreshing || postingExpense}
            />
            <label htmlFor="income-source">Source</label>
            <input
              id="income-source"
              value={incomeSource}
              onChange={(event) => setIncomeSource(event.target.value)}
              placeholder="Salary (optional)"
              disabled={postingIncome || refreshing || postingExpense}
            />
            <button type="submit" disabled={postingIncome || refreshing || postingExpense}>
              {postingIncome ? 'Posting income...' : 'Post income'}
            </button>
          </form>

          <form className="stack section-gap" onSubmit={handlePostExpense} aria-busy={postingExpense}>
            <h2>Add expense</h2>
            <label htmlFor="expense-amount">Amount</label>
            <input
              id="expense-amount"
              value={expenseAmount}
              onChange={(event) => setExpenseAmount(event.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              disabled={postingExpense || refreshing || postingIncome}
            />
            <label htmlFor="expense-date">Date</label>
            <input
              id="expense-date"
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              disabled={postingExpense || refreshing || postingIncome}
            />
            <label htmlFor="expense-merchant">Merchant</label>
            <input
              id="expense-merchant"
              value={expenseMerchant}
              onChange={(event) => setExpenseMerchant(event.target.value)}
              placeholder="Merchant (optional)"
              disabled={postingExpense || refreshing || postingIncome}
            />
            <button type="submit" disabled={postingExpense || refreshing || postingIncome}>
              {postingExpense ? 'Posting expense...' : 'Post expense'}
            </button>
          </form>

          <div className="stack section-gap">
            <h2>Recent expenses</h2>
            <p>Income updates your balance, but only expenses are listed below.</p>
            {expenses.length === 0 ? <p>No expenses yet.</p> : null}
            <ul className="expense-list" aria-label="Recent expenses">
              {expenses.map((expense) => (
                <li key={expense.id} className="expense-item">
                  <div className="expense-top-row">
                    <strong>
                      {expense.amount} {expense.currency}
                    </strong>
                    <span>{expense.postedDate}</span>
                  </div>
                  <span>{expense.merchant || 'No merchant'}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
