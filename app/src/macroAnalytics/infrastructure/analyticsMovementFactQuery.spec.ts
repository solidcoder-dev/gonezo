import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { toAnalyticsListMovementFactsInput } from './analyticsMovementFactQuery';

describe('toAnalyticsListMovementFactsInput', () => {
  it.each([
    ['2026-09', '2026-09-01', '2026-09-30'],
    ['2026-02', '2026-02-01', '2026-02-28'],
    ['2024-02', '2024-02-01', '2024-02-29'],
    ['2026-12', '2026-12-01', '2026-12-31'],
  ])('converts %s to its complete local month', (period, fromLocalDate, toLocalDate) => {
    expect(toAnalyticsListMovementFactsInput({
      period: createAnalyticsPeriod(period),
      timeZone: 'Europe/Madrid',
    })).toEqual({
      fromLocalDate,
      toLocalDate,
      zoneId: 'Europe/Madrid',
      includePlannedMovements: true,
      includeIgnoredMovements: false,
    });
  });
});
