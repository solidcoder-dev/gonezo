import { describe, expect, it } from 'vitest';
import { MacroAnalyticsInvalidationPolicy } from './macroAnalyticsInvalidationPolicy';

describe('MacroAnalyticsInvalidationPolicy', () => {
  it('keeps invalidation scopes explicit', () => {
    expect(MacroAnalyticsInvalidationPolicy.none()).toEqual({ kind: 'NONE' });
    expect(MacroAnalyticsInvalidationPolicy.currentPeriod()).toEqual({ kind: 'CURRENT_PERIOD' });
    expect(MacroAnalyticsInvalidationPolicy.exactPeriod('2026-09-18T10:00:00Z')).toEqual({ kind: 'EXACT_PERIOD', effectiveAt: '2026-09-18T10:00:00Z' });
    expect(MacroAnalyticsInvalidationPolicy.periodAndFollowing('2026-09-18T10:00:00Z')).toEqual({ kind: 'PERIOD_AND_FOLLOWING', effectiveAt: '2026-09-18T10:00:00Z' });
    expect(MacroAnalyticsInvalidationPolicy.allPeriods()).toEqual({ kind: 'ALL_PERIODS' });
  });
});
