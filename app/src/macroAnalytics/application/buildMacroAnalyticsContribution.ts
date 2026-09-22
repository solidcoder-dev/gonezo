import { canContribute } from '../domain/analyticsContributionConsent';
import { aggregateFinancialFacts } from '../domain/financialContribution';
import { aggregateCategoryFacts } from '../domain/categoryContribution';
import { deriveContributionDimensions } from '../domain/contributionDimensions';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { MACRO_ANALYTICS_SCHEMA_VERSION } from '../domain/macroAnalyticsSchemaVersion';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import type { ContributionProfileSourcePort } from './contributionProfileSource.port';
import type { FinancialFactSourcePort } from './financialFactSource.port';
import type { CategoryFactSourcePort } from './categoryFactSource.port';
import { aggregateRecurringFacts } from '../domain/recurringContribution';
import type { RecurringFactSourcePort } from './recurringFactSource.port';
import { aggregateSharingFacts } from '../domain/sharingContribution';
import type { SharingFactSourcePort } from './sharingFactSource.port';
import { aggregateMerchantFacts } from '../domain/merchantContribution';
import type { MerchantFactSourcePort } from './merchantFactSource.port';
import { MACRO_MERCHANT_CATALOG_VERSION } from '../domain/macroMerchantCatalogVersion';
import { aggregateAccountBalanceFacts } from '../domain/accountBalanceContribution';
import type { AccountBalanceFactSourcePort } from './accountBalanceFactSource.port';
import { aggregateTagUsageFacts } from '../domain/tagUsageContribution';
import type { TagUsageFactSourcePort } from './tagUsageFactSource.port';
import type { AnalyticsPeriodSnapshotPort } from './analyticsPeriodSnapshot.port';
import { projectCategoryFacts, projectFinancialFacts, projectMerchantFacts, projectRecurringFacts, projectSharingFacts, projectTagUsageFacts } from './analyticsFactProjectors';
import type { CanonicalMerchantResolverPort } from './canonicalMerchantResolver.port';
import { ContributionConsistencyValidator } from './contributionConsistencyValidator';

export type BuildMacroAnalyticsContributionPorts = Readonly<{
  consent: Pick<AnalyticsContributionConsentPort, 'get'>;
  profile: ContributionProfileSourcePort;
  financialFacts?: FinancialFactSourcePort;
  categoryFacts?: CategoryFactSourcePort;
  recurringFacts?: RecurringFactSourcePort;
  sharingFacts?: SharingFactSourcePort;
  merchantFacts?: MerchantFactSourcePort;
  accountBalanceFacts: AccountBalanceFactSourcePort;
  tagUsageFacts?: TagUsageFactSourcePort;
  snapshot?: AnalyticsPeriodSnapshotPort;
  merchantResolver?: CanonicalMerchantResolverPort;
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

  const snapshot = ports.snapshot ? await ports.snapshot.readPeriodSnapshot({ period, timeZone: input.timeZone }) : undefined;
  const financialFacts = snapshot ? projectFinancialFacts(snapshot) : await ports.financialFacts!.listFinancialFacts({ period, timeZone: input.timeZone });
  const categoryFacts = snapshot ? projectCategoryFacts(snapshot) : await ports.categoryFacts!.listCategoryFacts({ period, timeZone: input.timeZone });
  const recurringFacts = snapshot ? projectRecurringFacts(snapshot) : await ports.recurringFacts!.listRecurringFacts({ period, timeZone: input.timeZone });
  const sharingFacts = snapshot ? projectSharingFacts(snapshot) : await ports.sharingFacts!.listSharingFacts({ period, timeZone: input.timeZone });
  const merchantFacts = snapshot && ports.merchantResolver ? projectMerchantFacts(snapshot, ports.merchantResolver) : await ports.merchantFacts!.listMerchantFacts({ period, timeZone: input.timeZone });
  const balanceFacts = await ports.accountBalanceFacts.listAccountBalanceFacts({ period, timeZone: input.timeZone });
  const tagUsageFacts = snapshot ? projectTagUsageFacts(snapshot) : await ports.tagUsageFacts!.listTagUsageFacts({ period, timeZone: input.timeZone });

  const financial = aggregateFinancialFacts(financialFacts);
  const categories = aggregateCategoryFacts(categoryFacts);
  const recurring = aggregateRecurringFacts(recurringFacts);
  const sharing = aggregateSharingFacts(sharingFacts);
  const merchants = aggregateMerchantFacts(merchantFacts, MACRO_MERCHANT_CATALOG_VERSION);
  const balances = aggregateAccountBalanceFacts(balanceFacts, period);
  const tagUsage = aggregateTagUsageFacts(tagUsageFacts);
  ContributionConsistencyValidator.validate({ financial, categories, recurring, sharing, merchants, tagUsage });

  return { status: 'BUILT', contribution: Object.freeze({ schemaVersion: MACRO_ANALYTICS_SCHEMA_VERSION, period, dimensions, financial, categories, recurring, sharing, merchants, balances, tagUsage }) };
}
