import { describe, expect, it } from 'vitest';
import { buildCashFlowSeries } from './cashFlowSeries';
import type { LedgerTransactionListItem } from './ledger.port';

function transaction(input: Partial<LedgerTransactionListItem> & Pick<LedgerTransactionListItem, 'id' | 'accountId' | 'type' | 'amount' | 'currency' | 'occurredAt'>): LedgerTransactionListItem {
  return {
    status: 'posted',
    description: '',
    items: [],
    ...input,
  };
}

describe('buildCashFlowSeries', () => {
  const accounts = [
    { id: 'acc-eur-1', name: 'Main', type: 'cash', currency: 'EUR', status: 'active' },
    { id: 'acc-eur-2', name: 'Savings', type: 'cash', currency: 'EUR', status: 'active' },
    { id: 'acc-usd', name: 'USD', type: 'cash', currency: 'USD', status: 'active' },
    { id: 'acc-archived', name: 'Old', type: 'cash', currency: 'GBP', status: 'archived' },
  ];

  it('groups posted income and expenses by selected currency without mixing other currencies', () => {
    const result = buildCashFlowSeries({
      accounts,
      transactions: [
        transaction({ id: 'income-1', accountId: 'acc-eur-1', type: 'income', amount: '1000', currency: 'EUR', occurredAt: '2026-06-01T10:00:00.000Z' }),
        transaction({ id: 'expense-1', accountId: 'acc-eur-2', type: 'expense', amount: '250', currency: 'EUR', occurredAt: '2026-06-02T10:00:00.000Z' }),
        transaction({ id: 'usd-1', accountId: 'acc-usd', type: 'income', amount: '999', currency: 'USD', occurredAt: '2026-06-02T10:00:00.000Z' }),
        transaction({ id: 'transfer-1', accountId: 'acc-eur-1', type: 'transfer_out', amount: '75', currency: 'EUR', occurredAt: '2026-06-03T10:00:00.000Z' }),
        transaction({ id: 'voided-1', accountId: 'acc-eur-1', type: 'expense', status: 'voided', amount: '500', currency: 'EUR', occurredAt: '2026-06-04T10:00:00.000Z' }),
      ],
      currency: 'EUR',
      granularity: 'monthly',
      now: new Date('2026-06-17T12:00:00.000Z'),
    });

    expect(result.currencies).toEqual(['EUR', 'GBP', 'USD']);
    expect(result.selectedCurrency).toBe('EUR');
    expect(result.totals).toEqual({ incomeAmount: '1000.00', expenseAmount: '250.00' });
    expect(result.points.at(-1)).toMatchObject({
      periodKey: '2026-06',
      incomeAmount: '1000.00',
      expenseAmount: '250.00',
    });
  });

  it('keeps period order ascending for chart axes', () => {
    const result = buildCashFlowSeries({
      accounts,
      transactions: [],
      currency: 'EUR',
      granularity: 'yearly',
      now: new Date('2026-06-17T12:00:00.000Z'),
    });

    expect(result.points.map((point) => point.periodKey)).toEqual(['2022', '2023', '2024', '2025', '2026']);
  });

  it('moves the visible window by granularity-sized ranges', () => {
    const result = buildCashFlowSeries({
      accounts,
      transactions: [],
      currency: 'EUR',
      granularity: 'monthly',
      periodOffset: -1,
      now: new Date('2026-06-17T12:00:00.000Z'),
    });

    expect(result.window).toEqual({
      label: 'Jul 2025 - Dec 2025',
      periodOffset: -1,
      canGoNext: true,
    });
    expect(result.points.map((point) => point.periodKey)).toEqual([
      '2025-07',
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
    ]);
  });

  it('does not allow navigating after the current window', () => {
    const result = buildCashFlowSeries({
      accounts,
      transactions: [],
      currency: 'EUR',
      granularity: 'weekly',
      periodOffset: 0,
      now: new Date('2026-06-17T12:00:00.000Z'),
    });

    expect(result.window.canGoNext).toBe(false);
  });

  it('includes historical movements from archived accounts', () => {
    const result = buildCashFlowSeries({
      accounts,
      transactions: [
        transaction({
          id: 'archived-2019',
          accountId: 'acc-archived',
          type: 'expense',
          amount: '99',
          currency: 'GBP',
          occurredAt: '2019-06-10T10:00:00.000Z',
        }),
      ],
      currency: 'GBP',
      granularity: 'yearly',
      periodOffset: -1,
      now: new Date('2026-06-17T12:00:00.000Z'),
    });

    expect(result.currencies).toContain('GBP');
    expect(result.points.find((point) => point.periodKey === '2019')).toMatchObject({
      expenseAmount: '99.00',
    });
  });
});
