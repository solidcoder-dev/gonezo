import { describe, expect, it } from 'vitest';
import type { MovementsSearchItemView } from '../../application/movementsView.types';
import {
  buildMovementSearchDetailData,
  buildMovementSearchRowData,
  groupMovementSearchResultsByDay,
} from './movementsSearchPresentation';

function searchItem(input: Partial<MovementsSearchItemView> = {}): MovementsSearchItemView {
  return {
    id: 'movement-1',
    accountId: 'account-1',
    accountName: 'Checking',
    source: 'posted',
    type: 'expense',
    status: 'posted',
    amount: '12.50',
    currency: 'USD',
    occurredAt: '2026-01-15T12:00:00',
    title: 'Coffee',
    category: { id: 'cat-food', name: 'Food' },
    tags: [
      { id: 'tag-work', name: 'work' },
      { id: 'tag-client', name: 'client' },
      { id: 'tag-extra', name: 'extra' },
    ],
    items: [{ id: 'item-1', name: 'Espresso', amount: '12.50' }],
    ...input,
  };
}

describe('movements search presentation', () => {
  const now = new Date('2026-05-14T00:00:00');

  it('builds row data with optional date metadata', () => {
    const row = buildMovementSearchRowData(searchItem(), { includeDate: true, now });

    expect(row).toEqual({
      itemClassName: 'expense-item expense-item--expense',
      iconClassName: 'bi bi-arrow-down-right',
      title: 'Coffee',
      amount: {
        sign: '-',
        label: '$12.50',
        className: 'movement-amount movement-amount--expense',
      },
      details: [
        { key: 'account', value: 'Checking', primary: true },
        { key: 'date', value: '15 ene' },
        { key: 'category', value: 'Food' },
        { key: 'tags', value: '#work #client +1' },
      ],
    });
  });

  it('builds detail sheet data for a selected search result', () => {
    const detail = buildMovementSearchDetailData(searchItem({
      source: 'scheduled',
      type: 'transfer',
      title: 'Move cash',
    }), { now });

    expect(detail.title).toBe('Move cash');
    expect(detail.kicker).toBe('Transfer · Scheduled');
    expect(detail.iconClassName).toBe('bi bi-arrow-left-right');
    expect(detail.amount).toEqual({
      kind: 'transfer',
      sign: '',
      value: '12.50',
      currency: 'USD',
    });
    expect(detail.meta).toEqual([
      { label: 'Account', value: 'Checking' },
      { label: 'Date', value: '15 ene' },
      { label: 'Category', value: 'Food' },
      { label: 'Tags', value: '#work #client +1' },
      { label: 'Source', value: 'scheduled' },
    ]);
    expect(detail.splitItems).toEqual([{ id: 'item-1', name: 'Espresso', amount: '12.50' }]);
  });

  it('groups search results by occurred day without changing item order', () => {
    const groups = groupMovementSearchResultsByDay([
      searchItem({ id: 'b', occurredAt: '2026-05-14T18:00:00' }),
      searchItem({ id: 'a', occurredAt: '2026-05-14T08:00:00' }),
      searchItem({ id: 'c', occurredAt: '2026-05-13T09:00:00' }),
    ], { now });

    expect(groups).toEqual([
      {
        key: '2026-5-14',
        label: '14 MAY · TODAY',
        items: [
          expect.objectContaining({ id: 'b' }),
          expect.objectContaining({ id: 'a' }),
        ],
      },
      {
        key: '2026-5-13',
        label: '13 MAY · YESTERDAY',
        items: [expect.objectContaining({ id: 'c' })],
      },
    ]);
  });
});
