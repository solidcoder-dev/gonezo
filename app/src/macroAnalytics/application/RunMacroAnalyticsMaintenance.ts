import { canContribute } from '../domain/analyticsContributionConsent';
import { analyticsPeriodForInstant } from '../domain/analyticsPeriod';
import type { AnalyticsPeriod } from '../domain/analyticsPeriod';
import type { ContributionRebuildQueuePort } from './contributionRebuildQueue.port';
import type { ContributionPeriodSourcePort } from './contributionPeriodSource.port';
import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import type { MacroAnalyticsBackfillStatePort } from './macroAnalyticsBackfillState.port';
import type { MacroAnalyticsOutboxPort } from './macroAnalyticsOutbox.port';
import type { MacroAnalyticsPublicationProcessorPort } from './macroAnalyticsPublicationProcessor.port';
import type { PrepareMacroAnalyticsPublicationInput, PrepareMacroAnalyticsPublicationResult } from './prepareMacroAnalyticsPublication';

export const INITIAL_CONTRIBUTION_BACKFILL_VERSION = 1;

export type MacroAnalyticsMaintenanceResult = Readonly<{
  status: 'COMPLETED' | 'CONSENT_NOT_GRANTED';
  rebuiltPeriods: readonly string[];
  pendingPeriods: readonly string[];
}>;

type MacroAnalyticsMaintenancePorts = Readonly<{
  consent: Pick<AnalyticsContributionConsentPort, 'get'>;
  backfillState: MacroAnalyticsBackfillStatePort;
  rebuildQueue: ContributionRebuildQueuePort;
  periodSource: ContributionPeriodSourcePort;
  outbox: MacroAnalyticsOutboxPort;
  processor: MacroAnalyticsPublicationProcessorPort;
  prepare(input: PrepareMacroAnalyticsPublicationInput): Promise<PrepareMacroAnalyticsPublicationResult>;
}>;

export async function RunMacroAnalyticsMaintenance(
  ports: MacroAnalyticsMaintenancePorts,
  input: Readonly<{ userId: string; timeZone: string; now: Date }>,
): Promise<MacroAnalyticsMaintenanceResult> {
  if (!canContribute(await ports.consent.get(input.userId))) {
    return { status: 'CONSENT_NOT_GRANTED', rebuiltPeriods: [], pendingPeriods: await periodValues(ports.rebuildQueue, input.userId) };
  }

  const currentPeriod = analyticsPeriodForInstant(input.now.toISOString(), input.timeZone);
  const state = await ports.backfillState.get(input.userId);
  if (state.initialBackfillVersion < INITIAL_CONTRIBUTION_BACKFILL_VERSION) {
    await enqueueDiscoveredPeriods(ports.periodSource, ports.rebuildQueue, input.userId, input.timeZone, currentPeriod);
    await ports.backfillState.markInitialBackfillComplete(input.userId, INITIAL_CONTRIBUTION_BACKFILL_VERSION);
  }
  if (state.fullRebuildRequested) {
    await enqueueDiscoveredPeriods(ports.periodSource, ports.rebuildQueue, input.userId, input.timeZone, currentPeriod);
    await ports.backfillState.clearFullRebuildRequest(input.userId, state.fullRebuildRequestVersion);
  }
  await ports.rebuildQueue.enqueue(input.userId, currentPeriod);

  const rebuilding = await rebuildQueuedPeriods(ports, input.userId, input.timeZone, currentPeriod);
  if (rebuilding.status === 'CONSENT_NOT_GRANTED') {
    return { status: rebuilding.status, rebuiltPeriods: rebuilding.rebuiltPeriods, pendingPeriods: await periodValues(ports.rebuildQueue, input.userId) };
  }
  await processUnqueuedPublications(ports, input.userId, currentPeriod, rebuilding.attemptedPeriods);

  return { status: 'COMPLETED', rebuiltPeriods: rebuilding.rebuiltPeriods, pendingPeriods: await periodValues(ports.rebuildQueue, input.userId) };
}

async function rebuildQueuedPeriods(
  ports: Pick<MacroAnalyticsMaintenancePorts, 'rebuildQueue' | 'outbox' | 'processor' | 'prepare'>,
  userId: string,
  timeZone: string,
  currentPeriod: AnalyticsPeriod,
): Promise<Readonly<{ status: 'COMPLETED' | 'CONSENT_NOT_GRANTED'; rebuiltPeriods: readonly string[]; attemptedPeriods: ReadonlySet<string> }>> {
  const rebuiltPeriods: string[] = [];
  const attemptedPeriods = new Set<string>();
  for (const period of await ports.rebuildQueue.list(userId)) {
    if (period.value > currentPeriod.value) continue;
    attemptedPeriods.add(period.value);
    const prepared = await ports.prepare({ userId, period: period.value, timeZone });
    if (prepared.status === 'NOT_ELIGIBLE') {
      if (prepared.reason === 'CONSENT_NOT_GRANTED') return { status: 'CONSENT_NOT_GRANTED', rebuiltPeriods, attemptedPeriods };
      continue;
    }
    const processingStatus = await ports.processor.process(prepared.publication);
    if (processingStatus === 'REVISION_CONFLICT') continue;
    await ports.outbox.remove(userId, period);
    await ports.rebuildQueue.remove(userId, period);
    rebuiltPeriods.push(period.value);
  }
  return { status: 'COMPLETED', rebuiltPeriods, attemptedPeriods };
}

async function processUnqueuedPublications(
  ports: Pick<MacroAnalyticsMaintenancePorts, 'outbox' | 'processor'>,
  userId: string,
  currentPeriod: AnalyticsPeriod,
  attemptedPeriods: ReadonlySet<string>,
): Promise<void> {
  for (const publication of await ports.outbox.listPending(userId)) {
    if (publication.period.value > currentPeriod.value || attemptedPeriods.has(publication.period.value)) continue;
    const status = await ports.processor.process(publication);
    if (status !== 'REVISION_CONFLICT') await ports.outbox.remove(userId, publication.period);
  }
}

async function enqueueDiscoveredPeriods(
  source: ContributionPeriodSourcePort,
  queue: ContributionRebuildQueuePort,
  userId: string,
  timeZone: string,
  currentPeriod: AnalyticsPeriod,
): Promise<void> {
  for (const period of await source.listPeriods(timeZone, currentPeriod)) {
    if (period.value <= currentPeriod.value) await queue.enqueue(userId, period);
  }
}

async function periodValues(queue: ContributionRebuildQueuePort, userId: string): Promise<readonly string[]> {
  return (await queue.list(userId)).map(({ value }) => value);
}
