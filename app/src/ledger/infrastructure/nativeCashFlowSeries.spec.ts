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
      ledgerListTransactions: vi.fn(async (input: { accountId: string }): Promise<LedgerListTransactionsResult> => {
        const content: LedgerListTransactionsResult['content'] = input.accountId === 'acc-archived'
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
          : [];
        return {
          content,
          page: 0,
          size: 500,
          totalElements: content.length,
          totalPages: content.length > 0 ? 1 : 0,
          hasNext: false,
          hasPrevious: false,
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
  });
});
