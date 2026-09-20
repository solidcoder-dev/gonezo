import type { AnalyticsListMovementFactsInput, AnalyticsListMovementFactsResult } from '../../analytics/application/analytics.port';
import type { SharingFactQuery, SharingFactSourcePort } from '../application/sharingFactSource.port';
import { createSharingFact } from '../domain/sharingFact';
import { toAnalyticsListMovementFactsInput } from './analyticsMovementFactQuery';

type AnalyticsMovementFactReader = Readonly<{
  analyticsListMovementFacts(input: AnalyticsListMovementFactsInput): Promise<AnalyticsListMovementFactsResult>;
}>;

export function createAnalyticsSharingFactSource(analytics: AnalyticsMovementFactReader): SharingFactSourcePort {
  return {
    async listSharingFacts(query: SharingFactQuery) {
      const result = await analytics.analyticsListMovementFacts(toAnalyticsListMovementFactsInput(query));
      return result.items.flatMap((item) => {
        const sharing = item.sharing;
        if (!sharing || item.ignored || (item.type !== 'income' && item.type !== 'expense')) return [];
        return [createSharingFact({
          id: `${item.analyticsFactId}/sharing`,
          occurredAt: item.effectiveAt,
          source: item.source === 'SCHEDULED_PROJECTION' ? 'SCHEDULED' : item.source,
          kind: item.type.toUpperCase() as 'INCOME' | 'EXPENSE',
          currency: item.currency,
          fullAmount: item.fullAmount,
          personalAmount: item.personalAmount,
          participantAllocatedAmount: sharing.participantAllocatedAmount,
          settlementRequiredAmount: sharing.settlementRequiredAmount,
          participantCount: sharing.participantCount,
          settlementParticipantCount: sharing.settlementParticipantCount,
        })];
      });
    },
  };
}
