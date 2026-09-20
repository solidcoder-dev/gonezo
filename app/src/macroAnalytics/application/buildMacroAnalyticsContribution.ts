import { canContribute } from '../domain/analyticsContributionConsent';
import { aggregateFinancialFacts } from '../domain/financialContribution';
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

export type BuildMacroAnalyticsContributionPorts = Readonly<{
  consent: Pick<AnalyticsContributionConsentPort, 'get'>;
  profile: ContributionProfileSourcePort;
  financialFacts: FinancialFactSourcePort;
  categoryFacts: CategoryFactSourcePort;
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
  const facts = await ports.financialFacts.listFinancialFacts({ period, timeZone: input.timeZone });
  const categoryFacts = await ports.categoryFacts.listCategoryFacts({ period, timeZone: input.timeZone });
  const financial = aggregateFinancialFacts(facts);
  const categories = aggregateCategoryFacts(categoryFacts);
  assertCategoryTotalsReconcile(financial, categories);
  const contribution: MacroAnalyticsContribution = Object.freeze({
    schemaVersion: MACRO_ANALYTICS_SCHEMA_VERSION,
    period,
    dimensions,
    financial,
    categories,
  });
  return { status: 'BUILT', contribution };
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
