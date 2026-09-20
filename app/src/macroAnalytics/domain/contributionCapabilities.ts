import type { MacroAnalyticsContribution, MacroAnalyticsContributionV2, MacroAnalyticsContributionV3 } from './macroAnalyticsContribution';

export function hasCategoryContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV2 | MacroAnalyticsContributionV3 {
  return contribution.schemaVersion >= 2;
}

export function hasRecurringContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV3 {
  return contribution.schemaVersion === 3;
}
