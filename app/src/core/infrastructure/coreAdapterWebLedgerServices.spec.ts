import { describe, expect, it, vi } from 'vitest';
import type { CoreAdapterWebDependencies } from './coreAdapterWebEffects';
import { WebLedgerAccountService } from './coreAdapterWebLedgerAccountService';
import { WebLedgerTransactionService } from './coreAdapterWebLedgerTransactionService';
import { WebLedgerTransferService } from './coreAdapterWebLedgerTransferService';
import { createWebCoreState } from './coreAdapterWebState';

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

describe('web ledger focused services', () => {
  it('compose through shared state without depending on WebLedgerService', async () => {
    const state = createWebCoreState();
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
