import { describe, expect, it } from 'vitest';
import type { LedgerTransactionListItem } from '../../ledger/application/ledgerCore.port';
import type { SchedulingMovementItem } from '../../scheduling/application/schedulingCore.port';
import type { ExpectedMovementItem } from '../../expected/application/expectedCore.port';
import {
  filterExpectedMovements,
  filterScheduledMovements,
  mapExpectedMovementToSearchItem,
  mapPostedTransactionToSearchItem,
  mapScheduledMovementToSearchItem,
  type StoredScheduledMovement,
} from './coreAdapterWebMovementQueries';

function scheduled(overrides: Partial<StoredScheduledMovement> = {}): StoredScheduledMovement {
  return {
    id: 'scheduled-1',
    type: 'expense',
    sourceAccountId: 'acc-1',
    amount: '20.00',
    currency: 'EUR',
    merchant: 'Gym',
    status: 'active',
    startAt: '2026-01-10T10:00:00.000Z',
    nextDueAt: '2026-01-15T10:00:00.000Z',
    zoneId: 'UTC',
    generatedOccurrences: 0,
    splitItems: [],
    categoryId: 'cat-1',
    tagIds: ['tag-1'],
    tagNames: ['health'],
    rule: { frequency: 'monthly', interval: 1 },
    recurrenceEnd: { kind: 'never' },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function expected(overrides: Partial<ExpectedMovementItem> = {}): ExpectedMovementItem {
  return {
    id: 'expected-1',
    accountId: 'acc-1',
    type: 'expense',
    amount: '20.00',
    currency: 'EUR',
    expectedAt: '2026-01-15T10:00:00.000Z',
    merchant: 'Gym',
    categoryId: 'cat-1',
    splitItems: [],
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('coreAdapterWebMovementQueries', () => {
  it('filters scheduled movements by visible account, tags and date range', () => {
    const transfer: StoredScheduledMovement = scheduled({
      id: 'transfer-1',
      type: 'transfer',
      sourceAccountId: 'acc-2',
      targetAccountId: 'acc-1',
      nextDueAt: '2026-01-16T10:00:00.000Z',
      tagIds: ['tag-2'],
    });
    const result = filterScheduledMovements([
      scheduled(),
      transfer,
      scheduled({ id: 'hidden', sourceAccountId: 'acc-3', tagIds: ['tag-2'] }),
    ], {
      accountId: 'acc-1',
      filters: {
        tagIds: ['tag-2'],
        fromDate: '2026-01-16T00:00:00.000Z',
        toDate: '2026-01-16T23:59:59.999Z',
      },
    });

    expect(result.map((item) => item.id)).toEqual(['transfer-1']);
    expect(result[0]?.origin).toBe('recurring');
  });

  it('filters expected movements by open status and search text', () => {
    const result = filterExpectedMovements([
      expected(),
      expected({ id: 'closed', status: 'resolved', merchant: 'Gym' }),
      expected({ id: 'other', merchant: 'Market' }),
    ], {
      accountId: 'acc-1',
      filters: {
        text: 'gym',
      },
    });

    expect(result.map((item) => item.id)).toEqual(['expected-1']);
  });

  it('maps movement sources to search items', () => {
    const posted: LedgerTransactionListItem = {
      id: 'posted-1',
      accountId: 'acc-1',
      type: 'expense',
      status: 'posted',
      amount: '10.00',
      currency: 'EUR',
      occurredAt: '2026-01-10T10:00:00.000Z',
      merchant: 'Cafe',
      items: [],
    };
    const scheduledItem = scheduled() satisfies SchedulingMovementItem;
    const expectedItem = expected();

    expect(mapPostedTransactionToSearchItem(posted)).toMatchObject({
      id: 'posted-1',
      source: 'posted',
      title: 'Cafe',
    });
    expect(mapScheduledMovementToSearchItem(scheduledItem, () => 'Health')).toMatchObject({
      id: 'scheduled-1',
      source: 'scheduled',
      status: 'scheduled',
      category: { id: 'cat-1', name: 'Health' },
    });
    expect(mapExpectedMovementToSearchItem(expectedItem, () => 'Health')).toMatchObject({
      id: 'expected-1',
      source: 'expected',
      status: 'expected',
      category: { id: 'cat-1', name: 'Health' },
    });
  });
});
