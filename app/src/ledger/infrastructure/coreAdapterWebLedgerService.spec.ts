import { describe, expect, it, vi } from 'vitest';
import type { CoreAdapterWebDependencies } from '../../core/infrastructure/coreAdapterWebEffects';
import { WebLedgerService } from './coreAdapterWebLedgerService';
import { createWebCoreState } from '../../core/infrastructure/coreAdapterWebState';

function createDependencies(): CoreAdapterWebDependencies {
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
    const state = createWebCoreState();
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
    const state = createWebCoreState();
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
    const state = createWebCoreState();
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

  it('creates draft transactions, validates item totals and posts drafts', async () => {
    const state = createWebCoreState();
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
