import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MovementsSearchPagePort } from '../../application/movementsSearch.port';
import { MovementsSearchResults } from './MovementsSearchResults';

function createCore(): MovementsSearchPagePort {
  const postedMovement = {
    id: 'tx-1',
    accountId: 'acc-1',
    accountName: 'Main',
    source: 'posted' as const,
    type: 'expense' as const,
    status: 'posted' as const,
    amount: '10.00',
    currency: 'EUR',
    occurredAt: '2026-06-24T10:00:00.000Z',
    title: 'Cafe',
    merchant: 'Cafe',
    ignored: false,
    items: [],
  };
  const expectedMovement = {
    id: 'expected-1',
    accountId: 'acc-1',
    accountName: 'Main',
    source: 'expected' as const,
    type: 'income' as const,
    status: 'pending' as const,
    amount: '25.00',
    currency: 'EUR',
    occurredAt: '2026-06-25T10:00:00.000Z',
    title: 'Refund',
    description: 'Refund detail',
    merchant: 'Store',
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Food' },
    splitItems: [{ id: 'item-1', name: 'Item', amount: '25.00' }],
    ignored: true,
    items: [{ id: 'item-1', name: 'Item', amount: '25.00' }],
  };
  return {
    taxonomyListCategories: vi.fn(async () => ({
      items: [{ id: 'cat-1', name: 'Food', appliesTo: 'expense', status: 'active' }],
    })),
    taxonomyListTags: vi.fn(async () => ({
      items: [{ id: 'tag-1', name: 'Coffee', status: 'active' }],
    })),
    sharingGetMovementDetails: vi.fn(async () => null),
    orchestrationCategorizeTransaction: vi.fn(async () => ({ status: 'none' })),
    orchestrationApplyTransactionTags: vi.fn(async () => ({ status: 'none' })),
    analyticsSetMovementIgnored: vi.fn(async () => undefined),
    expectedUpdateMovement: vi.fn(async () => undefined),
    schedulingUpdateMovement: vi.fn(async () => undefined),
    schedulingDeactivateMovement: vi.fn(async () => undefined),
    ledgerVoidTransaction: vi.fn(async () => undefined),
    movementsGetDetail: vi.fn(async ({ source, movementId }) => {
      if (source === 'posted' && movementId === postedMovement.id) {
        return { found: true as const, detail: { source: 'posted' as const, movement: postedMovement } };
      }
      if (source === 'expected' && movementId === expectedMovement.id) {
        return {
          found: true as const,
          detail: {
            source: 'expected' as const,
            movement: expectedMovement,
            origin: { kind: 'manual' as const },
          },
        };
      }
      return { found: false as const };
    }),
  } as unknown as MovementsSearchPagePort;
}

describe('MovementsSearchResults', () => {
  it('opens the real movement detail with editable category and tags', async () => {
    const core = createCore();

    render(
      <MovementsSearchResults
        required={{
          state: {
            appliedFilters: {
              source: 'posted',
              text: '',
              merchant: '',
              categoryIds: [],
              tagIds: [],
              amountMin: '',
              amountMax: '',
              fromDate: '',
              toDate: '',
              types: [],
              sortField: 'date',
              sortDirection: 'desc',
              pageSize: 20,
              groupByDay: false,
            },
            items: [
              {
                id: 'tx-1',
                accountId: 'acc-1',
                accountName: 'Main',
                source: 'posted',
                type: 'expense',
                status: 'posted',
                amount: '10.00',
                currency: 'EUR',
                occurredAt: '2026-06-24T10:00:00.000Z',
                title: 'Cafe',
                merchant: 'Cafe',
                ignored: false,
                items: [],
              },
            ],
            pagination: {
              page: 0,
              size: 20,
              totalElements: 1,
              totalPages: 1,
              hasNext: false,
              hasPrevious: false,
            },
          },
          status: {
            loading: false,
            disabled: false,
          },
        }}
        provided={{
          context: { core },
          commands: {
            goToPreviousPage: vi.fn(),
            goToNextPage: vi.fn(),
            refreshResults: vi.fn(async () => undefined),
            voidPostedMovement: vi.fn(async () => undefined),
          },
          events: {
            onPostExpectedMovement: vi.fn(),
            onEditExpectedMovement: vi.fn(),
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Cafe/i }));

    expect(await screen.findByRole('dialog', { name: 'Movement detail' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Category/i })).toHaveTextContent('No category');
    expect(screen.getByRole('button', { name: /Tags/i })).toHaveTextContent('No tags');

    fireEvent.click(screen.getByRole('button', { name: /Category/i }));
    expect(await screen.findByRole('dialog', { name: 'Movement category' })).toBeInTheDocument();
  });

  it('propagates expected post/edit events without losing expected fields', async () => {
    const core = createCore();
    const onPostExpectedMovement = vi.fn();
    const onEditExpectedMovement = vi.fn();
    const expected = {
      id: 'expected-1',
      accountId: 'acc-1',
      accountName: 'Main',
      source: 'expected' as const,
      type: 'income' as const,
      status: 'expected' as const,
      amount: '25.00',
      currency: 'EUR',
      occurredAt: '2026-06-25T10:00:00.000Z',
      title: 'Refund',
      description: 'Refund detail',
      merchant: 'Store',
      categoryId: 'cat-1',
      category: { id: 'cat-1', name: 'Food' },
      splitItems: [],
      ignored: true,
      items: [{ id: 'item-1', name: 'Item', amount: '25.00' }],
    };

    render(
      <MovementsSearchResults
        required={{
          state: {
            appliedFilters: {
              source: 'expected', text: '', merchant: '', categoryIds: [], tagIds: [], amountMin: '', amountMax: '',
              fromDate: '', toDate: '', types: [], sortField: 'date', sortDirection: 'desc', pageSize: 20, groupByDay: false,
            },
            items: [expected],
            pagination: { page: 0, size: 20, totalElements: 1, totalPages: 1, hasNext: false, hasPrevious: false },
          },
          status: { loading: false, disabled: false },
        }}
        provided={{
          context: { core },
          commands: {
            goToPreviousPage: vi.fn(), goToNextPage: vi.fn(), refreshResults: vi.fn(async () => undefined),
            voidPostedMovement: vi.fn(async () => undefined),
          },
          events: { onPostExpectedMovement, onEditExpectedMovement },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Refund/i }));
    expect(await screen.findByRole('button', { name: 'Post movement' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Post movement' }));
    expect(onPostExpectedMovement).toHaveBeenCalledWith(expect.objectContaining({
      id: 'expected-1', accountId: 'acc-1', type: 'income', amount: '25.00', currency: 'EUR',
      categoryId: 'cat-1', ignored: true, splitItems: expected.items,
    }), 'Food');
    expect(onEditExpectedMovement).not.toHaveBeenCalled();
  });
});
