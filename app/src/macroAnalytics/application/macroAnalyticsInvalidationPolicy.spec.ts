import { describe, expect, it } from 'vitest';
import { MacroAnalyticsInvalidationPolicy } from './macroAnalyticsInvalidationPolicy';

describe('MacroAnalyticsInvalidationPolicy', () => {
  it('maps mutation semantics to explicit invalidation effects', () => {
    expect(MacroAnalyticsInvalidationPolicy.none()).toEqual({ kind: 'NONE' });
    expect(MacroAnalyticsInvalidationPolicy.accountOpened('2026-09-18T10:00:00Z')).toEqual({ kind: 'PERIOD_AND_FOLLOWING', effectiveAt: '2026-09-18T10:00:00Z' });
    expect(MacroAnalyticsInvalidationPolicy.postedMovementStructureChanged()).toEqual({ kind: 'ALL_PERIODS' });
    expect(MacroAnalyticsInvalidationPolicy.expectedCreated('2026-09-18T10:00:00Z')).toEqual({ kind: 'EXACT_PERIOD', effectiveAt: '2026-09-18T10:00:00Z' });
    expect(MacroAnalyticsInvalidationPolicy.recurringPlanChanged()).toEqual({ kind: 'CURRENT_PERIOD' });
  });
});
