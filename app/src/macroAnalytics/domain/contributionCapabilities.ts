import type { MacroAnalyticsContribution, MacroAnalyticsContributionV2, MacroAnalyticsContributionV3, MacroAnalyticsContributionV4, MacroAnalyticsContributionV5 } from './macroAnalyticsContribution';

export function hasCategoryContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV2 | MacroAnalyticsContributionV3 | MacroAnalyticsContributionV4 | MacroAnalyticsContributionV5 {
  return contribution.schemaVersion >= 2;
}

export function hasRecurringContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV3 | MacroAnalyticsContributionV4 | MacroAnalyticsContributionV5 {
  return contribution.schemaVersion >= 3;
}

export function hasSharingContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV4 | MacroAnalyticsContributionV5 {
  return contribution.schemaVersion >= 4;
}

export function hasMerchantContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV5 {
  return contribution.schemaVersion >= 5;
}
