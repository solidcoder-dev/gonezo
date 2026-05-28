import { describe, expect, it, vi } from 'vitest';
import type { LedgerListTransactionsInput } from '../../ledger/application/ledger.port';
import { WebMovementsService } from './webMovementsService';
import { createWebAppState, type WebAppState } from '../../core/infrastructure/webAppState';

function createSubject(state: WebAppState = createWebAppState()) {
  const ledger = {
    listTransactions: vi.fn(async (input: LedgerListTransactionsInput) => {
      const statuses = input.filters?.statuses ?? [];
      const text = input.filters?.text?.toLowerCase();
      const transactions = state.ledgerTransactions
        .filter((transaction) => transaction.accountId === input.accountId)
        .filter((transaction) => statuses.length === 0 || statuses.includes(transaction.status))
        .filter((transaction) => !text
          || (transaction.merchant ?? '').toLowerCase().includes(text)
          || (transaction.description ?? '').toLowerCase().includes(text));
      const page = input.pagination?.page ?? 0;
      const size = input.pagination?.size ?? 20;
      const start = page * size;
      const content = transactions.slice(start, start + size).map((transaction) => ({
        ...transaction,
        items: transaction.items,
      }));
      return {
        content,
        page,
        size,
        totalElements: transactions.length,
        totalPages: transactions.length === 0 ? 0 : Math.ceil(transactions.length / size),
        hasNext: start + size < transactions.length,
        hasPrevious: page > 0,
      };
    }),
  };
  const taxonomy = {
    categoryNameById: (categoryId?: string) => state.taxonomyCategories.find((category) => category.id === categoryId)?.name,
    async listTransactionTaxonomy(input: { transactionIds: string[] }) {
      return {
        items: input.transactionIds.map((transactionId) => {
          const transaction = state.ledgerTransactions.find((item) => item.id === transactionId);
          return {
            transactionId,
            categoryId: transaction?.categoryId,
            tagIds: state.taxonomyTransactionTags.get(transactionId) ?? [],
            categorizationStatus: transaction?.categoryId ? 'assigned' as const : 'none' as const,
            taggingStatus: state.taxonomyTransactionTags.has(transactionId) ? 'assigned' as const : 'none' as const,
          };
        }),
      };
    },
    async listCategories() {
      return {
        items: state.taxonomyCategories.map((category) => ({
          id: category.id,
          name: category.name,
          appliesTo: category.appliesTo,
          status: category.status,
        })),
      };
    },
    async listTags() {
      return {
        items: state.taxonomyTags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          status: tag.status,
        })),
      };
    },
  };
  const scheduling = {
    async listMovements(input: { sourceAccountId: string }) {
      return {
        items: state.recurringMovements.filter((movement) => movement.sourceAccountId === input.sourceAccountId),
      };
    },
  };
  const expected = {
    async listMovements(input: { accountId: string }) {
      return {
        items: state.expectedMovements.filter((movement) => movement.accountId === input.accountId),
      };
    },
  };
  const movements = new WebMovementsService({ state, ledger, taxonomy, scheduling, expected });
  return {
    state,
    ledger,
    taxonomy,
    scheduling,
    expected,
    movements,
  };
}

describe('WebMovementsService', () => {
  it('builds a month overview from posted, scheduled and expected movements', async () => {
    const { movements, state } = createSubject(createWebAppState({
      ledgerAccounts: [
        {
          id: 'acc-1',
          name: 'Cash',
          type: 'cash',
          currency: 'EUR',
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      ledgerTransactions: [
        {
          id: 'posted-1',
          accountId: 'acc-1',
          type: 'expense',
          status: 'posted',
          amount: '12.00',
          currency: 'EUR',
          occurredAt: '2026-05-04T00:00:00.000Z',
          merchant: 'Cafe',
          items: [],
        },
      ],
      recurringMovements: [
        {
          id: 'scheduled-1',
          type: 'expense',
          sourceAccountId: 'acc-1',
          amount: '20.00',
          currency: 'EUR',
          merchant: 'Gym',
          status: 'active',
          startAt: '2026-05-10T00:00:00.000Z',
          nextDueAt: '2026-05-10T00:00:00.000Z',
          zoneId: 'UTC',
          generatedOccurrences: 0,
          splitItems: [],
          rule: { frequency: 'monthly', interval: 1 },
          recurrenceEnd: { kind: 'never' },
          scheduleKind: 'recurring',
          origin: 'recurring',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      expectedMovements: [
        {
          id: 'expected-1',
          accountId: 'acc-1',
          type: 'income',
          amount: '100.00',
          currency: 'EUR',
          expectedAt: '2026-05-20T00:00:00.000Z',
          merchant: 'Client',
          splitItems: [],
          status: 'pending',
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    }));

    const result = await movements.getMonthOverview({
      accountId: 'acc-1',
      fromDate: '2026-05-01T00:00:00.000Z',
      toDate: '2026-05-31T23:59:59.999Z',
      expectedPreviewSize: 1,
    });

    expect(state.ledgerTransactions).toHaveLength(1);
    expect(result.postedPage.content.map((item) => item.id)).toEqual(['posted-1']);
    expect(result.scheduledPreview.items.map((item) => item.id)).toEqual(['scheduled-1']);
    expect(result.expectedPreview.items.map((item) => item.id)).toEqual(['expected-1']);
    expect(result.expectedPreview.hasMore).toBe(false);
  });

  it('loads only the requested posted movement page for month overview', async () => {
    const transactions = Array.from({ length: 25 }, (_, index) => ({
      id: `posted-${index + 1}`,
      accountId: 'acc-1',
      type: 'expense' as const,
      status: 'posted' as const,
      amount: `${index + 1}.00`,
      currency: 'EUR',
      occurredAt: `2026-05-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
      merchant: `Merchant ${index + 1}`,
      items: [],
    }));
    const { ledger, movements } = createSubject(createWebAppState({
      ledgerTransactions: transactions,
    }));

    const result = await movements.getMonthOverview({
      accountId: 'acc-1',
      fromDate: '2026-05-01T00:00:00.000Z',
      toDate: '2026-05-31T23:59:59.999Z',
      executedPagination: {
        page: 1,
        size: 10,
      },
    });

    expect(ledger.listTransactions).toHaveBeenCalledTimes(1);
    expect(ledger.listTransactions).toHaveBeenCalledWith(expect.objectContaining({
      pagination: {
        page: 1,
        size: 10,
      },
    }));
    expect(result.executedPage.page).toBe(1);
    expect(result.executedPage.content).toHaveLength(10);
    expect(result.executedPage.hasNext).toBe(true);
  });

  it('searches posted, expected and scheduled sources with source-specific mapping', async () => {
    const { movements } = createSubject(createWebAppState({
      ledgerAccounts: [
        {
          id: 'acc-1',
          name: 'Cash',
          type: 'cash',
          currency: 'EUR',
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      ledgerTransactions: [
        {
          id: 'posted-1',
          accountId: 'acc-1',
          type: 'expense',
          status: 'posted',
          amount: '12.00',
          currency: 'EUR',
          occurredAt: '2026-05-04T00:00:00.000Z',
          merchant: 'Cafe',
          categoryId: 'cat-food',
          items: [],
        },
      ],
      taxonomyCategories: [
        {
          id: 'cat-food',
          name: 'Food',
          normalizedName: 'food',
          appliesTo: 'expense',
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'cat-gym',
          name: 'Health',
          normalizedName: 'health',
          appliesTo: 'expense',
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      recurringMovements: [
        {
          id: 'scheduled-1',
          type: 'expense',
          sourceAccountId: 'acc-1',
          amount: '20.00',
          currency: 'EUR',
          merchant: 'Gym',
          categoryId: 'cat-gym',
          status: 'active',
          startAt: '2026-05-10T00:00:00.000Z',
          nextDueAt: '2026-05-10T00:00:00.000Z',
          zoneId: 'UTC',
          generatedOccurrences: 0,
          splitItems: [],
          rule: { frequency: 'monthly', interval: 1 },
          recurrenceEnd: { kind: 'never' },
          scheduleKind: 'recurring',
          origin: 'recurring',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      expectedMovements: [
        {
          id: 'expected-1',
          accountId: 'acc-1',
          type: 'expense',
          amount: '30.00',
          currency: 'EUR',
          expectedAt: '2026-05-20T00:00:00.000Z',
          merchant: 'Dentist',
          categoryId: 'cat-gym',
          splitItems: [],
          status: 'pending',
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    }));

    await expect(movements.search({
      accountId: 'acc-1',
      source: 'posted',
      filters: { text: 'cafe' },
      pagination: { page: 0, size: 10 },
    })).resolves.toMatchObject({
      content: [
        {
          id: 'posted-1',
          source: 'posted',
          title: 'Cafe',
        },
      ],
    });

    await expect(movements.search({
      accountId: 'acc-1',
      source: 'expected',
      filters: { text: 'dentist' },
      pagination: { page: 0, size: 10 },
    })).resolves.toMatchObject({
      content: [
        {
          id: 'expected-1',
          source: 'expected',
          category: {
            id: 'cat-gym',
            name: 'Health',
          },
        },
      ],
    });

    await expect(movements.search({
      accountId: 'acc-1',
      source: 'scheduled',
      filters: { text: 'gym' },
      pagination: { page: 0, size: 10 },
    })).resolves.toMatchObject({
      content: [
        {
          id: 'scheduled-1',
          source: 'scheduled',
          category: {
            id: 'cat-gym',
            name: 'Health',
          },
        },
      ],
    });
  });

  it('returns search facets and scheduled movement pages', async () => {
    const { movements } = createSubject(createWebAppState({
      ledgerAccounts: [
        {
          id: 'acc-1',
          name: 'Cash',
          type: 'cash',
          currency: 'EUR',
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      ledgerTransactions: [
        {
          id: 'posted-1',
          accountId: 'acc-1',
          type: 'expense',
          status: 'posted',
          amount: '12.00',
          currency: 'EUR',
          occurredAt: '2026-05-04T00:00:00.000Z',
          merchant: 'Cafe',
          categoryId: 'cat-food',
          items: [],
        },
      ],
      taxonomyCategories: [
        {
          id: 'cat-food',
          name: 'Food',
          normalizedName: 'food',
          appliesTo: 'expense',
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'cat-gym',
          name: 'Health',
          normalizedName: 'health',
          appliesTo: 'expense',
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      taxonomyTags: [
        {
          id: 'tag-health',
          name: 'Health',
          normalizedName: 'health',
          status: 'active',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      taxonomyTransactionTags: new Map([['posted-1', ['tag-health']]]),
      recurringMovements: [
        {
          id: 'scheduled-1',
          type: 'expense',
          sourceAccountId: 'acc-1',
          amount: '20.00',
          currency: 'EUR',
          merchant: 'Gym',
          categoryId: 'cat-gym',
          tagIds: ['tag-health'],
          status: 'active',
          startAt: '2026-05-10T00:00:00.000Z',
          nextDueAt: '2026-05-10T00:00:00.000Z',
          zoneId: 'UTC',
          generatedOccurrences: 0,
          splitItems: [],
          rule: { frequency: 'monthly', interval: 1 },
          recurrenceEnd: { kind: 'never' },
          scheduleKind: 'recurring',
          origin: 'recurring',
          createdAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      expectedMovements: [],
    }));

    await expect(movements.getSearchFacets({ accountIds: ['acc-1'] })).resolves.toEqual({
      categories: [
        {
          id: 'cat-food',
          name: 'Food',
          appliesTo: 'expense',
        },
        {
          id: 'cat-gym',
          name: 'Health',
          appliesTo: 'expense',
        },
      ],
      tags: [
        {
          id: 'tag-health',
          name: 'Health',
        },
      ],
    });

    await expect(movements.listScheduled({
      accountId: 'acc-1',
      pagination: { page: 0, size: 1 },
    })).resolves.toMatchObject({
      content: [
        {
          id: 'scheduled-1',
        },
      ],
      page: 0,
      size: 1,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });
  });
});
