import { describe, expect, it } from 'vitest';
import { listWebLedgerTransactions } from './webLedgerQueries';
import type { WebLedgerTransaction } from '../../core/infrastructure/webAppState';

const transactions: WebLedgerTransaction[] = [
  {
    id: 'tx-1',
    accountId: 'account-1',
    type: 'expense',
    status: 'posted',
    amount: '12.50',
    currency: 'EUR',
    occurredAt: '2026-05-01T10:00:00.000Z',
    description: 'Team lunch',
    merchant: 'Cafe',
    categoryId: 'cat-food',
    items: [],
  },
  {
    id: 'tx-2',
    accountId: 'account-1',
    type: 'income',
    status: 'posted',
    amount: '1000.00',
    currency: 'EUR',
    occurredAt: '2026-05-03T10:00:00.000Z',
    description: 'Salary',
    merchant: 'Employer',
    categoryId: 'cat-income',
    items: [],
  },
  {
    id: 'tx-3',
    accountId: 'account-2',
    type: 'expense',
    status: 'posted',
    amount: '40.00',
    currency: 'USD',
    occurredAt: '2026-05-02T10:00:00.000Z',
    description: 'Other account',
    items: [],
  },
];

describe('listWebLedgerTransactions', () => {
  it('filters by account, taxonomy tags, text, amount, and dates', () => {
    const result = listWebLedgerTransactions(
      {
        accountId: 'account-1',
        filters: {
          text: 'lunch',
          tagIds: ['tag-food'],
          amountMin: '10',
          amountMax: '20',
          fromDate: '2026-05-01T00:00:00.000Z',
          toDate: '2026-05-02T00:00:00.000Z',
          statuses: ['posted'],
        },
      },
      transactions,
      new Map([
        ['tx-1', ['tag-food']],
        ['tx-2', ['tag-income']],
      ]),
    );

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toMatchObject({ id: 'tx-1', description: 'Team lunch' });
  });

  it('sorts and clamps pagination without mutating source transactions', () => {
    const result = listWebLedgerTransactions(
      {
        accountId: 'account-1',
        pagination: { page: 10, size: 1 },
        sort: [{ field: 'amount', direction: 'asc' }],
      },
      transactions,
      new Map(),
    );

    expect(result).toMatchObject({
      page: 1,
      size: 1,
      totalElements: 2,
      totalPages: 2,
      hasNext: false,
      hasPrevious: true,
    });
    expect(result.content[0]?.id).toBe('tx-2');
    expect(transactions.map((transaction) => transaction.id)).toEqual(['tx-1', 'tx-2', 'tx-3']);
  });
});
