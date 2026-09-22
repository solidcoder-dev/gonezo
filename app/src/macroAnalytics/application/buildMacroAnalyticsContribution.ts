import { canContribute } from '../domain/analyticsContributionConsent';
import { aggregateFinancialFacts } from '../domain/financialContribution';
import { aggregateCategoryFacts } from '../domain/categoryContribution';
import { deriveContributionDimensions } from '../domain/contributionDimensions';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { MACRO_ANALYTICS_SCHEMA_VERSION } from '../domain/macroAnalyticsSchemaVersion';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import type { ContributionProfileSourcePort } from './contributionProfileSource.port';
import { aggregateRecurringFacts } from '../domain/recurringContribution';
import { aggregateSharingFacts } from '../domain/sharingContribution';
import { aggregateMerchantFacts } from '../domain/merchantContribution';
import { MACRO_MERCHANT_CATALOG_VERSION } from '../domain/macroMerchantCatalogVersion';
import { aggregateAccountBalanceFacts } from '../domain/accountBalanceContribution';
import type { AccountBalanceFactSourcePort } from './accountBalanceFactSource.port';
import { aggregateTagUsageFacts } from '../domain/tagUsageContribution';
import type { ContributionFactSetSourcePort } from './contributionFactSetSource.port';
import { ContributionConsistencyValidator } from './contributionConsistencyValidator';

export type BuildMacroAnalyticsContributionPorts = Readonly<{
  consent: Pick<AnalyticsContributionConsentPort, 'get'>;
  profile: ContributionProfileSourcePort;
  accountBalanceFacts: AccountBalanceFactSourcePort;
  factSet: ContributionFactSetSourcePort;
}>;

export type BuildMacroAnalyticsContributionInput = Readonly<{ userId: string; period: string; timeZone: string }>;
export type BuildMacroAnalyticsContributionResult =
  | Readonly<{ status: 'BUILT'; contribution: MacroAnalyticsContribution }>
  | Readonly<{ status: 'NOT_ELIGIBLE'; reason: 'CONSENT_NOT_GRANTED' | 'PROFILE_UNAVAILABLE' }>;

export async function buildMacroAnalyticsContribution(ports: BuildMacroAnalyticsContributionPorts, input: BuildMacroAnalyticsContributionInput): Promise<BuildMacroAnalyticsContributionResult> {
  const consent = await ports.consent.get(input.userId);
  if (!canContribute(consent)) return { status: 'NOT_ELIGIBLE', reason: 'CONSENT_NOT_GRANTED' };
  const profile = await ports.profile.get(input.userId);
  if (!profile) return { status: 'NOT_ELIGIBLE', reason: 'PROFILE_UNAVAILABLE' };
  const period = createAnalyticsPeriod(input.period);
  const dimensions = deriveContributionDimensions(profile, period);
  if (!dimensions) return { status: 'NOT_ELIGIBLE', reason: 'PROFILE_UNAVAILABLE' };

  const facts = await ports.factSet.readContributionFacts({ period, timeZone: input.timeZone });
  const balanceFacts = await ports.accountBalanceFacts.listAccountBalanceFacts({ period, timeZone: input.timeZone });
  const financial = aggregateFinancialFacts(facts.financial);
  const categories = aggregateCategoryFacts(facts.categories);
  const recurring = aggregateRecurringFacts(facts.recurring);
  const sharing = aggregateSharingFacts(facts.sharing);
  const merchants = aggregateMerchantFacts(facts.merchants, MACRO_MERCHANT_CATALOG_VERSION);
  const balances = aggregateAccountBalanceFacts(balanceFacts, period);
  const tagUsage = aggregateTagUsageFacts(facts.tagUsage);
  ContributionConsistencyValidator.validate({ financial, categories, recurring, sharing, merchants, tagUsage });

  return { status: 'BUILT', contribution: Object.freeze({ schemaVersion: MACRO_ANALYTICS_SCHEMA_VERSION, period, dimensions, financial, categories, recurring, sharing, merchants, balances, tagUsage }) };
}
