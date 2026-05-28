import { describe, expect, it } from 'vitest';
import { normalizeWebPagination, paginateWebItems } from './webPagination';

describe('webPagination', () => {
  it('normalizes invalid page requests and clamps size', () => {
    expect(normalizeWebPagination({ page: -1, size: 500 })).toEqual({
      page: 0,
      size: 100,
    });
    expect(normalizeWebPagination({ page: Number.NaN, size: 0 })).toEqual({
      page: 0,
      size: 20,
    });
  });

  it('paginates items with bounded page metadata', () => {
    expect(paginateWebItems(['a', 'b', 'c'], { page: 4, size: 2 })).toEqual({
      content: ['c'],
      page: 1,
      size: 2,
      totalElements: 3,
      totalPages: 2,
      hasNext: false,
      hasPrevious: true,
    });
  });
});
