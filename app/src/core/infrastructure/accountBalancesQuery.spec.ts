import { describe, expect, it, vi } from 'vitest';
import type { LedgerListTransactionsResult } from '../../ledger/application/ledger.port';
import { listAccountBalances } from './accountBalancesQuery';

describe('listAccountBalances', () => {
  it('adds real balance trend data per account from posted transactions', async () => {
    const port = {
      preferencesGet: vi.fn(async () => ({ defaultAccountId: 'acc-1' })),
      ledgerListAccounts: vi.fn(async () => ({
        items: [
          { id: 'acc-1', name: 'Wallet', type: 'cash', currency: 'EUR', status: 'active' },
        ],
      })),
      ledgerGetAccountSummary: vi.fn(async () => ({
        accountId: 'acc-1',
        name: 'Wallet',
        type: 'cash',
        currency: 'EUR',
        balanceAmount: '80.00',
      })),
      ledgerListTransactions: vi.fn(async (): Promise<LedgerListTransactionsResult> => ({
        content: [
          {
            id: 'tx-income',
            accountId: 'acc-1',
            type: 'income',
            status: 'posted',
            amount: '100.00',
            currency: 'EUR',
            occurredAt: '2026-01-01T00:00:00.000Z',
            items: [],
          },
          {
            id: 'tx-expense',
            accountId: 'acc-1',
            type: 'expense',
            status: 'posted',
            amount: '20.00',
            currency: 'EUR',
            occurredAt: '2026-02-01T00:00:00.000Z',
            items: [],
          },
        ],
        page: 0,
        size: 100,
        totalElements: 2,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      })),
    };

    const result = await listAccountBalances(port);

    expect(result.items).toEqual([
      expect.objectContaining({
        accountId: 'acc-1',
        balanceAmount: '80.00',
        trend: expect.arrayContaining([expect.objectContaining({ balanceAmount: '80.00' })]),
      }),
    ]);
    expect(port.ledgerListTransactions).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acc-1',
      filters: { statuses: ['posted'] },
    }));
  });
});
