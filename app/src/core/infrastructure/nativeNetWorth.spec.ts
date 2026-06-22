import { describe, expect, it, vi } from 'vitest';
import type { LedgerListTransactionsResult } from '../../ledger/application/ledger.port';
import { getNativeNetWorthByCurrency } from './nativeNetWorth';

describe('getNativeNetWorthByCurrency', () => {
  it('builds real currency trends from paged native ledger transactions', async () => {
    const reader = {
      ledgerListAccounts: vi.fn(async () => ({
        items: [
          { id: 'acc-eur', name: 'EUR', type: 'cash', currency: 'EUR', status: 'active' },
          { id: 'acc-usd', name: 'USD', type: 'cash', currency: 'USD', status: 'active' },
        ],
      })),
      ledgerListTransactions: vi.fn(async (input: { accountId: string; pagination?: { page?: number; size?: number } }): Promise<LedgerListTransactionsResult> => {
        const page = input.pagination?.page ?? 0;
        const content: LedgerListTransactionsResult['content'] = input.accountId === 'acc-eur'
          ? page === 0
            ? [
                {
                  id: 'tx-eur-opening',
                  accountId: 'acc-eur',
                  type: 'income',
                  status: 'posted',
                  amount: '100.00',
                  currency: 'EUR',
                  occurredAt: '2026-01-01T00:00:00.000Z',
                  items: [],
                },
              ]
            : [
                {
                  id: 'tx-eur-expense',
                  accountId: 'acc-eur',
                  type: 'expense',
                  status: 'posted',
                  amount: '12.00',
                  currency: 'EUR',
                  occurredAt: '2026-02-01T00:00:00.000Z',
                  items: [],
                },
              ]
          : [
              {
                id: 'tx-usd-opening',
                accountId: 'acc-usd',
                type: 'income',
                status: 'posted',
                amount: '50.00',
                currency: 'USD',
                occurredAt: '2026-01-01T00:00:00.000Z',
                items: [],
              },
            ];
        return {
          content,
          page,
          size: input.pagination?.size ?? 100,
          totalElements: input.accountId === 'acc-eur' ? 101 : 1,
          totalPages: input.accountId === 'acc-eur' ? 2 : 1,
          hasNext: input.accountId === 'acc-eur' && page === 0,
          hasPrevious: page > 0,
        };
      }),
    };

    const result = await getNativeNetWorthByCurrency(reader, 'acc-usd');

    expect(result.items[0]).toEqual(expect.objectContaining({
      currency: 'USD',
      balanceAmount: '50.00',
      trend: expect.arrayContaining([expect.objectContaining({ balanceAmount: '50.00' })]),
    }));
    expect(result.items[1]).toEqual(expect.objectContaining({
      currency: 'EUR',
      balanceAmount: '88.00',
    }));
    expect(reader.ledgerListTransactions).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acc-eur',
      pagination: { page: 1, size: 100 },
    }));
  });
});
