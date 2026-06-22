import { describe, expect, it } from 'vitest';
import type { TransactionHistoryItemView } from '../../../transactions/application/transactionView.types';
import type { ExpectedMovementView, ScheduledMovementView } from '../../application/movementsView.types';
import {
  buildPostedMovementRowData,
  buildExpectedMovementDetailData,
  buildPostedMovementDetailData,
  buildScheduledMovementDetailData,
} from './monthlyMovementPresentation';

function posted(input: Partial<TransactionHistoryItemView> = {}): TransactionHistoryItemView {
  return {
    id: 'tx-1',
    accountId: 'account-1',
    occurredAt: '2026-01-15T12:00:00',
    merchant: 'Cafe',
    description: '',
    amount: '12.50',
    currency: 'USD',
    type: 'expense',
    status: 'posted',
    category: { id: 'cat-food', name: 'Food' },
    tags: [{ id: 'tag-work', name: 'work' }],
    items: [{ id: 'item-1', name: 'Coffee', amount: '12.50' }],
    ...input,
  };
}

function expected(input: Partial<ExpectedMovementView> = {}): ExpectedMovementView {
  return {
    id: 'expected-1',
    accountId: 'account-1',
    type: 'income',
    amount: '100.00',
    currency: 'USD',
    expectedAt: '2026-02-01T09:00:00',
    merchant: 'Client',
    splitItems: [],
    status: 'pending',
    createdAt: '2026-01-01T00:00:00',
    updatedAt: '2026-01-01T00:00:00',
    ...input,
  };
}

function scheduled(input: Partial<ScheduledMovementView> = {}): ScheduledMovementView {
  return {
    id: 'scheduled-1',
    type: 'transfer',
    sourceAccountId: 'account-1',
    targetAccountId: 'account-2',
    amount: '50.00',
    currency: 'USD',
    description: 'Move cash',
    status: 'active',
    startAt: '2026-03-01T09:00:00',
    nextDueAt: '2026-03-10T09:00:00',
    zoneId: 'UTC',
    generatedOccurrences: 0,
    splitItems: [{ id: 'split-1', name: 'Principal', amount: '50.00' }],
    rule: { frequency: 'monthly', interval: 1 },
    recurrenceEnd: { kind: 'never' },
    scheduleKind: 'one_shot',
    tagNames: ['cash', 'monthly', 'extra'],
    ...input,
  };
}

describe('monthly movement detail builders', () => {
  const now = new Date('2026-05-14T00:00:00');

  it('builds posted row data with account metadata as the primary detail', () => {
    const data = buildPostedMovementRowData(posted({ accountName: 'Main wallet' }));

    expect(data.details).toEqual([
      { key: 'account', value: 'Main wallet', primary: true },
      'Food',
      '#work',
    ]);
  });

  it('renders transfer in movements with transfer styling and a positive sign', () => {
    const data = buildPostedMovementRowData(posted({ type: 'transfer_in' }));

    expect(data.itemClassName).toBe('expense-item expense-item--transfer');
    expect(data.iconClassName).toBe('bi bi-arrow-left-right');
    expect(data.amount.sign).toBe('+');
    expect(data.amount.className).toBe('movement-amount movement-amount--transfer');
  });

  it('builds posted transaction detail data', () => {
    const data = buildPostedMovementDetailData(posted(), { now });

    expect(data.title).toBe('Cafe');
    expect(data.kicker).toBe('Expense');
    expect(data.iconClassName).toBe('bi bi-arrow-down-right');
    expect(data.amount).toEqual({ kind: 'expense', sign: '-', value: '12.50', currency: 'USD' });
    expect(data.meta).toEqual([
      { label: 'Date', value: '15 ene' },
      { label: 'Category', value: 'Food' },
      { label: 'Tags', value: '#work' },
      { label: 'Status', value: 'posted' },
    ]);
    expect(data.splitItems).toEqual([{ id: 'item-1', name: 'Coffee', amount: '12.50' }]);
  });

  it('builds expected movement detail data', () => {
    const data = buildExpectedMovementDetailData(expected({ originOccurrenceId: 'occ-1' }), {
      categoryName: 'Income',
      now,
    });

    expect(data.title).toBe('Client');
    expect(data.kicker).toBe('Expected');
    expect(data.amount.kind).toBe('scheduled');
    expect(data.amount.sign).toBe('+');
    expect(data.meta).toEqual([
      { label: 'Expected', value: '1 feb' },
      { label: 'Category', value: 'Income' },
      { label: 'Origin', value: 'recurring' },
      { label: 'Status', value: 'pending' },
    ]);
  });

  it('builds scheduled movement detail data', () => {
    const data = buildScheduledMovementDetailData(scheduled(), {
      categoryName: 'Transfers',
      tagNames: ['cash', 'monthly', 'extra'],
      now,
    });

    expect(data.title).toBe('Move cash');
    expect(data.kicker).toBe('Scheduled');
    expect(data.amount.kind).toBe('scheduled');
    expect(data.meta).toEqual([
      { label: 'Due', value: '10 mar' },
      { label: 'Origin', value: 'one-shot' },
      { label: 'Category', value: 'Transfers' },
      { label: 'Tags', value: '#cash #monthly +1' },
      { label: 'Status', value: 'scheduled' },
    ]);
  });
});
