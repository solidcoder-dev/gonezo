import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
import { canonicalMacroAnalyticsContribution } from '../domain/canonicalMacroAnalyticsContribution';
import { createMacroAnalyticsPublication } from '../domain/macroAnalyticsPublication';
import type { AnalyticsContributorIdentityPort, ContributorIdGenerator } from './analyticsContributorIdentity.port';
import { getOrCreateAnalyticsContributorId } from './analyticsContributorIdentityUseCase';
import type { BuildMacroAnalyticsContributionPorts } from './buildMacroAnalyticsContribution';
import { buildMacroAnalyticsContribution } from './buildMacroAnalyticsContribution';
import type { MacroAnalyticsOutboxPort } from './macroAnalyticsOutbox.port';

export type PrepareMacroAnalyticsPublicationInput = Readonly<{ userId: string; period: string; timeZone: string }>;
export type PrepareMacroAnalyticsPublicationResult =
  | Readonly<{ status: 'PREPARED'; publication: Awaited<ReturnType<typeof createMacroAnalyticsPublication>> }>
  | Readonly<{ status: 'NOT_ELIGIBLE'; reason: 'CONSENT_NOT_GRANTED' | 'PROFILE_UNAVAILABLE' }>;

export async function prepareMacroAnalyticsPublication(
  ports: Readonly<{
    contribution: BuildMacroAnalyticsContributionPorts;
    identity: AnalyticsContributorIdentityPort;
    generateContributorId: ContributorIdGenerator;
    outbox: MacroAnalyticsOutboxPort;
  }>,
  input: PrepareMacroAnalyticsPublicationInput,
): Promise<PrepareMacroAnalyticsPublicationResult> {
  const result = await buildMacroAnalyticsContribution(ports.contribution, input);
  if (result.status === 'NOT_ELIGIBLE') {
    if (result.reason === 'CONSENT_NOT_GRANTED') await ports.outbox.remove(input.userId, createAnalyticsPeriod(input.period));
    return result;
  }

  const period: AnalyticsPeriod = result.contribution.period;
  const contributorId = await getOrCreateAnalyticsContributorId(ports.identity, ports.generateContributorId, input.userId);
  const existing = await ports.outbox.get(input.userId, period);
  if (existing?.contributorId === contributorId
    && canonicalMacroAnalyticsContribution(existing.contribution) === canonicalMacroAnalyticsContribution(result.contribution)) {
    return { status: 'PREPARED', publication: existing };
  }
  const publication = createMacroAnalyticsPublication({
    contributorId,
    period,
    revision: existing && existing.contributorId === contributorId ? existing.revision + 1 : 1,
    contribution: result.contribution,
  });
  await ports.outbox.save(input.userId, publication);
  return { status: 'PREPARED', publication };
}
