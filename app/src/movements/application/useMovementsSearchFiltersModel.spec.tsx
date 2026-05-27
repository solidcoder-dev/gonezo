import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMovementsSearchFiltersModel } from './useMovementsSearchFiltersModel';

describe('useMovementsSearchFiltersModel', () => {
  it('keeps draft edits separate until filters are applied', () => {
    const resetPage = vi.fn();
    const { result } = renderHook(() => useMovementsSearchFiltersModel({ resetPage }));

    act(() => {
      result.current.commands.openFilters();
      result.current.commands.setFilterText('coffee');
      result.current.commands.setFilterCategoryIds([' cat-food ', 'cat-food']);
    });

    expect(result.current.filtersOpen).toBe(true);
    expect(result.current.filterDraft.text).toBe('coffee');
    expect(result.current.filterDraft.categoryIds).toEqual(['cat-food']);
    expect(result.current.appliedFilters.text).toBe('');

    act(() => {
      result.current.commands.applyFilters();
    });

    expect(result.current.filtersOpen).toBe(false);
    expect(result.current.searchApplied).toBe(true);
    expect(result.current.appliedFilters.text).toBe('coffee');
    expect(result.current.appliedFilters.categoryIds).toEqual(['cat-food']);
    expect(resetPage).toHaveBeenCalledTimes(1);
  });

  it('applies source changes immediately and resets filters back to defaults', () => {
    const resetPage = vi.fn();
    const { result } = renderHook(() => useMovementsSearchFiltersModel({ resetPage }));

    act(() => {
      result.current.commands.setSource('scheduled');
      result.current.commands.setSortField('amount');
      result.current.commands.setPageSize(250);
    });

    expect(result.current.filterDraft.source).toBe('scheduled');
    expect(result.current.appliedFilters.source).toBe('scheduled');
    expect(result.current.searchApplied).toBe(true);
    expect(result.current.filterDraft.groupByDay).toBe(false);
    expect(result.current.filterDraft.pageSize).toBe(100);

    act(() => {
      result.current.commands.resetFilters();
    });

    expect(result.current.filterDraft.source).toBe('posted');
    expect(result.current.appliedFilters.source).toBe('posted');
    expect(result.current.searchApplied).toBe(false);
    expect(result.current.filterDraft.groupByDay).toBe(true);
    expect(resetPage).toHaveBeenCalledTimes(2);
  });
});
