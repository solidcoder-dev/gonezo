import { canContribute } from '../domain/analyticsContributionConsent';
import { createAnalyticsPeriod } from '../domain/analyticsPeriod';
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

export async function RunMacroAnalyticsMaintenance(
  ports: Readonly<{
    consent: Pick<AnalyticsContributionConsentPort, 'get'>;
    backfillState: MacroAnalyticsBackfillStatePort;
    rebuildQueue: ContributionRebuildQueuePort;
    periodSource: ContributionPeriodSourcePort;
    outbox: MacroAnalyticsOutboxPort;
    processor: MacroAnalyticsPublicationProcessorPort;
    prepare(input: PrepareMacroAnalyticsPublicationInput): Promise<PrepareMacroAnalyticsPublicationResult>;
  }>,
  input: Readonly<{ userId: string; timeZone: string; now: Date }>,
): Promise<MacroAnalyticsMaintenanceResult> {
  if (!canContribute(await ports.consent.get(input.userId))) {
    return { status: 'CONSENT_NOT_GRANTED', rebuiltPeriods: [], pendingPeriods: await periodValues(ports.rebuildQueue, input.userId) };
  }

  const currentPeriod = currentAnalyticsPeriod(input.now, input.timeZone);
  const state = await ports.backfillState.get(input.userId);
  if (state.initialBackfillVersion < INITIAL_CONTRIBUTION_BACKFILL_VERSION) {
    await enqueueDiscoveredPeriods(ports.periodSource, ports.rebuildQueue, input.userId, input.timeZone, currentPeriod);
    await ports.backfillState.markInitialBackfillComplete(input.userId, INITIAL_CONTRIBUTION_BACKFILL_VERSION);
  }
  if (state.fullRebuildRequested) {
    await enqueueDiscoveredPeriods(ports.periodSource, ports.rebuildQueue, input.userId, input.timeZone, currentPeriod);
    await ports.backfillState.clearFullRebuildRequest(input.userId);
  }
  await ports.rebuildQueue.enqueue(input.userId, currentPeriod);

  const rebuiltPeriods: string[] = [];
  for (const period of await ports.rebuildQueue.list(input.userId)) {
    if (period.value > currentPeriod.value) continue;
    const prepared = await ports.prepare({ userId: input.userId, period: period.value, timeZone: input.timeZone });
    if (prepared.status === 'NOT_ELIGIBLE') {
      if (prepared.reason === 'CONSENT_NOT_GRANTED') {
        return { status: 'CONSENT_NOT_GRANTED', rebuiltPeriods, pendingPeriods: await periodValues(ports.rebuildQueue, input.userId) };
      }
      continue;
    }
    const status = await ports.processor.process(prepared.publication);
    if (status === 'REVISION_CONFLICT') continue;
    await ports.outbox.remove(input.userId, period);
    await ports.rebuildQueue.remove(input.userId, period);
    rebuiltPeriods.push(period.value);
  }

  return { status: 'COMPLETED', rebuiltPeriods, pendingPeriods: await periodValues(ports.rebuildQueue, input.userId) };
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

function currentAnalyticsPeriod(now: Date, timeZone: string): AnalyticsPeriod {
  const parts = new Intl.DateTimeFormat('en-US', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  if (!year || !month) throw new Error('Unable to derive current analytics period');
  return createAnalyticsPeriod(`${year.padStart(4, '0')}-${month}`);
}
