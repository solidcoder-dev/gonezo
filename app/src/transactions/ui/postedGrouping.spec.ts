import { describe, expect, it } from 'vitest';
import { formatCalendarDay, groupPostedTransactionsByDate } from './postedGrouping';
import type { TransactionHistoryItemView } from '../domain/transactionView.types';

function tx(input: Partial<TransactionHistoryItemView> & Pick<TransactionHistoryItemView, 'id' | 'occurredAt'>): TransactionHistoryItemView {
  return {
    id: input.id,
    accountId: input.accountId ?? 'acc-1',
    occurredAt: input.occurredAt,
    description: input.description,
    merchant: input.merchant,
    amount: input.amount ?? '1.00',
    currency: input.currency ?? 'USD',
    type: input.type ?? 'expense',
    status: input.status ?? 'posted',
    categoryId: input.categoryId,
    category: input.category,
    tags: input.tags,
    categorizationStatus: input.categorizationStatus,
    taggingStatus: input.taggingStatus,
    items: input.items ?? [],
  };
}

describe('postedGrouping', () => {
  it('groups posted transactions by local day and sorts each group by occurredAt desc', () => {
    const now = new Date('2026-04-12T12:00:00.000Z');
    const input = [
      tx({ id: 'tx-2', occurredAt: '2026-04-12T08:00:00.000Z' }),
      tx({ id: 'tx-1', occurredAt: '2026-04-12T09:00:00.000Z' }),
      tx({ id: 'tx-3', occurredAt: '2026-04-11T21:00:00.000Z' }),
    ];

    const grouped = groupPostedTransactionsByDate(input, now);

    expect(grouped).toHaveLength(2);
    expect(grouped[0].label).toBe('Today');
    expect(grouped[0].items.map((item) => item.id)).toEqual(['tx-1', 'tx-2']);
    expect(grouped[1].label).toBe('Yesterday');
    expect(grouped[1].items.map((item) => item.id)).toEqual(['tx-3']);
  });

  it('formats old dates without forcing today/yesterday labels', () => {
    const now = new Date('2026-04-12T12:00:00.000Z');

    const label = formatCalendarDay('2026-02-10T10:00:00.000Z', now);

    expect(label.trim().length).toBeGreaterThan(0);
    expect(label).not.toBe('Today');
    expect(label).not.toBe('Yesterday');
  });
});
