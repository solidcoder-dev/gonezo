import type { MacroAnalyticsContribution, MacroAnalyticsContributionV2, MacroAnalyticsContributionV3, MacroAnalyticsContributionV4, MacroAnalyticsContributionV5, MacroAnalyticsContributionV6, MacroAnalyticsContributionV7 } from './macroAnalyticsContribution';
import type { TagUsageContributionBucket } from './tagUsageContribution';
import type { TagUsageFactKind, TagUsageFactSource } from './tagUsageFact';

export function hasCategoryContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV2 | MacroAnalyticsContributionV3 | MacroAnalyticsContributionV4 | MacroAnalyticsContributionV5 | MacroAnalyticsContributionV6 | MacroAnalyticsContributionV7 {
  return contribution.schemaVersion >= 2;
}

export function hasRecurringContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV3 | MacroAnalyticsContributionV4 | MacroAnalyticsContributionV5 | MacroAnalyticsContributionV6 | MacroAnalyticsContributionV7 {
  return contribution.schemaVersion >= 3;
}

export function hasSharingContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV4 | MacroAnalyticsContributionV5 | MacroAnalyticsContributionV6 | MacroAnalyticsContributionV7 {
  return contribution.schemaVersion >= 4;
}

export function hasMerchantContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV5 | MacroAnalyticsContributionV6 | MacroAnalyticsContributionV7 {
  return contribution.schemaVersion >= 5;
}

export function hasBalanceContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV6 | MacroAnalyticsContributionV7 {
  return contribution.schemaVersion >= 6;
}

export function hasTagUsageContribution(contribution: MacroAnalyticsContribution): contribution is MacroAnalyticsContributionV7 {
  return contribution.schemaVersion >= 7;
}

export function findTagUsageMovementBucket(
  contribution: MacroAnalyticsContribution,
  currency: string,
  source: TagUsageFactSource,
  kind: TagUsageFactKind,
): TagUsageContributionBucket | null {
  if (!hasTagUsageContribution(contribution)) return null;
  const normalizedCurrency = currency.trim().toUpperCase();
  const bucket = contribution.tagUsage.currencies.find((entry) => entry.currency === normalizedCurrency)
    ?.buckets.find((entry) => entry.source === source && entry.kind === kind);
  return bucket && bucket.movementCount > 0 ? bucket : null;
}
