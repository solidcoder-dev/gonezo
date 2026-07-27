import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MovementsSearchFilters } from './MovementsSearchFilters';

function renderFilters() {
  const commands = {
    setSource: vi.fn(), openFilters: vi.fn(), closeFilters: vi.fn(), toggleAdvancedFilters: vi.fn(),
    resetFilters: vi.fn(), setFilterText: vi.fn(), setFilterMerchant: vi.fn(), setFilterCategoryIds: vi.fn(),
    setFilterTagIds: vi.fn(), setFilterAmountMin: vi.fn(), setFilterAmountMax: vi.fn(), setFilterFromDate: vi.fn(),
    setFilterToDate: vi.fn(), setFilterTypes: vi.fn(), setSortField: vi.fn(), setSortDirection: vi.fn(),
    setPageSize: vi.fn(), setGroupByDay: vi.fn(), applyFilterPatch: vi.fn(), applyFilters: vi.fn(),
  };
  render(
    <MovementsSearchFilters
      required={{
        state: {
          filtersOpen: false,
          filtersAdvancedOpen: false,
          searchApplied: false,
          filters: {
            source: 'posted', text: 'coffee', merchant: '', categoryIds: [], tagIds: [], amountMin: '', amountMax: '',
            fromDate: '', toDate: '', types: [], sortField: 'date', sortDirection: 'desc', pageSize: 10, groupByDay: true,
          },
          appliedFilters: {
            source: 'posted', text: '', merchant: '', categoryIds: [], tagIds: [], amountMin: '', amountMax: '',
            fromDate: '', toDate: '', types: [], sortField: 'date', sortDirection: 'desc', pageSize: 10, groupByDay: true,
          },
          filterOptions: { categories: [], tags: [] },
        },
        status: { disabled: false },
      }}
      provided={{ commands }}
    />,
  );
  return commands;
}

describe('MovementsSearchFilters', () => {
  it('applies on Enter and clears the text without opening filters', () => {
    const commands = renderFilters();
    const input = screen.getByRole('searchbox', { name: 'Search movements' });

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(commands.applyFilters).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(commands.setFilterText).toHaveBeenCalledWith('');
    expect(commands.openFilters).not.toHaveBeenCalled();
  });
});
