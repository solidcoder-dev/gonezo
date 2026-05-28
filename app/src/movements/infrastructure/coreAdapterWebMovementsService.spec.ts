import { describe, expect, it, vi } from 'vitest';
import type { CoreAdapterWebDependencies } from '../../core/infrastructure/coreAdapterWebEffects';
import { WebExpectedMovementsService } from '../../expected/infrastructure/coreAdapterWebExpectedService';
import { WebLedgerService } from '../../ledger/infrastructure/coreAdapterWebLedgerService';
import { WebMovementsService } from './coreAdapterWebMovementsService';
import { WebSchedulingService } from '../../scheduling/infrastructure/coreAdapterWebSchedulingService';
import { createWebCoreState, type WebCoreState } from '../../core/infrastructure/coreAdapterWebState';
import { WebTaxonomyService } from '../../taxonomy/infrastructure/coreAdapterWebTaxonomyService';

function createDependencies(): CoreAdapterWebDependencies {
  let next = 0;
  return {
    clock: {
      nowIso: () => '2026-05-26T09:00:00.000Z',
    },
    idGenerator: {
      nextId: () => {
        next += 1;
        return `id-${next}`;
      },
    },
    backupDownloader: {
      downloadJson: vi.fn(),
    },
  };
}

function createSubject(state: WebCoreState = createWebCoreState()) {
  const dependencies = createDependencies();
  const ledger = new WebLedgerService({ state, dependencies });
  const taxonomy = new WebTaxonomyService({ state, dependencies });
  const scheduling = new WebSchedulingService({ state, dependencies, ledger });
  const expected = new WebExpectedMovementsService({ state, dependencies, ledger });
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
    const { movements, state } = createSubject(createWebCoreState({
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

  it('searches posted, expected and scheduled sources with source-specific mapping', async () => {
    const { movements } = createSubject(createWebCoreState({
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
    const { movements } = createSubject(createWebCoreState({
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
