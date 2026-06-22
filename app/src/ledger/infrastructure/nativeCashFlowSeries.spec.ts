import { describe, expect, it, vi } from 'vitest';
import type { LedgerListTransactionsResult } from '../application/ledger.port';
import { getNativeCashFlowSeries } from './nativeCashFlowSeries';

describe('getNativeCashFlowSeries', () => {
  it('passes the requested period offset into the cash flow series', async () => {
    const currentYear = new Date().getUTCFullYear();
    const firstYear = currentYear - 9;
    const lastYear = currentYear - 5;
    const reader = {
      ledgerListAccounts: vi.fn(async () => ({
        items: [
          { id: 'acc-1', name: 'Main', type: 'cash', currency: 'EUR', status: 'active' },
          { id: 'acc-archived', name: 'Old', type: 'cash', currency: 'EUR', status: 'archived' },
        ],
      })),
      ledgerListTransactions: vi.fn(async (input: { accountId: string; pagination?: { page?: number; size?: number } }): Promise<LedgerListTransactionsResult> => {
        const page = input.pagination?.page ?? 0;
        const content: LedgerListTransactionsResult['content'] = input.accountId === 'acc-archived'
          ? page === 1
            ? [
                {
                  id: 'tx-2019',
                  accountId: 'acc-archived',
                  type: 'expense',
                  status: 'posted',
                  amount: '42.00',
                  currency: 'EUR',
                  occurredAt: `${firstYear + 2}-06-01T00:00:00.000Z`,
                  items: [],
                },
              ]
            : [
                {
                  id: 'tx-newer',
                  accountId: 'acc-archived',
                  type: 'expense',
                  status: 'posted',
                  amount: '10.00',
                  currency: 'EUR',
                  occurredAt: `${lastYear + 1}-06-01T00:00:00.000Z`,
                  items: [],
                },
              ]
          : [];
        return {
          content,
          page,
          size: input.pagination?.size ?? 100,
          totalElements: input.accountId === 'acc-archived' ? 101 : 0,
          totalPages: input.accountId === 'acc-archived' ? 2 : 0,
          hasNext: input.accountId === 'acc-archived' && page === 0,
          hasPrevious: page > 0,
        };
      }),
    };

    const result = await getNativeCashFlowSeries(reader, {
      currency: 'EUR',
      granularity: 'yearly',
      periodOffset: -1,
    });

    expect(result).toMatchObject({
      window: {
        label: `${firstYear} - ${lastYear}`,
        periodOffset: -1,
        canGoNext: true,
      },
    });
    expect(result.points.find((point) => point.periodKey === String(firstYear + 2))).toMatchObject({
      expenseAmount: '42.00',
    });
    expect(reader.ledgerListTransactions).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acc-archived',
      pagination: { page: 1, size: 100 },
    }));
  });
});
