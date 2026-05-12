import { describe, expect, it, vi } from 'vitest';
import type {
  ExpectedListMovementsInput,
  LedgerListTransactionsInput,
  SchedulingListMovementsInput,
} from '../../domain/corePort';
import { getMovementsSearchFacets } from './movementsSearchFacets';

describe('getMovementsSearchFacets', () => {
  it('returns active taxonomy referenced by movements in the requested account scope', async () => {
    const reader = {
      taxonomyListCategories: vi.fn(async () => ({
        items: [
          { id: 'cat-food', name: 'Food', appliesTo: 'expense' as const, status: 'active' as const },
          { id: 'cat-scheduled', name: 'Scheduled', appliesTo: 'expense' as const, status: 'active' as const },
          { id: 'cat-expected', name: 'Expected', appliesTo: 'income' as const, status: 'active' as const },
          { id: 'cat-unused', name: 'Unused', appliesTo: 'expense' as const, status: 'active' as const },
        ],
      })),
      taxonomyListTags: vi.fn(async () => ({
        items: [
          { id: 'tag-home', name: 'home', status: 'active' as const },
          { id: 'tag-london', name: 'london', status: 'active' as const },
          { id: 'tag-unused', name: 'unused', status: 'active' as const },
        ],
      })),
      ledgerListTransactions: vi.fn(async (input: LedgerListTransactionsInput) => ({
        content: input.accountId === 'acc-1'
          ? [
            {
              id: 'tx-1',
              accountId: 'acc-1',
              type: 'expense' as const,
              status: 'posted' as const,
              amount: '12.00',
              currency: 'EUR',
              occurredAt: '2026-05-01T00:00:00.000Z',
              categoryId: 'cat-food',
              items: [],
            },
          ]
          : [],
        page: 0,
        size: 100,
        totalElements: input.accountId === 'acc-1' ? 1 : 0,
        totalPages: input.accountId === 'acc-1' ? 1 : 0,
        hasNext: false,
        hasPrevious: false,
      })),
      orchestrationListTransactionTaxonomy: vi.fn(async () => ({
        items: [
          {
            transactionId: 'tx-1',
            categoryId: 'cat-food',
            tagIds: ['tag-home'],
          },
        ],
      })),
      schedulingListMovements: vi.fn(async (input: SchedulingListMovementsInput) => ({
        items: input.sourceAccountId === 'acc-1'
          ? [
            {
              id: 'scheduled-1',
              type: 'expense' as const,
              sourceAccountId: 'acc-1',
              amount: '30.00',
              currency: 'EUR',
              description: 'Rent',
              status: 'active' as const,
              startAt: '2026-05-03T00:00:00.000Z',
              nextDueAt: '2026-06-03T00:00:00.000Z',
              zoneId: 'Atlantic/Canary',
              generatedOccurrences: 0,
              splitItems: [],
              rule: { frequency: 'monthly' as const },
              recurrenceEnd: { kind: 'never' as const },
              categoryId: 'cat-scheduled',
              tagIds: ['tag-london'],
            },
          ]
          : [],
      })),
      expectedListMovements: vi.fn(async (input: ExpectedListMovementsInput) => ({
        items: input.accountId === 'acc-1'
          ? [
            {
              id: 'expected-1',
              accountId: 'acc-1',
              type: 'income' as const,
              amount: '1000.00',
              currency: 'EUR',
              expectedAt: '2026-05-10T00:00:00.000Z',
              categoryId: 'cat-expected',
              splitItems: [],
              status: 'pending' as const,
              createdAt: '2026-05-01T00:00:00.000Z',
              updatedAt: '2026-05-01T00:00:00.000Z',
            },
          ]
          : [],
      })),
    };

    const result = await getMovementsSearchFacets(reader, { accountIds: ['acc-1', 'acc-1', ''] });

    expect(reader.taxonomyListCategories).toHaveBeenCalledWith({ includeArchived: false });
    expect(reader.taxonomyListTags).toHaveBeenCalledWith({ includeArchived: false });
    expect(reader.ledgerListTransactions).toHaveBeenCalledWith(expect.objectContaining({
      accountId: 'acc-1',
      filters: { statuses: ['posted'] },
    }));
    expect(reader.schedulingListMovements).toHaveBeenCalledWith({ sourceAccountId: 'acc-1' });
    expect(reader.expectedListMovements).toHaveBeenCalledWith({ accountId: 'acc-1' });
    expect(result.categories.map((category) => category.id)).toEqual(['cat-food', 'cat-scheduled', 'cat-expected']);
    expect(result.tags.map((tag) => tag.id)).toEqual(['tag-home', 'tag-london']);
  });
});
