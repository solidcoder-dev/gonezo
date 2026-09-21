import { describe, expect, it, vi } from 'vitest';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import { WebLedgerAccountService } from './webLedgerAccountService';
import { WebLedgerTransactionService } from './webLedgerTransactionService';
import { WebLedgerTransferService } from './webLedgerTransferService';
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

describe('web ledger focused services', () => {
  it('normalizes all canonical account types and rejects unsupported values', async () => {
    const state = createWebAppState();
    const accounts = new WebLedgerAccountService({ state, dependencies: createDependencies() });
    for (const type of ['bank', 'cash', 'card', 'wallet', 'savings', 'other'] as const) {
      const account = await accounts.openAccount({ name: type, type, currency: 'EUR' });
      expect(state.ledgerAccounts.find((item) => item.id === account.id)?.type).toBe(type);
    }
    const normalized = await accounts.openAccount({ name: 'Uppercase bank', type: 'BANK' as 'bank', currency: 'EUR' });
    expect(state.ledgerAccounts.find((item) => item.id === normalized.id)?.type).toBe('bank');
    await expect(accounts.openAccount({ name: 'Unsupported', type: 'crypto' as 'other', currency: 'EUR' })).rejects.toThrow('Unsupported account type');
  });

  it('keeps opening balances and account totals exact beyond currency minor units', async () => {
    const state = createWebAppState();
    const dependencies = createDependencies();
    const accounts = new WebLedgerAccountService({ state, dependencies });
    const transactions = new WebLedgerTransactionService({ state, dependencies });
    const positive = await accounts.openAccount({ name: 'Positive', currency: 'EUR', openingBalanceAmount: '10.005' });
    const negative = await accounts.openAccount({ name: 'Negative', currency: 'EUR', openingBalanceAmount: '-10.005' });
    const precise = await accounts.openAccount({ name: 'Precise', currency: 'EUR' });
    await transactions.recordIncome({ accountId: precise.id, amount: '0.1', currency: 'EUR', occurredAt: '2026-05-01T00:00:00.000Z' });
    await transactions.recordIncome({ accountId: precise.id, amount: '0.2', currency: 'EUR', occurredAt: '2026-05-02T00:00:00.000Z' });

    await expect(accounts.getAccountSummary({ accountId: positive.id })).resolves.toMatchObject({ balanceAmount: '10.005' });
    await expect(accounts.getAccountSummary({ accountId: negative.id })).resolves.toMatchObject({ balanceAmount: '-10.005' });
    await expect(accounts.getAccountSummary({ accountId: precise.id })).resolves.toMatchObject({ balanceAmount: '0.30' });
  });

  it('characterizes posted balance signs, opening balance transactions, and archived accounts', async () => {
    const state = createWebAppState();
    const dependencies = createDependencies();
    const accounts = new WebLedgerAccountService({ state, dependencies });
    const transactions = new WebLedgerTransactionService({ state, dependencies });
    const account = await accounts.openAccount({ name: 'Archived wallet', type: 'cash', currency: 'EUR', openingBalanceAmount: '10.00' });
    const zero = await accounts.openAccount({ name: 'Zero wallet', type: 'cash', currency: 'EUR' });
    await transactions.recordExpense({ accountId: account.id, amount: '3.00', currency: 'EUR', occurredAt: '2026-05-01T00:00:00.000Z' });
    state.ledgerTransactions.push(
      { id: 'transfer-in', accountId: account.id, type: 'transfer_in', status: 'posted', amount: '2.00', currency: 'EUR', occurredAt: '2026-05-02T00:00:00.000Z', items: [] },
      { id: 'transfer-out', accountId: account.id, type: 'transfer_out', status: 'posted', amount: '1.00', currency: 'EUR', occurredAt: '2026-05-03T00:00:00.000Z', items: [] },
      { id: 'draft', accountId: account.id, type: 'income', status: 'draft', amount: '500.00', currency: 'EUR', occurredAt: '2026-05-04T00:00:00.000Z', items: [] },
      { id: 'voided', accountId: account.id, type: 'income', status: 'voided', amount: '500.00', currency: 'EUR', occurredAt: '2026-05-05T00:00:00.000Z', items: [] },
    );
    await accounts.archiveAccount({ accountId: account.id });

    await expect(accounts.getAccountSummary({ accountId: account.id })).resolves.toMatchObject({ balanceAmount: '8.00' });
    await expect(accounts.getAccountSummary({ accountId: zero.id })).resolves.toMatchObject({ balanceAmount: '0.00' });
    expect(state.ledgerTransactions.find((transaction) => transaction.description === 'Opening balance')).toMatchObject({ type: 'income', status: 'posted', amount: '10' });
  });

  it('compose through shared state without depending on WebLedgerService', async () => {
    const state = createWebAppState();
    const dependencies = createDependencies();
    const accounts = new WebLedgerAccountService({ state, dependencies });
    const transactions = new WebLedgerTransactionService({ state, dependencies });
    const transfers = new WebLedgerTransferService({ state, dependencies });

    const wallet = await accounts.openAccount({ name: 'Wallet', type: 'cash', currency: 'EUR' });
    const savings = await accounts.openAccount({ name: 'Savings', type: 'cash', currency: 'EUR' });
    await transactions.recordIncome({
      accountId: wallet.id,
      amount: '50.00',
      currency: 'EUR',
      occurredAt: '2026-05-01T00:00:00.000Z',
    });
    const transfer = await transfers.recordTransfer({
      fromAccountId: wallet.id,
      toAccountId: savings.id,
      amount: '20.00',
      currency: 'EUR',
      occurredAt: '2026-05-02T00:00:00.000Z',
    });

    await expect(accounts.getAccountSummary({ accountId: wallet.id })).resolves.toMatchObject({
      balanceAmount: '30.00',
    });
    await expect(accounts.getAccountSummary({ accountId: savings.id })).resolves.toMatchObject({
      balanceAmount: '20.00',
    });
    await expect(transactions.listTransactions({
      accountId: wallet.id,
      filters: { statuses: ['posted'] },
      pagination: { page: 0, size: 10 },
    })).resolves.toMatchObject({
      content: [
        {
          id: transfer.transferOutId,
          type: 'transfer_out',
        },
        {
          id: 'id-3',
          type: 'income',
        },
      ],
    });
  });
});
