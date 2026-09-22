import type { MacroAnalyticsInvalidationEffect } from './macroAnalyticsInvalidation.port';

export const MacroAnalyticsInvalidationPolicy = Object.freeze({
  none(): MacroAnalyticsInvalidationEffect { return { kind: 'NONE' }; },
  currentPeriod(): MacroAnalyticsInvalidationEffect { return { kind: 'CURRENT_PERIOD' }; },
  exactPeriod(effectiveAt: string): MacroAnalyticsInvalidationEffect { return { kind: 'EXACT_PERIOD', effectiveAt }; },
  periodAndFollowing(effectiveAt: string): MacroAnalyticsInvalidationEffect { return { kind: 'PERIOD_AND_FOLLOWING', effectiveAt }; },
  allPeriods(): MacroAnalyticsInvalidationEffect { return { kind: 'ALL_PERIODS' }; },
});
