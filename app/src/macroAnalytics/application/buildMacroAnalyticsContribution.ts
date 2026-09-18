import { canContribute } from '../domain/analyticsContributionConsent';
import { aggregateFinancialFacts } from '../domain/financialContribution';
import { deriveContributionDimensions } from '../domain/contributionDimensions';
import type { MacroAnalyticsContribution } from '../domain/macroAnalyticsContribution';
import { MACRO_ANALYTICS_SCHEMA_VERSION } from '../domain/macroAnalyticsSchemaVersion';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import type { ContributionProfileSourcePort } from './contributionProfileSource.port';
import type { FinancialFactSourcePort } from './financialFactSource.port';

export type BuildMacroAnalyticsContributionPorts = Readonly<{
  consent: Pick<AnalyticsContributionConsentPort, 'get'>;
  profile: ContributionProfileSourcePort;
  financialFacts: FinancialFactSourcePort;
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
  const contribution: MacroAnalyticsContribution = Object.freeze({
    schemaVersion: MACRO_ANALYTICS_SCHEMA_VERSION,
    period,
    dimensions,
    financial: aggregateFinancialFacts(facts),
  });
  return { status: 'BUILT', contribution };
}
