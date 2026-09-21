import type { MacroAnalyticsContribution } from './macroAnalyticsContribution';
import { hasCategoryContribution, hasRecurringContribution, hasSharingContribution, hasMerchantContribution, hasBalanceContribution, hasTagUsageContribution } from './contributionCapabilities';
import { MACRO_ACCOUNT_TYPE_ORDER } from './accountBalanceContribution';

function compareCanonicalText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function canonicalMacroAnalyticsContribution(contribution: MacroAnalyticsContribution): string {
  const canonical = {
    schemaVersion: contribution.schemaVersion,
    period: { kind: contribution.period.kind, value: contribution.period.value },
    dimensions: {
      countryCode: contribution.dimensions.countryCode,
      regionCode: contribution.dimensions.regionCode,
      sex: contribution.dimensions.sex,
      ageBand: contribution.dimensions.ageBand,
    },
    financial: {
      currencies: [...contribution.financial.currencies]
        .sort((left, right) => compareCanonicalText(left.currency, right.currency))
        .map(({ currency, buckets }) => ({
          currency,
          buckets: [...buckets]
            .sort((left, right) => compareCanonicalText(left.source, right.source) || compareCanonicalText(left.kind, right.kind))
            .map(({ source, kind, amount, count }) => ({ source, kind, amount, count })),
        })),
    },
  };
  if (!hasCategoryContribution(contribution)) return JSON.stringify(canonical);
  const withCategories = {
    ...canonical,
    categories: {
      currencies: [...contribution.categories.currencies]
        .sort((left, right) => compareCanonicalText(left.currency, right.currency))
        .map(({ currency, buckets }) => ({
          currency,
          buckets: [...buckets]
            .sort((left, right) => compareCanonicalText(left.source, right.source)
              || compareCanonicalText(left.kind, right.kind)
              || compareCanonicalText(left.category, right.category))
            .map(({ source, kind, category, amount }) => ({ source, kind, category, amount })),
        })),
    },
  };
  if (!hasRecurringContribution(contribution)) return JSON.stringify(withCategories);
  const withRecurring = {
    ...withCategories,
    recurring: {
      currencies: [...contribution.recurring.currencies]
        .sort((left, right) => compareCanonicalText(left.currency, right.currency))
        .map(({ currency, buckets }) => ({
          currency,
          buckets: [...buckets]
            .sort((left, right) => compareCanonicalText(left.source, right.source) || compareCanonicalText(left.kind, right.kind))
            .map(({ source, kind, amount, occurrenceCount, seriesCount }) => ({ source, kind, amount, occurrenceCount, seriesCount })),
        })),
    },
  };
  if (!hasSharingContribution(contribution)) return JSON.stringify(withRecurring);
  const withSharing = {
    ...withRecurring,
    sharing: {
      currencies: [...contribution.sharing.currencies]
        .sort((left, right) => compareCanonicalText(left.currency, right.currency))
        .map(({ currency, buckets }) => ({
          currency,
          buckets: [...buckets]
            .sort((left, right) => compareCanonicalText(left.source, right.source) || compareCanonicalText(left.kind, right.kind))
            .map(({ source, kind, fullAmount, personalAmount, participantAllocatedAmount, settlementRequiredAmount, movementCount, participantCount, settlementParticipantCount }) => ({
              source, kind, fullAmount, personalAmount, participantAllocatedAmount, settlementRequiredAmount,
              movementCount, participantCount, settlementParticipantCount,
            })),
        })),
    },
  };
  if (!hasMerchantContribution(contribution)) return JSON.stringify(withSharing);
  const withMerchants = {
    ...withSharing,
    merchants: {
      catalogVersion: contribution.merchants.catalogVersion,
      currencies: [...contribution.merchants.currencies].sort((left, right) => compareCanonicalText(left.currency, right.currency)).map(({ currency, buckets }) => ({
        currency,
        buckets: [...buckets]
          .sort((left, right) => compareCanonicalText(left.source, right.source) || compareCanonicalText(left.kind, right.kind) || compareCanonicalText(left.merchant, right.merchant))
          .map(({ source, kind, merchant, amount, movementCount }) => ({ source, kind, merchant, amount, movementCount })),
      })),
    },
  };
  if (!hasBalanceContribution(contribution)) return JSON.stringify(withMerchants);
  const withBalances = {
    ...withMerchants,
    balances: {
      currencies: [...contribution.balances.currencies].sort((left, right) => compareCanonicalText(left.currency, right.currency)).map(({ currency, buckets }) => ({
        currency,
        buckets: [...buckets].sort((left, right) => MACRO_ACCOUNT_TYPE_ORDER.indexOf(left.accountType) - MACRO_ACCOUNT_TYPE_ORDER.indexOf(right.accountType)).map(({ accountType, balanceAmount, accountCount }) => ({ accountType, balanceAmount, accountCount })),
      })),
    },
  };
  if (!hasTagUsageContribution(contribution)) return JSON.stringify(withBalances);
  return JSON.stringify({
    ...withBalances,
    tagUsage: {
      currencies: [...contribution.tagUsage.currencies].sort((left, right) => compareCanonicalText(left.currency, right.currency)).map(({ currency, buckets }) => ({
        currency,
        buckets: [...buckets].sort((left, right) => compareCanonicalText(left.source, right.source) || compareCanonicalText(left.kind, right.kind)).map(({ source, kind, amount, movementCount, taggedAmount, taggedMovementCount }) => ({
          source, kind, amount, movementCount, taggedAmount, taggedMovementCount,
        })),
      })),
    },
  });
}
