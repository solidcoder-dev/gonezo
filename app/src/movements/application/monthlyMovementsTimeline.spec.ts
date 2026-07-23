import { describe, expect, it } from 'vitest';
import type { TransactionHistoryItemView } from '../../transactions/application/transactionView.types';
import type { ExpectedMovementView, ScheduledMovementView } from './movementsView.types';
import { buildMonthlyTimelineViewModel } from './monthlyMovementsTimeline';

function posted(overrides: Partial<TransactionHistoryItemView> = {}): TransactionHistoryItemView {
  return {
    id: 'posted-1',
    accountId: 'account-1',
    occurredAt: '2026-08-03T10:00:00.000Z',
    description: 'Groceries',
    merchant: 'Groceries',
    amount: '12.50',
    currency: 'EUR',
    type: 'expense',
    status: 'posted',
    items: [],
    accountName: 'BBVA',
    category: { id: 'category-1', name: 'Groceries' },
    ...overrides,
  };
}

function expected(overrides: Partial<ExpectedMovementView> = {}): ExpectedMovementView {
  return {
    id: 'expected-1',
    accountId: 'account-1',
    accountName: 'BBVA',
    type: 'expense',
    amount: '625.37',
    currency: 'EUR',
    expectedAt: '2026-08-01T09:00:00.000Z',
    description: 'Rent',
    merchant: 'Rent',
    categoryId: 'category-2',
    origin: { kind: 'manual' },
    splitItems: [],
    status: 'pending',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function scheduled(overrides: Partial<ScheduledMovementView> = {}): ScheduledMovementView {
  return {
    id: 'scheduled-1',
    sourceAccountId: 'account-1',
    accountName: 'BBVA',
    type: 'expense',
    amount: '55.00',
    currency: 'EUR',
    description: 'Gym',
    merchant: 'Gym',
    status: 'active',
    startAt: '2026-08-01T00:00:00.000Z',
    nextDueAt: '2026-08-01T10:00:00.000Z',
    zoneId: 'UTC',
    generatedOccurrences: 0,
    splitItems: [],
    rule: { frequency: 'monthly', interval: 1, monthlyPattern: 'day_of_month', dayOfMonth: 1 },
    recurrenceEnd: { kind: 'never' },
    categoryId: 'category-3',
    ...overrides,
  };
}

const options = {
  categoryLabelById: new Map([
    ['category-2', 'Bills'],
    ['category-3', 'Health'],
  ]),
  tagLabelById: new Map([
    ['tag-shopping', 'Shopping'],
  ]),
  includeScheduled: true,
};

describe('buildMonthlyTimelineViewModel', () => {
  it('maps posted movements with reduced metadata and newest date groups first', () => {
    const result = buildMonthlyTimelineViewModel([
      posted({ id: 'posted-older', occurredAt: '2026-08-01T10:00:00.000Z' }),
      posted({ id: 'posted-newer', occurredAt: '2026-08-03T10:00:00.000Z' }),
    ], [], [], options);

    expect(result.postedGroups.map((group) => group.dateKey)).toEqual(['2026-8-3', '2026-8-1']);
    expect(result.postedGroups[0].items[0].metadata).toEqual(['BBVA', 'Groceries']);
    expect(result.postedGroups[0].items[0].amountLabel).toBe('€12.50');
  });

  it('includes posted movement tags after account and category metadata', () => {
    const result = buildMonthlyTimelineViewModel([
      posted({ tags: [{ id: 'tag-coffee', name: 'Coffee' }] }),
    ], [], [], options);

    expect(result.postedGroups[0].items[0].metadata).toEqual(['BBVA', 'Groceries', 'Coffee']);
  });

  it('combines planned sources, sorts days and ties deterministically, and preserves source metadata', () => {
    const result = buildMonthlyTimelineViewModel(
      [],
      [expected({ id: 'expected-z', expectedAt: '2026-08-01T10:00:00.000Z' }), expected({ id: 'expected-a', expectedAt: '2026-08-01T09:00:00.000Z' })],
      [scheduled({ id: 'scheduled-1', nextDueAt: '2026-08-01T10:00:00.000Z' }), scheduled({ id: 'scheduled-2', nextDueAt: '2026-08-02T10:00:00.000Z' })],
      options,
    );

    expect(result.plannedGroups.map((group) => group.dateKey)).toEqual(['2026-8-1', '2026-8-2']);
    expect(result.plannedGroups[0].items.map((item) => `${item.source}:${item.id}`)).toEqual([
      'expected:expected-a',
      'expected:expected-z',
      'scheduled:scheduled-1',
    ]);
    expect(result.plannedGroups[0].items[0].metadata).toEqual(['Expected', 'BBVA', 'Bills']);
    expect(result.plannedGroups[0].items[2].metadata).toEqual(['Scheduled', 'BBVA', 'Health']);
  });

  it('preserves ignored expected movements and excludes scheduled items when current visibility disallows them', () => {
    const ignored = expected({ ignored: true });
    const result = buildMonthlyTimelineViewModel([], [ignored], [scheduled()], {
      ...options,
      includeScheduled: false,
    });

    expect(result.plannedGroups.flatMap((group) => group.items)).toEqual([
      expect.objectContaining({ source: 'expected', id: ignored.id, ignored: true }),
    ]);
  });

  it('uses the first recognized tag, then category, then transfer and direction fallbacks', () => {
    const result = buildMonthlyTimelineViewModel(
      [posted({ tags: [{ id: 'tag-unknown', name: 'personal' }, { id: 'tag-shopping', name: 'Shopping' }] })],
      [],
      [scheduled({ tagIds: ['tag-shopping'], tagNames: [], categoryId: 'category-2' })],
      options,
    );

    expect(result.postedGroups[0].items[0].icon).toMatchObject({
      className: 'bi bi-bag',
      accessibleLabel: 'Shopping movement',
    });
    expect(result.plannedGroups[0].items[0].icon.className).toBe('bi bi-bag');
    expect(buildMonthlyTimelineViewModel([], [], [scheduled({ id: 'transfer', type: 'transfer', categoryId: undefined })], options).plannedGroups[0].items[0].icon.className).toBe('bi bi-arrow-left-right');
  });
});
