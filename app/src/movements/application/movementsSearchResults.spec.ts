import { describe, expect, it } from 'vitest';
import type { MovementsSearchFiltersState, MovementsSearchItemView } from './movementsView.types';
import { createDefaultMovementsSearchFilters } from './movementsSearchFilters';
import {
  aggregateMovementsSearchResults,
  getMovementsSearchAccountScope,
  getMovementsSearchAccountScopeKey,
  withMovementsSearchAccountContext,
} from './movementsSearchResults';

function filters(overrides: Partial<MovementsSearchFiltersState> = {}): MovementsSearchFiltersState {
  return {
    ...createDefaultMovementsSearchFilters(),
    ...overrides,
  };
}

function movement(overrides: Partial<MovementsSearchItemView> = {}): MovementsSearchItemView {
  return {
    id: 'tx-1',
    source: 'posted',
    type: 'expense',
    status: 'posted',
    amount: '10.00',
    currency: 'EUR',
    occurredAt: '2026-05-01T10:00:00.000Z',
    title: 'Movement',
    ...overrides,
  };
}

describe('movements search results', () => {
  it('resolves account scope and stable scope keys', () => {
    const accounts = [
      { id: 'acc-1', name: 'Main' },
      { id: 'acc-2', name: 'Savings' },
    ];

    expect(getMovementsSearchAccountScope(accounts, 'acc-2')).toEqual([{ id: 'acc-2', name: 'Savings' }]);
    expect(getMovementsSearchAccountScope(accounts, null)).toEqual(accounts);
    expect(getMovementsSearchAccountScopeKey(accounts, null)).toBe('all:acc-1:Main|acc-2:Savings');
    expect(getMovementsSearchAccountScopeKey(accounts, 'acc-1')).toBe('account:acc-1');
  });

  it('adds account context without changing the movement payload', () => {
    const result = withMovementsSearchAccountContext(movement({ title: 'Rent' }), {
      id: 'acc-1',
      name: 'Main',
    });

    expect(result).toMatchObject({
      id: 'tx-1',
      title: 'Rent',
      accountId: 'acc-1',
      accountName: 'Main',
    });
  });

  it('deduplicates, sorts and paginates aggregated account results', () => {
    const result = aggregateMovementsSearchResults(
      [
        movement({ id: 'old', accountId: 'acc-1', occurredAt: '2026-05-01T10:00:00.000Z' }),
        movement({ id: 'new', accountId: 'acc-1', occurredAt: '2026-05-03T10:00:00.000Z' }),
        movement({ id: 'new', accountId: 'acc-1', occurredAt: '2026-05-03T10:00:00.000Z' }),
        movement({ id: 'middle', accountId: 'acc-2', occurredAt: '2026-05-02T10:00:00.000Z' }),
      ],
      filters({ pageSize: 2 }),
      0,
    );

    expect(result.items.map((item) => item.id)).toEqual(['new', 'middle']);
    expect(result.pagination).toMatchObject({
      page: 0,
      size: 2,
      totalElements: 3,
      totalPages: 2,
      hasNext: true,
      hasPrevious: false,
    });
  });

  it('clamps aggregated result pages to the last available page', () => {
    const result = aggregateMovementsSearchResults(
      [
        movement({ id: 'cheap', amount: '1.00' }),
        movement({ id: 'expensive', amount: '20.00' }),
        movement({ id: 'middle', amount: '10.00' }),
      ],
      filters({ sortField: 'amount', sortDirection: 'asc', pageSize: 2 }),
      10,
    );

    expect(result.page).toBe(1);
    expect(result.items.map((item) => item.id)).toEqual(['expensive']);
  });
});
