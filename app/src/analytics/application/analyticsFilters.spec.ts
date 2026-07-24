import { describe, expect, it } from 'vitest';
import { normalizeAnalyticsFilters } from './analyticsFilters';

describe('analytics filters', () => {
  it('includes planned movements when the field is absent for backward compatibility', () => {
    expect(normalizeAnalyticsFilters().includePlannedMovements).toBe(true);
    expect(normalizeAnalyticsFilters({ includePlannedMovements: true }).includePlannedMovements).toBe(true);
    expect(normalizeAnalyticsFilters({ includePlannedMovements: false }).includePlannedMovements).toBe(false);
  });
});
