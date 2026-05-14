import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MovementsSearchFiltersState } from '../domain/movementsView.types';
import { MovementsSearchFilterSheetView } from './MovementsSearchFilterSheetView';

function filters(input: Partial<MovementsSearchFiltersState> = {}): MovementsSearchFiltersState {
  return {
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
    pageSize: 10,
    groupByDay: true,
    ...input,
  };
}

function commands() {
  return {
    close: vi.fn(),
    reset: vi.fn(),
    apply: vi.fn(),
    toggleAdvanced: vi.fn(),
    setMerchant: vi.fn(),
    setFromDate: vi.fn(),
    setToDate: vi.fn(),
    setTypes: vi.fn(),
    setCategoryIds: vi.fn(),
    setAmountMin: vi.fn(),
    setAmountMax: vi.fn(),
    setTagIds: vi.fn(),
    setSortField: vi.fn(),
    setSortDirection: vi.fn(),
    setGroupByDay: vi.fn(),
    setPageSize: vi.fn(),
  };
}

describe('MovementsSearchFilterSheetView', () => {
  it('renders filter controls and dispatches changes through commands', () => {
    const providedCommands = commands();

    render(
      <MovementsSearchFilterSheetView
        required={{
          config: {
            categoryCollapseLimit: 2,
            tagCollapseLimit: 2,
            pageSizes: [5, 10],
          },
          data: {
            filters: filters({
              merchant: 'Cafe',
              categoryIds: ['cat-food'],
              tagIds: ['tag-home'],
              types: ['expense'],
              pageSize: 10,
            }),
            filterOptions: {
              categories: [
                { id: 'cat-food', label: 'Food' },
                { id: 'cat-rent', label: 'Rent' },
                { id: 'cat-travel', label: 'Travel' },
              ],
              tags: [
                { id: 'tag-home', label: 'home' },
                { id: 'tag-work', label: 'work' },
                { id: 'tag-extra', label: 'extra' },
              ],
            },
          },
          state: {
            open: true,
            advancedOpen: true,
          },
          status: { disabled: false },
        }}
        provided={{ commands: providedCommands }}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Food' })).toHaveClass('selected');
    expect(screen.queryByRole('button', { name: 'Travel' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Merchant'), { target: { value: 'Market' } });
    expect(providedCommands.setMerchant).toHaveBeenCalledWith('Market');

    fireEvent.click(screen.getByRole('button', { name: '+1 categories' }));
    fireEvent.click(screen.getByRole('button', { name: 'Travel' }));
    expect(providedCommands.setCategoryIds).toHaveBeenCalledWith(['cat-food', 'cat-travel']);

    fireEvent.click(screen.getByRole('button', { name: '#work' }));
    expect(providedCommands.setTagIds).toHaveBeenCalledWith(['tag-home', 'tag-work']);

    fireEvent.click(screen.getByRole('button', { name: 'Expense' }));
    expect(providedCommands.setTypes).toHaveBeenCalledWith([]);

    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(providedCommands.setPageSize).toHaveBeenCalledWith(5);

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(providedCommands.reset).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(providedCommands.apply).toHaveBeenCalledTimes(1);
  });

  it('uses empty states and disables controls from status', () => {
    const providedCommands = commands();

    render(
      <MovementsSearchFilterSheetView
        required={{
          config: {},
          data: {
            filters: filters(),
            filterOptions: {
              categories: [],
              tags: [],
            },
          },
          state: {
            open: true,
            advancedOpen: false,
          },
          status: { disabled: true },
        }}
        provided={{ commands: providedCommands }}
      />,
    );

    expect(screen.getByText('No categories')).toBeInTheDocument();
    expect(screen.getByText('No tags')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'More options' })).toBeDisabled();
  });
});
