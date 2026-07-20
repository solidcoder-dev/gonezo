import { describe, expect, it } from 'vitest';
import { buildNetWorthByCurrency } from './netWorthByCurrency';
import type { LedgerAccountItem, LedgerTransactionListItem } from './ledger.port';

function account(input: Partial<LedgerAccountItem>): LedgerAccountItem {
  return {
    id: 'acc-1',
    name: 'Account',
    type: 'cash',
    currency: 'EUR',
    status: 'active',
    ...input,
  };
}

function transaction(input: Partial<LedgerTransactionListItem>): LedgerTransactionListItem {
  return {
    id: 'tx-1',
    accountId: 'acc-1',
    type: 'income',
    status: 'posted',
    amount: '0.00',
    currency: 'EUR',
    occurredAt: '2026-01-01T00:00:00.000Z',
    items: [],
    ...input,
  };
}

describe('buildNetWorthByCurrency', () => {
  it('returns account counts, preferred currency metadata, and alphabetical non-preferred order', () => {
    const items = buildNetWorthByCurrency({
      accounts: [
        account({ id: 'usd-1', currency: 'USD' }),
        account({ id: 'eur-1', currency: 'EUR' }),
        account({ id: 'eur-2', currency: 'EUR' }),
        account({ id: 'brl-1', currency: 'BRL' }),
      ],
      transactions: [
        transaction({ id: 'usd-balance', accountId: 'usd-1', currency: 'USD', amount: '1.00' }),
        transaction({ id: 'eur-balance', accountId: 'eur-1', currency: 'EUR', amount: '1000.00' }),
      ],
      preferredCurrency: 'USD',
      now: new Date('2026-06-22T00:00:00.000Z'),
    });

    expect(items.map((item) => item.currency)).toEqual(['USD', 'BRL', 'EUR']);
    expect(items).toEqual(expect.arrayContaining([
      expect.objectContaining({ currency: 'USD', accountCount: 1, isPreferred: true }),
      expect.objectContaining({ currency: 'EUR', accountCount: 2, isPreferred: false }),
      expect.objectContaining({ currency: 'BRL', accountCount: 1, isPreferred: false }),
    ]));
  });

  it('preserves exact decimal addition for monetary balances', () => {
    const items = buildNetWorthByCurrency({
      accounts: [account({ id: 'eur-1' })],
      transactions: [
        transaction({ id: 'first', amount: '0.10' }),
        transaction({ id: 'second', amount: '0.20' }),
      ],
      now: new Date('2026-06-22T00:00:00.000Z'),
    });

    expect(items[0]?.balanceAmount).toBe('0.30');
  });

  it('builds balances and real monthly trend points from posted ledger transactions', () => {
    const items = buildNetWorthByCurrency({
      accounts: [account({ id: 'eur-1', currency: 'EUR' }), account({ id: 'usd-1', currency: 'USD' })],
      transactions: [
        transaction({ id: 'eur-opening', accountId: 'eur-1', amount: '100.00', occurredAt: '2026-01-03T00:00:00.000Z' }),
        transaction({ id: 'eur-expense', accountId: 'eur-1', type: 'expense', amount: '15.00', occurredAt: '2026-03-10T00:00:00.000Z' }),
        transaction({ id: 'eur-transfer-out', accountId: 'eur-1', type: 'transfer_out', amount: '10.00', occurredAt: '2026-04-01T00:00:00.000Z' }),
        transaction({ id: 'eur-transfer-in', accountId: 'eur-1', type: 'transfer_in', amount: '10.00', occurredAt: '2026-04-01T00:00:00.000Z' }),
        transaction({ id: 'usd-opening', accountId: 'usd-1', amount: '50.00', currency: 'USD', occurredAt: '2026-02-01T00:00:00.000Z' }),
        transaction({ id: 'eur-voided', accountId: 'eur-1', status: 'voided', amount: '999.00', occurredAt: '2026-05-01T00:00:00.000Z' }),
      ],
      now: new Date('2026-06-22T00:00:00.000Z'),
    });

    expect(items).toEqual([
      expect.objectContaining({
        currency: 'EUR',
        balanceAmount: '85.00',
        trend: [
          { period: '2026-01', periodKey: '2026-01', label: 'Jan', balanceAmount: '100.00' },
          { period: '2026-02', periodKey: '2026-02', label: 'Feb', balanceAmount: '100.00' },
          { period: '2026-03', periodKey: '2026-03', label: 'Mar', balanceAmount: '85.00' },
          { period: '2026-04', periodKey: '2026-04', label: 'Apr', balanceAmount: '85.00' },
          { period: '2026-05', periodKey: '2026-05', label: 'May', balanceAmount: '85.00' },
          { period: '2026-06', periodKey: '2026-06', label: 'Jun', balanceAmount: '85.00' },
        ],
      }),
      expect.objectContaining({
        currency: 'USD',
        balanceAmount: '50.00',
      }),
    ]);
  });

  it('keeps empty account currencies visible without inventing trend data', () => {
    const items = buildNetWorthByCurrency({
      accounts: [account({ id: 'gbp-1', currency: 'GBP' })],
      transactions: [],
      now: new Date('2026-06-22T00:00:00.000Z'),
    });

    expect(items).toEqual([expect.objectContaining({ currency: 'GBP', balanceAmount: '0.00', accountCount: 1 })]);
    expect(items[0]?.trend).toHaveLength(6);
  });

  it('counts archived accounts in the same currency balance read model', () => {
    const items = buildNetWorthByCurrency({
      accounts: [
        account({ id: 'active', status: 'active' }),
        account({ id: 'archived', status: 'archived' }),
      ],
      transactions: [],
      now: new Date('2026-06-22T00:00:00.000Z'),
    });

    expect(items).toEqual([expect.objectContaining({ currency: 'EUR', accountCount: 2 })]);
  });
});
