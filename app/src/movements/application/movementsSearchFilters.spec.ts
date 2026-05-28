import { describe, expect, it } from 'vitest';
import type { MovementsSearchFiltersState } from './movementsView.types';
import {
  buildMovementsSearchFilters,
  buildPostedTaxonomyCandidateFilters,
  createDefaultMovementsSearchFilters,
  mergeMovementsSearchFilterPatch,
} from './movementsSearchFilters';

function filters(overrides: Partial<MovementsSearchFiltersState> = {}): MovementsSearchFiltersState {
  return {
    ...createDefaultMovementsSearchFilters(),
    ...overrides,
  };
}

describe('movements search filters', () => {
  it('normalizes UI filters before passing them to the core search port', () => {
    const result = buildMovementsSearchFilters(filters({
      text: ' coffee ',
      merchant: ' Main shop ',
      categoryIds: [' cat-food ', '', 'cat-food', 'cat-health'],
      tagIds: [' tag-home ', 'tag-home', ''],
      amountMin: '20,50',
      amountMax: '10',
      fromDate: ' 2026-05-01 ',
      types: ['expense'],
    }));

    expect(result).toEqual({
      text: 'coffee',
      merchant: 'Main shop',
      categoryIds: ['cat-food', 'cat-health'],
      categoryId: undefined,
      tagIds: ['tag-home'],
      amountMin: '10',
      amountMax: '20.5',
      fromDate: '2026-05-01',
      toDate: undefined,
      types: ['expense'],
    });
  });

  it('keeps single category compatibility while also exposing categoryIds', () => {
    const result = buildMovementsSearchFilters(filters({
      categoryIds: ['cat-food'],
    }));

    expect(result?.categoryId).toBe('cat-food');
    expect(result?.categoryIds).toEqual(['cat-food']);
  });

  it('omits taxonomy filters from posted taxonomy candidate queries', () => {
    const result = buildPostedTaxonomyCandidateFilters(filters({
      categoryIds: ['cat-food'],
      tagIds: ['tag-home'],
      text: ' lunch ',
    }));

    expect(result).toMatchObject({ text: 'lunch' });
    expect(result).not.toHaveProperty('categoryId');
    expect(result).not.toHaveProperty('categoryIds');
    expect(result).not.toHaveProperty('tagIds');
  });

  it('merges filter patches using the same normalization as command handlers', () => {
    const result = mergeMovementsSearchFilterPatch(filters(), {
      categoryIds: [' a ', 'a', 'b'],
      tagIds: [' t ', ''],
      pageSize: 250,
      types: ['expense', 'expense', 'income'],
    });

    expect(result.categoryIds).toEqual(['a', 'b']);
    expect(result.tagIds).toEqual(['t']);
    expect(result.pageSize).toBe(100);
    expect(result.types).toEqual(['expense', 'income']);
  });
});
