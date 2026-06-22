import { describe, expect, it, vi } from 'vitest';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import { WebLedgerService } from './webLedgerService';
import { createWebAppState } from '../../core/infrastructure/webAppState';

function createDependencies(): WebRuntimeDependencies {
  let next = 0;
  return {
    clock: {
      nowIso: () => '2026-05-26T09:00:00.000Z',
    },
    idGenerator: {
      nextId: () => {
        next += 1;
        return `id-${next}`;
      },
    },
    backupDownloader: {
      downloadJson: vi.fn(),
    },
  };
}

describe('WebLedgerService', () => {
  it('opens an account with an opening balance and reports account summary', async () => {
    const state = createWebAppState();
    const ledger = new WebLedgerService({ state, dependencies: createDependencies() });

    const opened = await ledger.openAccount({
      name: 'Cash',
      type: 'cash',
      currency: 'eur',
      openingBalanceAmount: '25.50',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(opened).toEqual({ id: 'id-1' });
    await expect(ledger.getAccountSummary({ accountId: opened.id })).resolves.toMatchObject({
      accountId: 'id-1',
      name: 'Cash',
      currency: 'EUR',
      balanceAmount: '25.50',
    });
    await expect(ledger.listTransactions({
      accountId: opened.id,
      filters: { statuses: ['posted'] },
      pagination: { page: 0, size: 10 },
    })).resolves.toMatchObject({
      content: [
        {
          id: 'id-2',
          type: 'income',
          amount: '25.50',
          description: 'Opening balance',
        },
      ],
    });
  });

  it('handles account lifecycle and delete cleanup for taxonomy tags and Mobills fingerprints', async () => {
    const state = createWebAppState();
    const ledger = new WebLedgerService({ state, dependencies: createDependencies() });
    const opened = await ledger.openAccount({
      name: 'Wallet',
      type: 'cash',
      currency: 'EUR',
    });
    const expense = await ledger.recordExpense({
      accountId: opened.id,
      amount: '8.30',
      currency: 'EUR',
      occurredAt: '2026-01-02T00:00:00.000Z',
      description: 'Lunch',
    });
    state.taxonomyTransactionTags.set(expense.id, ['tag-1']);
    state.mobillsImportFingerprintToTransactionId.set('fp-expense', expense.id);

    await ledger.renameAccount({ accountId: opened.id, name: 'Pocket' });
    await ledger.archiveAccount({ accountId: opened.id, archivedAt: '2026-02-01T00:00:00.000Z' });
    await expect(ledger.recordIncome({
      accountId: opened.id,
      amount: '10.00',
      currency: 'EUR',
      occurredAt: '2026-02-02T00:00:00.000Z',
    })).rejects.toThrow('Archived accounts cannot accept transactions');
    await ledger.restoreAccount({ accountId: opened.id });
    await ledger.deleteAccount({ accountId: opened.id });

    await expect(ledger.listAccounts()).resolves.toEqual({ items: [] });
    expect(state.ledgerTransactions).toEqual([]);
    expect(state.taxonomyTransactionTags.has(expense.id)).toBe(false);
    expect(state.mobillsImportFingerprintToTransactionId.has('fp-expense')).toBe(false);
  });

  it('records income, expense, transfers, FX transfers and linked voids', async () => {
    const state = createWebAppState();
    const ledger = new WebLedgerService({ state, dependencies: createDependencies() });
    const eurA = await ledger.openAccount({ name: 'EUR A', type: 'cash', currency: 'EUR' });
    const eurB = await ledger.openAccount({ name: 'EUR B', type: 'cash', currency: 'EUR' });
    const usd = await ledger.openAccount({ name: 'USD', type: 'cash', currency: 'USD' });

    await ledger.recordIncome({
      accountId: eurA.id,
      amount: '100.00',
      currency: 'EUR',
      occurredAt: '2026-03-01T00:00:00.000Z',
    });
    await ledger.recordExpense({
      accountId: eurA.id,
      amount: '12.00',
      currency: 'EUR',
      occurredAt: '2026-03-02T00:00:00.000Z',
    });
    const transfer = await ledger.recordTransfer({
      fromAccountId: eurA.id,
      toAccountId: eurB.id,
      amount: '20.00',
      currency: 'EUR',
      occurredAt: '2026-03-03T00:00:00.000Z',
    });
    const fxTransfer = await ledger.recordTransferFx({
      fromAccountId: eurA.id,
      toAccountId: usd.id,
      sourceAmount: '10.00',
      sourceCurrency: 'EUR',
      destinationAmount: '11.00',
      destinationCurrency: 'USD',
      exchangeRate: '1.1',
      occurredAt: '2026-03-04T00:00:00.000Z',
    });

    await expect(ledger.getAccountSummary({ accountId: eurA.id })).resolves.toMatchObject({
      balanceAmount: '58.00',
    });
    await expect(ledger.getAccountSummary({ accountId: eurB.id })).resolves.toMatchObject({
      balanceAmount: '20.00',
    });
    await expect(ledger.getAccountSummary({ accountId: usd.id })).resolves.toMatchObject({
      balanceAmount: '11.00',
    });

    await ledger.voidTransaction({ transactionId: transfer.transferOutId });
    await ledger.voidTransaction({ transactionId: fxTransfer.transferOutId });
    expect(state.ledgerTransactions.find((tx) => tx.id === transfer.transferOutId)?.status).toBe('voided');
    expect(state.ledgerTransactions.find((tx) => tx.id === transfer.transferInId)?.status).toBe('voided');
    expect(state.ledgerTransactions.find((tx) => tx.id === fxTransfer.transferOutId)?.status).toBe('voided');
    expect(state.ledgerTransactions.find((tx) => tx.id === fxTransfer.transferInId)?.status).toBe('voided');
  });

  it('aggregates total net worth by currency across accounts', async () => {
    const state = createWebAppState();
    const ledger = new WebLedgerService({ state, dependencies: createDependencies() });
    const eurA = await ledger.openAccount({
      name: 'Main EUR',
      type: 'cash',
      currency: 'EUR',
      openingBalanceAmount: '100.25',
    });
    await ledger.openAccount({
      name: 'Savings EUR',
      type: 'savings',
      currency: 'EUR',
      openingBalanceAmount: '200.75',
    });
    await ledger.openAccount({
      name: 'USD',
      type: 'cash',
      currency: 'USD',
      openingBalanceAmount: '50.10',
    });

    await ledger.recordExpense({
      accountId: eurA.id,
      amount: '10.30',
      currency: 'EUR',
      occurredAt: '2026-03-02T00:00:00.000Z',
    });

    await expect(ledger.getNetWorthByCurrency()).resolves.toEqual({
      items: [
        expect.objectContaining({
          currency: 'EUR',
          balanceAmount: '290.70',
          trend: expect.arrayContaining([expect.objectContaining({ balanceAmount: '290.70' })]),
        }),
        expect.objectContaining({
          currency: 'USD',
          balanceAmount: '50.10',
          trend: expect.arrayContaining([expect.objectContaining({ balanceAmount: '50.10' })]),
        }),
      ],
    });
  });

  it('orders net worth currencies by highest net balance', async () => {
    const state = createWebAppState();
    const ledger = new WebLedgerService({ state, dependencies: createDependencies() });

    await ledger.openAccount({
      name: 'EUR',
      type: 'cash',
      currency: 'EUR',
      openingBalanceAmount: '100.00',
    });
    await ledger.openAccount({
      name: 'USD',
      type: 'cash',
      currency: 'USD',
      openingBalanceAmount: '300.00',
    });
    await ledger.openAccount({
      name: 'GBP',
      type: 'cash',
      currency: 'GBP',
      openingBalanceAmount: '200.00',
    });

    await expect(ledger.getNetWorthByCurrency()).resolves.toEqual({
      items: [
        expect.objectContaining({ currency: 'USD', balanceAmount: '300.00' }),
        expect.objectContaining({ currency: 'GBP', balanceAmount: '200.00' }),
        expect.objectContaining({ currency: 'EUR', balanceAmount: '100.00' }),
      ],
    });
  });

  it('passes the cash flow period offset to the series builder', async () => {
    const state = createWebAppState();
    const ledger = new WebLedgerService({ state, dependencies: createDependencies() });
    const currentYear = new Date().getUTCFullYear();
    const firstYear = currentYear - 9;
    const lastYear = currentYear - 5;

    await ledger.openAccount({
      name: 'EUR',
      type: 'cash',
      currency: 'EUR',
      openingBalanceAmount: '100.00',
    });

    await expect(ledger.getCashFlowSeries({
      currency: 'EUR',
      granularity: 'yearly',
      periodOffset: -1,
    })).resolves.toMatchObject({
      window: {
        label: `${firstYear} - ${lastYear}`,
        periodOffset: -1,
        canGoNext: true,
      },
      points: [
        { periodKey: String(firstYear) },
        { periodKey: String(firstYear + 1) },
        { periodKey: String(firstYear + 2) },
        { periodKey: String(firstYear + 3) },
        { periodKey: String(lastYear) },
      ],
    });
  });

  it('creates draft transactions, validates item totals and posts drafts', async () => {
    const state = createWebAppState();
    const ledger = new WebLedgerService({ state, dependencies: createDependencies() });
    const opened = await ledger.openAccount({ name: 'Cash', type: 'cash', currency: 'EUR' });
    const draft = await ledger.createExpenseDraft({
      accountId: opened.id,
      amount: '15.00',
      currency: 'EUR',
      occurredAt: '2026-04-01T00:00:00.000Z',
      description: 'Groceries',
    });

    await ledger.addTransactionItem({
      transactionId: draft.id,
      name: 'Bread',
      amount: '5.00',
      currency: 'EUR',
    });
    await expect(ledger.postDraftTransaction({ transactionId: draft.id })).rejects.toThrow('sum(items) must match transaction amount');
    await ledger.addTransactionItem({
      transactionId: draft.id,
      name: 'Fruit',
      amount: '10.00',
      currency: 'EUR',
    });
    await ledger.postDraftTransaction({ transactionId: draft.id });

    expect(state.ledgerTransactions.find((tx) => tx.id === draft.id)).toMatchObject({
      status: 'posted',
      items: [
        { name: 'Bread', amount: '5.00' },
        { name: 'Fruit', amount: '10.00' },
      ],
    });
  });
});
