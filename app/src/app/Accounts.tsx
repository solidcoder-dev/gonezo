import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { CoreAdapter } from '../data/coreAdapter';
import type { AccountItem, ExpenseItem } from '../domain/corePort';

const core = new CoreAdapter();

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Accounts() {
  const [loading, setLoading] = useState(true);
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
    try {
      const summary = await core.getAccountSummary({ accountId });
      setNetAmount(summary.netAmount);
      const expenseResult = await core.listExpenses({ accountId, limit: 10 });
      setExpenses(expenseResult.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
      const created = await core.createAccount({
        name,
        type: newAccountType,
        currency: newAccountCurrency,
      });
      await refreshAccounts(created.id);
      setSuccess('Account created. You can now post expenses.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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

      {error ? <pre className="result error">{error}</pre> : null}
      {success ? <pre className="result">{success}</pre> : null}

      {accounts.length === 0 ? (
        <form className="stack" onSubmit={handleCreateFirstAccount}>
          <h2>Create your first account</h2>
          <input
            value={newAccountName}
            onChange={(event) => setNewAccountName(event.target.value)}
            placeholder="Account name"
          />
          <select value={newAccountType} onChange={(event) => setNewAccountType(event.target.value)}>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="card">Card</option>
            <option value="investment">Investment</option>
            <option value="other">Other</option>
          </select>
          <input
            value={newAccountCurrency}
            onChange={(event) => setNewAccountCurrency(event.target.value.toUpperCase())}
            placeholder="Currency (e.g. USD)"
            maxLength={3}
          />
          <button type="submit">Create account</button>
        </form>
      ) : (
        <>
          <div className="stack">
            <label htmlFor="account-picker">Account</label>
            <select
              id="account-picker"
              value={selectedAccountId}
              onChange={(event) => handleSelectAccount(event.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))}
            </select>
          </div>

          {selectedAccount ? (
            <div className="result" style={{ marginTop: 12 }}>
              <strong>{selectedAccount.name}</strong>
              <div>
                Net amount (income-expense): {netAmount} {selectedAccount.currency}
              </div>
            </div>
          ) : null}

          <form className="stack" onSubmit={handlePostExpense} style={{ marginTop: 16 }}>
            <h2>Add expense</h2>
            <input
              value={expenseAmount}
              onChange={(event) => setExpenseAmount(event.target.value)}
              placeholder="Amount"
              inputMode="decimal"
            />
            <input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
            <input
              value={expenseMerchant}
              onChange={(event) => setExpenseMerchant(event.target.value)}
              placeholder="Merchant (optional)"
            />
            <button type="submit">Post expense</button>
          </form>

          <div className="stack" style={{ marginTop: 16 }}>
            <h2>Recent expenses</h2>
            {expenses.length === 0 ? <p>No expenses yet.</p> : null}
            {expenses.map((expense) => (
              <div key={expense.id} className="action-link" style={{ display: 'grid', gap: 4 }}>
                <strong>
                  {expense.amount} {expense.currency}
                </strong>
                <span>{expense.postedDate}</span>
                <span>{expense.merchant || 'No merchant'}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
