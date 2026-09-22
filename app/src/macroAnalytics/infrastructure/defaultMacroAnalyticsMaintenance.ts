import { RunMacroAnalyticsMaintenance } from '../application/RunMacroAnalyticsMaintenance';
import { prepareMacroAnalyticsPublication } from '../application/prepareMacroAnalyticsPublication';
import { SerializedMacroAnalyticsMaintenanceRunner } from '../application/SerializedMacroAnalyticsMaintenanceRunner';
import { NativeAnalyticsContributionConsentAdapter } from './NativeAnalyticsContributionConsentAdapter';
import { NativeAnalyticsContributorIdentityAdapter, NativeMacroAnalyticsOutboxAdapter } from './NativeMacroAnalyticsAdapters';
import { NativeLatestMacroAnalyticsPublicationAdapter } from './NativeLatestMacroAnalyticsPublicationAdapter';
import { NativeContributionRebuildQueueAdapter } from './NativeContributionRebuildQueueAdapter';
import { NativeMacroAnalyticsBackfillStateAdapter } from './NativeMacroAnalyticsBackfillStateAdapter';
import { LocalMacroAnalyticsPublicationProcessor } from '../application/LocalMacroAnalyticsPublicationProcessor';
import { createAnalyticsContributionPeriodSource } from './analyticsContributionPeriodSource';
import { createAnalyticsProfileContributionAdapter } from './analyticsProfileContributionAdapter';
import { generateAnalyticsContributorId } from './randomAnalyticsContributorId';
import type { AnalyticsProfilePort } from '../../analyticsProfile/application/analyticsProfile.port';
import { CorePlugin } from '../../core/infrastructure/corePlugin';
import { canonicalMerchantCatalog } from './canonicalMerchantCatalog';
import { createCanonicalMerchantResolver } from './canonicalMerchantResolver';
import { createAnalyticsAccountBalanceFactSource } from './analyticsAccountBalanceFactSource';
import { createAnalyticsPeriodSnapshotSource } from './analyticsPeriodSnapshotSource';

const runner = new SerializedMacroAnalyticsMaintenanceRunner();
const consent = new NativeAnalyticsContributionConsentAdapter();
const merchantResolver = createCanonicalMerchantResolver(canonicalMerchantCatalog);
const accountBalanceFacts = createAnalyticsAccountBalanceFactSource(CorePlugin);
const snapshot = createAnalyticsPeriodSnapshotSource(CorePlugin);
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
          contribution: { consent, profile: createAnalyticsProfileContributionAdapter(analyticsProfile), accountBalanceFacts, snapshot, merchantResolver }, identity,
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
