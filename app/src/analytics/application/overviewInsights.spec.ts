import { describe, expect, it } from 'vitest';
import type { LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import { buildOverviewInsightsResult } from './overviewInsights';

function transaction(
  input: Partial<LedgerTransactionListItem> & Pick<LedgerTransactionListItem, 'id' | 'type' | 'amount' | 'currency'>,
): LedgerTransactionListItem {
  return {
    accountId: 'acc-1',
    status: 'posted',
    occurredAt: '2026-06-01T00:00:00.000Z',
    items: [],
    ...input,
  };
}

describe('overviewInsights', () => {
  it('builds the overview insights in the stable product order', () => {
    const result = buildOverviewInsightsResult({
      topTagsFact: {
        transactions: [],
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

    expect(result.items.map((item) => item.key)).toEqual([
      'topTags',
      'sharedExpenses',
      'mostSharedWith',
      'recurringImpact',
      'transfers',
    ]);
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
    });
  });
});
