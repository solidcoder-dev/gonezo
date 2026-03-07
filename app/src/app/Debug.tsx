import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CoreAdapter } from '../data/coreAdapter';

const core = new CoreAdapter();

export function Debug() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [accountName, setAccountName] = useState('Main account');
  const [accountResult, setAccountResult] = useState('');
  const [expenseResult, setExpenseResult] = useState('');
  const [transferResult, setTransferResult] = useState('');
  const [incomeResult, setIncomeResult] = useState('');
  const [periodResult, setPeriodResult] = useState('');
  const [allocateResult, setAllocateResult] = useState('');
  const [balancesResult, setBalancesResult] = useState('');
  const [reservationResult, setReservationResult] = useState('');
  const [reservationsResult, setReservationsResult] = useState('');

  async function handleCall() {
    setError('');
    try {
      const res = await core.doThing(message || 'ping');
      setResult(`${res.status}: ${res.message}`);
    } catch (err) {
      setResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleCreateAccount() {
    setError('');
    try {
      const res = await core.createAccount({ name: accountName });
      setAccountResult(`created: ${res.id}`);
    } catch (err) {
      setAccountResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handlePostExpense() {
    setError('');
    try {
      const res = await core.postExpense({
        accountId: '11111111-1111-1111-1111-111111111111',
        postedDate: '2026-03-07',
        effectiveDate: '2026-03-07',
        amount: '10.00',
        currency: 'USD',
        merchant: 'Debug Merchant',
      });
      setExpenseResult(`expense created: ${res.id}`);
    } catch (err) {
      setExpenseResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handlePostTransfer() {
    setError('');
    try {
      const res = await core.postTransfer({
        fromAccountId: '11111111-1111-1111-1111-111111111111',
        toAccountId: '22222222-2222-2222-2222-222222222222',
        postedDate: '2026-03-07',
        effectiveDate: '2026-03-07',
        amount: '5.00',
        currency: 'USD',
      });
      setTransferResult(`transfer created: ${res.ids.join(',')}`);
    } catch (err) {
      setTransferResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handlePostIncome() {
    setError('');
    try {
      const res = await core.postIncome({
        budgetPlanId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        accountId: '11111111-1111-1111-1111-111111111111',
        postedDate: '2026-03-07',
        effectiveDate: '2026-03-07',
        amount: '100.00',
        currency: 'USD',
        merchant: 'Debug Payroll',
      });
      setIncomeResult(`income created: ${res.id}`);
    } catch (err) {
      setIncomeResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleCreateBudgetPeriod() {
    setError('');
    try {
      const res = await core.createBudgetPeriod({
        planId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        year: 2026,
        month: 4,
        currency: 'USD',
      });
      setPeriodResult(`budget period created: ${res.id}`);
    } catch (err) {
      setPeriodResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleAllocateBudget() {
    setError('');
    try {
      await core.allocateBudget({
        periodId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      });
      setAllocateResult('budget allocated');
    } catch (err) {
      setAllocateResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleGetCategoryBalances() {
    setError('');
    try {
      const res = await core.getCategoryBalances({
        periodId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      });
      setBalancesResult(JSON.stringify(res.items, null, 2));
    } catch (err) {
      setBalancesResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleCreatePeriodReservations() {
    setError('');
    try {
      await core.createPeriodReservations({
        periodId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      });
      setReservationResult('period reservations created');
    } catch (err) {
      setReservationResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleGetPeriodReservations() {
    setError('');
    try {
      const res = await core.getPeriodReservations({
        periodId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      });
      setReservationsResult(JSON.stringify(res.items, null, 2));
    } catch (err) {
      setReservationsResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleSettleFirstReservation() {
    setError('');
    try {
      const res = await core.getPeriodReservations({
        periodId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      });
      const first = res.items[0];
      if (!first) {
        setReservationResult('no reservation to settle');
        return;
      }
      await core.settleReservation({
        reservationId: first.id,
        transactionId: crypto.randomUUID(),
      });
      setReservationResult(`reservation settled: ${first.id}`);
    } catch (err) {
      setReservationResult('');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <section className="card">
      <h1>Debug</h1>
      <p>Calls CorePlugin on native, web adapter in browser.</p>
      <p>
        Platform: <strong>{Capacitor.getPlatform()}</strong>
      </p>
      <div className="row">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="type a message"
        />
        <button type="button" onClick={handleCall}>
          Call core
        </button>
      </div>
      {result ? <pre className="result">{result}</pre> : null}
      <div className="row">
        <input
          value={accountName}
          onChange={(event) => setAccountName(event.target.value)}
          placeholder="account name"
        />
        <button type="button" onClick={handleCreateAccount}>
          Create account
        </button>
      </div>
      {accountResult ? <pre className="result">{accountResult}</pre> : null}
      <div className="row">
        <button type="button" onClick={handlePostExpense}>
          Post expense
        </button>
      </div>
      {expenseResult ? <pre className="result">{expenseResult}</pre> : null}
      <div className="row">
        <button type="button" onClick={handlePostTransfer}>
          Post transfer
        </button>
      </div>
      {transferResult ? <pre className="result">{transferResult}</pre> : null}
      <div className="row">
        <button type="button" onClick={handlePostIncome}>
          Post income
        </button>
      </div>
      {incomeResult ? <pre className="result">{incomeResult}</pre> : null}
      <div className="row">
        <button type="button" onClick={handleCreateBudgetPeriod}>
          Create budget period
        </button>
      </div>
      {periodResult ? <pre className="result">{periodResult}</pre> : null}
      <div className="row">
        <button type="button" onClick={handleAllocateBudget}>
          Allocate budget
        </button>
      </div>
      {allocateResult ? <pre className="result">{allocateResult}</pre> : null}
      <div className="row">
        <button type="button" onClick={handleGetCategoryBalances}>
          Get category balances
        </button>
      </div>
      {balancesResult ? <pre className="result">{balancesResult}</pre> : null}
      <div className="row">
        <button type="button" onClick={handleCreatePeriodReservations}>
          Create period reservations
        </button>
      </div>
      {reservationResult ? <pre className="result">{reservationResult}</pre> : null}
      <div className="row">
        <button type="button" onClick={handleGetPeriodReservations}>
          Get period reservations
        </button>
      </div>
      {reservationsResult ? <pre className="result">{reservationsResult}</pre> : null}
      <div className="row">
        <button type="button" onClick={handleSettleFirstReservation}>
          Settle first reservation
        </button>
      </div>
      {error ? <pre className="result error">{error}</pre> : null}
    </section>
  );
}
