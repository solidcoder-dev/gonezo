import type { MacroAnalyticsInvalidationEffect } from './macroAnalyticsInvalidation.port';

export const MacroAnalyticsInvalidationPolicy = Object.freeze({
  none(): MacroAnalyticsInvalidationEffect { return { kind: 'NONE' }; },
  accountOpened(effectiveAt: string): MacroAnalyticsInvalidationEffect { return { kind: 'PERIOD_AND_FOLLOWING', effectiveAt }; },
  accountDeleted(): MacroAnalyticsInvalidationEffect { return { kind: 'ALL_PERIODS' }; },
  postedMovementChanged(effectiveAt: string): MacroAnalyticsInvalidationEffect { return { kind: 'PERIOD_AND_FOLLOWING', effectiveAt }; },
  postedMovementStructureChanged(): MacroAnalyticsInvalidationEffect { return { kind: 'ALL_PERIODS' }; },
  recurringPlanChanged(): MacroAnalyticsInvalidationEffect { return { kind: 'CURRENT_PERIOD' }; },
  expectedCreated(effectiveAt: string): MacroAnalyticsInvalidationEffect { return { kind: 'EXACT_PERIOD', effectiveAt }; },
  expectedChanged(): MacroAnalyticsInvalidationEffect { return { kind: 'ALL_PERIODS' }; },
  sharingChanged(): MacroAnalyticsInvalidationEffect { return { kind: 'ALL_PERIODS' }; },
  tagAssignmentChanged(): MacroAnalyticsInvalidationEffect { return { kind: 'ALL_PERIODS' }; },
  importCompleted(): MacroAnalyticsInvalidationEffect { return { kind: 'ALL_PERIODS' }; },
  currentPeriodChanged(): MacroAnalyticsInvalidationEffect { return { kind: 'CURRENT_PERIOD' }; },
});
