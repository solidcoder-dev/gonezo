import type { AnalyticsContributionConsentPort } from './analyticsContributionConsent.port';
import type { ContributionRebuildQueuePort } from './contributionRebuildQueue.port';
import type { MacroAnalyticsBackfillStatePort } from './macroAnalyticsBackfillState.port';
import type { MacroAnalyticsOutboxPort } from './macroAnalyticsOutbox.port';

export function withMacroAnalyticsConsentLifecycle(
  consent: AnalyticsContributionConsentPort,
  ports: Readonly<{
    backfillState: Pick<MacroAnalyticsBackfillStatePort, 'requestFullRebuild'>;
    rebuildQueue: Pick<ContributionRebuildQueuePort, 'clear'>;
    outbox: Pick<MacroAnalyticsOutboxPort, 'clear'>;
  }>,
): AnalyticsContributionConsentPort {
  return {
    get: (userId) => consent.get(userId),
    async save(decision) {
      const previous = await consent.get(decision.userId);
      await consent.save(decision);
      if (decision.status === 'GRANTED' && previous?.status !== 'GRANTED') {
        await ports.backfillState.requestFullRebuild(decision.userId);
      }
      if (decision.status !== 'GRANTED') {
        await ports.rebuildQueue.clear(decision.userId);
        await ports.outbox.clear(decision.userId);
      }
    },
  };
}
