import { canContribute } from '../domain/analyticsContributionConsent';
import { aggregateFinancialFacts, financialContributionAmount, type FinancialContribution } from '../domain/financialContribution';
import { aggregateCategoryFacts } from '../domain/categoryContribution';
import { ExactDecimal } from '../../shared/domain/exactDecimal';
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
import type { TagUsageContribution } from '../domain/tagUsageContribution';
import type { AnalyticsPeriodSnapshotPort } from './analyticsPeriodSnapshot.port';
import { projectCategoryFacts, projectFinancialFacts, projectMerchantFacts, projectRecurringFacts, projectSharingFacts, projectTagUsageFacts } from './analyticsFactProjectors';
import type { CanonicalMerchantResolverPort } from './canonicalMerchantResolver.port';

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

export type BuildMacroAnalyticsContributionInput = Readonly<{
  userId: string;
  period: string;
  timeZone: string;
}>;

export type BuildMacroAnalyticsContributionResult =
  | Readonly<{ status: 'BUILT'; contribution: MacroAnalyticsContribution }>
  | Readonly<{ status: 'NOT_ELIGIBLE'; reason: 'CONSENT_NOT_GRANTED' | 'PROFILE_UNAVAILABLE' }>;

export async function buildMacroAnalyticsContribution(
  ports: BuildMacroAnalyticsContributionPorts,
  input: BuildMacroAnalyticsContributionInput,
): Promise<BuildMacroAnalyticsContributionResult> {
  const consent = await ports.consent.get(input.userId);
  if (!canContribute(consent)) return { status: 'NOT_ELIGIBLE', reason: 'CONSENT_NOT_GRANTED' };

  const profile = await ports.profile.get(input.userId);
  if (!profile) return { status: 'NOT_ELIGIBLE', reason: 'PROFILE_UNAVAILABLE' };

  const period = createAnalyticsPeriod(input.period);
  const dimensions = deriveContributionDimensions(profile, period);
  if (!dimensions) return { status: 'NOT_ELIGIBLE', reason: 'PROFILE_UNAVAILABLE' };
  const snapshot = ports.snapshot ? await ports.snapshot.readPeriodSnapshot({ period, timeZone: input.timeZone }) : undefined;
  const facts = snapshot ? projectFinancialFacts(snapshot) : await ports.financialFacts!.listFinancialFacts({ period, timeZone: input.timeZone });
  const categoryFacts = snapshot ? projectCategoryFacts(snapshot) : await ports.categoryFacts!.listCategoryFacts({ period, timeZone: input.timeZone });
  const recurringFacts = snapshot ? projectRecurringFacts(snapshot) : await ports.recurringFacts!.listRecurringFacts({ period, timeZone: input.timeZone });
  const sharingFacts = snapshot ? projectSharingFacts(snapshot) : await ports.sharingFacts!.listSharingFacts({ period, timeZone: input.timeZone });
  const merchantFacts = snapshot && ports.merchantResolver ? projectMerchantFacts(snapshot, ports.merchantResolver) : await ports.merchantFacts!.listMerchantFacts({ period, timeZone: input.timeZone });
  const balanceFacts = await ports.accountBalanceFacts.listAccountBalanceFacts({ period, timeZone: input.timeZone });
  const tagUsageFacts = snapshot ? projectTagUsageFacts(snapshot) : await ports.tagUsageFacts!.listTagUsageFacts({ period, timeZone: input.timeZone });
  const financial = aggregateFinancialFacts(facts);
  const categories = aggregateCategoryFacts(categoryFacts);
  const recurring = aggregateRecurringFacts(recurringFacts);
  const sharing = aggregateSharingFacts(sharingFacts);
  const merchants = aggregateMerchantFacts(merchantFacts, MACRO_MERCHANT_CATALOG_VERSION);
  const balances = aggregateAccountBalanceFacts(balanceFacts, period);
  const tagUsage = aggregateTagUsageFacts(tagUsageFacts);
  assertCategoryTotalsReconcile(financial, categories);
  assertRecurringTotalsDoNotExceedFinancial(financial, recurring);
  assertSharingPersonalTotalsDoNotExceedFinancial(financial, sharing);
  assertMerchantTotalsDoNotExceedFinancial(financial, merchants);
  assertTagUsageReconcilesWithFinancial(financial, tagUsage);
  const contribution: MacroAnalyticsContribution = Object.freeze({
    schemaVersion: MACRO_ANALYTICS_SCHEMA_VERSION,
    period,
    dimensions,
    financial,
    categories,
    recurring,
    sharing,
    merchants,
    balances,
    tagUsage,
  });
  return { status: 'BUILT', contribution };
}

function assertTagUsageReconcilesWithFinancial(financial: FinancialContribution, tagUsage: TagUsageContribution): void {
  for (const { currency, buckets } of tagUsage.currencies) for (const bucket of buckets) {
    const financialBucket = financial.currencies.find((entry) => entry.currency === currency)
      ?.buckets.find((entry) => entry.source === bucket.source && entry.kind === bucket.kind);
    if (ExactDecimal.from(bucket.amount).compare(ExactDecimal.from(financialContributionAmount(financial, currency, bucket.source, bucket.kind))) !== 0) {
      throw new Error(`Tag usage contribution does not reconcile with financial contribution for ${currency}:${bucket.source}:${bucket.kind}`);
    }
    if (bucket.movementCount < (financialBucket?.count ?? 0)) {
      throw new Error(`Tag usage movement count is below financial contribution for ${currency}:${bucket.source}:${bucket.kind}`);
    }
  }
  for (const { currency, buckets } of financial.currencies) for (const bucket of buckets) {
    if ((bucket.kind !== 'INCOME' && bucket.kind !== 'EXPENSE') || ExactDecimal.from(bucket.amount).compare(ExactDecimal.from('0')) <= 0) continue;
    const tagUsageBucket = tagUsage.currencies.find((entry) => entry.currency === currency)
      ?.buckets.find((entry) => entry.source === bucket.source && entry.kind === bucket.kind);
    if (!tagUsageBucket) throw new Error(`Financial contribution is missing from tag usage for ${currency}:${bucket.source}:${bucket.kind}`);
  }
}

function assertMerchantTotalsDoNotExceedFinancial(
  financial: ReturnType<typeof aggregateFinancialFacts>,
  merchants: ReturnType<typeof aggregateMerchantFacts>,
): void {
  for (const { currency, buckets } of merchants.currencies) for (const bucket of buckets) {
    const financialAmount = financialContributionAmount(financial, currency, bucket.source, bucket.kind);
    if (ExactDecimal.from(bucket.amount).compare(ExactDecimal.from(financialAmount)) > 0) {
      throw new Error(`Merchant contribution exceeds financial contribution for ${currency}:${bucket.source}:${bucket.kind}`);
    }
  }
}

function assertSharingPersonalTotalsDoNotExceedFinancial(
  financial: ReturnType<typeof aggregateFinancialFacts>,
  sharing: ReturnType<typeof aggregateSharingFacts>,
): void {
  for (const { currency, buckets } of sharing.currencies) for (const bucket of buckets) {
    const financialAmount = financialContributionAmount(financial, currency, bucket.source, bucket.kind);
    if (ExactDecimal.from(bucket.personalAmount).compare(ExactDecimal.from(financialAmount)) > 0) {
      throw new Error(`Sharing personal contribution exceeds financial contribution for ${currency}:${bucket.source}:${bucket.kind}`);
    }
  }
}

function assertRecurringTotalsDoNotExceedFinancial(
  financial: ReturnType<typeof aggregateFinancialFacts>,
  recurring: ReturnType<typeof aggregateRecurringFacts>,
): void {
  for (const { currency, buckets } of recurring.currencies) for (const bucket of buckets) {
    const financialAmount = financialContributionAmount(financial, currency, bucket.source, bucket.kind);
    if (ExactDecimal.from(bucket.amount).compare(ExactDecimal.from(financialAmount)) > 0) {
      throw new Error(`Recurring contribution exceeds financial contribution for ${currency}:${bucket.source}:${bucket.kind}`);
    }
  }
}

function assertCategoryTotalsReconcile(
  financial: ReturnType<typeof aggregateFinancialFacts>,
  categories: ReturnType<typeof aggregateCategoryFacts>,
): void {
  const totalByKey = (currencies: readonly { currency: string; buckets: readonly { source: string; kind: string; amount: string }[] }[]) => {
    const totals = new Map<string, ExactDecimal>();
    for (const { currency, buckets } of currencies) for (const bucket of buckets) {
      if (bucket.kind !== 'INCOME' && bucket.kind !== 'EXPENSE') continue;
      const key = JSON.stringify([currency, bucket.source, bucket.kind]);
      totals.set(key, (totals.get(key) ?? ExactDecimal.from('0')).add(ExactDecimal.from(bucket.amount)));
    }
    return totals;
  };
  const financialTotals = totalByKey(financial.currencies);
  const categoryTotals = totalByKey(categories.currencies);
  const keys = new Set([...financialTotals.keys(), ...categoryTotals.keys()]);
  for (const key of keys) {
    if ((financialTotals.get(key) ?? ExactDecimal.from('0')).compare(categoryTotals.get(key) ?? ExactDecimal.from('0')) !== 0) {
      throw new Error(`Category contribution does not reconcile with financial contribution for ${key}`);
    }
  }
}
