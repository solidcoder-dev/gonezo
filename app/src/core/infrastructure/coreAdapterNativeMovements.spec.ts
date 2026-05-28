import { describe, expect, it, vi } from 'vitest';
import type { CorePort } from '../application/corePort';
import type { SchedulingMovementItem } from '../../scheduling/application/schedulingCore.port';
import { listNativeScheduledMovements, searchNativeMovements } from './coreAdapterNativeMovements';

type NativeMovementCore = Pick<
  CorePort,
  | 'ledgerListTransactions'
  | 'expectedListMovements'
  | 'taxonomyListCategories'
  | 'movementsListScheduled'
  | 'schedulingListMovements'
>;

function scheduledMovement(
  overrides: Partial<SchedulingMovementItem> & Pick<SchedulingMovementItem, 'id' | 'amount'>,
): SchedulingMovementItem {
  return {
    id: overrides.id,
    type: overrides.type ?? 'expense',
    sourceAccountId: overrides.sourceAccountId ?? 'account-1',
    amount: overrides.amount,
    currency: overrides.currency ?? 'USD',
    description: overrides.description,
    merchant: overrides.merchant,
    status: overrides.status ?? 'active',
    startAt: overrides.startAt ?? '2026-01-01T00:00:00.000Z',
    nextDueAt: overrides.nextDueAt,
    zoneId: overrides.zoneId ?? 'UTC',
    generatedOccurrences: overrides.generatedOccurrences ?? 0,
    splitItems: overrides.splitItems ?? [],
    rule: overrides.rule ?? { frequency: 'monthly', interval: 1 },
    recurrenceEnd: overrides.recurrenceEnd ?? { kind: 'never' },
    categoryId: overrides.categoryId,
    tagIds: overrides.tagIds,
    tagNames: overrides.tagNames,
    scheduleKind: overrides.scheduleKind,
    origin: overrides.origin,
  };
}

function nativeCore(overrides: Partial<NativeMovementCore> = {}): NativeMovementCore {
  return {
    ledgerListTransactions: vi.fn(),
    expectedListMovements: vi.fn(),
    taxonomyListCategories: vi.fn(),
    movementsListScheduled: vi.fn(),
    schedulingListMovements: vi.fn(),
    ...overrides,
  } as NativeMovementCore;
}

describe('coreAdapterNativeMovements', () => {
  it('filters and paginates scheduled movements through the focused native helper', async () => {
    const core = nativeCore({
      schedulingListMovements: vi.fn(async () => ({
        items: [
          scheduledMovement({
            id: 'keep',
            amount: '12.00',
            nextDueAt: '2026-01-15T00:00:00.000Z',
            merchant: 'Market',
            categoryId: 'cat-food',
            tagIds: ['tag-home'],
          }),
          scheduledMovement({
            id: 'wrong-category',
            amount: '12.00',
            nextDueAt: '2026-01-15T00:00:00.000Z',
            categoryId: 'cat-rent',
            tagIds: ['tag-home'],
          }),
          scheduledMovement({
            id: 'wrong-amount',
            amount: '99.00',
            nextDueAt: '2026-01-15T00:00:00.000Z',
            categoryId: 'cat-food',
            tagIds: ['tag-home'],
          }),
        ],
      })),
    });

    const result = await listNativeScheduledMovements(core, {
      accountId: 'account-1',
      filters: {
        categoryIds: ['cat-food'],
        tagIds: ['tag-home'],
        amountMin: '10',
        amountMax: '20',
        fromDate: '2026-01-01T00:00:00.000Z',
        toDate: '2026-01-31T23:59:59.999Z',
        merchant: 'mar',
      },
      pagination: { page: 0, size: 10 },
    });

    expect(result.content.map((item) => item.id)).toEqual(['keep']);
    expect(result.totalElements).toBe(1);
    expect(result.hasNext).toBe(false);
  });

  it('maps scheduled search results without calling posted or expected ports', async () => {
    const core = nativeCore({
      movementsListScheduled: vi.fn(async () => ({
        content: [
          scheduledMovement({
            id: 'scheduled-1',
            amount: '30.00',
            nextDueAt: '2026-02-03T00:00:00.000Z',
            merchant: 'Gym',
            categoryId: 'cat-health',
            tagNames: ['fitness'],
          }),
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      })),
    });

    const result = await searchNativeMovements(core, {
      accountId: 'account-1',
      source: 'scheduled',
    });

    expect(result.content).toEqual([
      expect.objectContaining({
        id: 'scheduled-1',
        source: 'scheduled',
        status: 'scheduled',
        title: 'Gym',
        tags: [{ id: 'fitness', name: 'fitness' }],
      }),
    ]);
    expect(core.ledgerListTransactions).not.toHaveBeenCalled();
    expect(core.expectedListMovements).not.toHaveBeenCalled();
  });
});
