import { describe, expect, it } from 'vitest';
import type { LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import { buildOverviewInsightsResult } from './overviewInsights';

type TestTransaction = LedgerTransactionListItem & { analyticsPersonalAmount?: string };

function transaction(
  input: Partial<TestTransaction> & Pick<LedgerTransactionListItem, 'id' | 'type' | 'amount' | 'currency'>,
): TestTransaction {
  return {
    accountId: 'acc-1',
    status: 'posted',
    occurredAt: '2026-06-01T00:00:00.000Z',
    items: [],
    ...input,
  };
}

describe('overviewInsights', () => {
  it('omits empty overview insights while preserving the stable product order', () => {
    const result = buildOverviewInsightsResult({
      topTagsFact: {
        transactions: [],
      },
      sharingInsights: [],
      recurringInsight: undefined,
      transferTransactions: [],
      currency: 'EUR',
    });

    expect(result.items).toEqual([]);
  });

  it('uses taxonomy assignments as the source of truth for top tags', () => {
    const result = buildOverviewInsightsResult({
      topTagsFact: {
        transactions: [
          transaction({
            id: 'expense-trip',
            type: 'expense',
            amount: '120.00',
            currency: 'EUR',
          }),
        ],
        taxonomyAssignments: [
          { transactionId: 'expense-trip', tagIds: ['tag-trip'] },
        ],
        tags: [
          { id: 'tag-trip', name: 'Trip', status: 'active' },
        ],
      },
      sharingInsights: [
        { key: 'sharedExpenses', title: 'Shared expenses', subtitle: '0 shared', amount: '0.00' },
        { key: 'mostSharedWith', title: 'Most shared with', subtitle: 'No data', amount: '0.00' },
      ],
      recurringInsight: {
        key: 'recurringImpact',
        title: 'Recurring impact',
        subtitle: '0 recurring',
        amount: '0.00',
      },
      transferTransactions: [],
      currency: 'EUR',
    });

    expect(result.items[0]).toEqual({
      key: 'topTags',
      title: 'Top tags',
      subtitle: '1 tag',
      amount: '120.00',
      filterIntent: 'topTags',
      tagIds: ['tag-trip'],
    });
  });

  it('ranks with the personal analytical amount and keeps tag overlap non-reconciling', () => {
    const result = buildOverviewInsightsResult({
      topTagsFact: {
        transactions: [
          transaction({ id: 'expense-shared', type: 'expense', amount: '0.30', analyticsPersonalAmount: '0.10', currency: 'EUR' }),
          transaction({ id: 'expense-personal', type: 'expense', amount: '0.70', analyticsPersonalAmount: '0.20', currency: 'EUR' }),
        ],
        taxonomyAssignments: [
          { transactionId: 'expense-shared', tagIds: ['tag-a', 'tag-b'] },
          { transactionId: 'expense-personal', tagIds: ['tag-a', 'tag-b'] },
        ],
        tags: [
          { id: 'tag-a', name: 'A', status: 'active' },
          { id: 'tag-b', name: 'B', status: 'active' },
        ],
      },
      sharingInsights: [],
      transferTransactions: [],
      currency: 'EUR',
    });

    expect(result.items[0]).toMatchObject({ amount: '0.60', tagIds: ['tag-a', 'tag-b'] });
    expect(result.items[0].amount).not.toBe('0.30');
  });
});
