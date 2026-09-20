import { RunMacroAnalyticsMaintenance } from '../application/RunMacroAnalyticsMaintenance';
import { prepareMacroAnalyticsPublication } from '../application/prepareMacroAnalyticsPublication';
import { SerializedMacroAnalyticsMaintenanceRunner } from '../application/SerializedMacroAnalyticsMaintenanceRunner';
import { NativeAnalyticsContributionConsentAdapter } from './NativeAnalyticsContributionConsentAdapter';
import { NativeAnalyticsContributorIdentityAdapter, NativeMacroAnalyticsOutboxAdapter } from './NativeMacroAnalyticsAdapters';
import { NativeLatestMacroAnalyticsPublicationAdapter } from './NativeLatestMacroAnalyticsPublicationAdapter';
import { NativeContributionRebuildQueueAdapter } from './NativeContributionRebuildQueueAdapter';
import { NativeMacroAnalyticsBackfillStateAdapter } from './NativeMacroAnalyticsBackfillStateAdapter';
import { LocalMacroAnalyticsPublicationProcessor } from '../application/LocalMacroAnalyticsPublicationProcessor';
import { createAnalyticsFinancialFactSource } from './analyticsFinancialFactSource';
import { createAnalyticsContributionPeriodSource } from './analyticsContributionPeriodSource';
import { createAnalyticsProfileContributionAdapter } from './analyticsProfileContributionAdapter';
import { generateAnalyticsContributorId } from './randomAnalyticsContributorId';
import type { AnalyticsProfilePort } from '../../analyticsProfile/application/analyticsProfile.port';
import { CorePlugin } from '../../core/infrastructure/corePlugin';

const runner = new SerializedMacroAnalyticsMaintenanceRunner();
const consent = new NativeAnalyticsContributionConsentAdapter();
const financialFacts = createAnalyticsFinancialFactSource(CorePlugin);
const identity = new NativeAnalyticsContributorIdentityAdapter();
const outbox = new NativeMacroAnalyticsOutboxAdapter();
const latest = new NativeLatestMacroAnalyticsPublicationAdapter();
const rebuildQueue = new NativeContributionRebuildQueueAdapter();
const backfillState = new NativeMacroAnalyticsBackfillStateAdapter();
const processor = new LocalMacroAnalyticsPublicationProcessor(latest);
const periodSource = createAnalyticsContributionPeriodSource(CorePlugin);

export function runDefaultMacroAnalyticsMaintenance(userId: string, analyticsProfile: Pick<AnalyticsProfilePort, 'get'>): Promise<void> {
  return runner.run(userId, async () => {
    await RunMacroAnalyticsMaintenance({
      consent,
      backfillState,
      rebuildQueue,
      periodSource,
      outbox,
      processor,
      prepare: (input) => prepareMacroAnalyticsPublication({
        contribution: { consent, profile: createAnalyticsProfileContributionAdapter(analyticsProfile), financialFacts }, identity,
        generateContributorId: generateAnalyticsContributorId,
        outbox,
        latest,
      }, input),
    }, {
      userId,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      now: new Date(),
    });
  });
}
