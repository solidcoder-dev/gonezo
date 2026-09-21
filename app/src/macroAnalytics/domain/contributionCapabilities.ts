import type { MacroAnalyticsContribution, MacroAnalyticsContributionV2, MacroAnalyticsContributionV3, MacroAnalyticsContributionV4 } from './macroAnalyticsContribution';

export function hasCategoryContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV2 | MacroAnalyticsContributionV3 | MacroAnalyticsContributionV4 {
  return contribution.schemaVersion >= 2;
}

export function hasRecurringContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV3 | MacroAnalyticsContributionV4 {
  return contribution.schemaVersion >= 3;
}

export function hasSharingContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV4 {
  return contribution.schemaVersion >= 4;
}
