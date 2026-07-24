import type { AnalyticsTransactionReadModel } from './analyticsMovementReader';
import type { SharingListMovementDetailsInput, SharingListMovementDetailsResult } from '../../sharing/application/sharing.port';
import { buildOverviewSharingInsights } from '../application/overviewSharingInsights';

type OverviewSharingInsightsQueryPort = {
  sharingListMovementDetails(input: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult>;
};

export async function analyticsGetOverviewSharingInsights(
  port: OverviewSharingInsightsQueryPort,
  transactions: AnalyticsTransactionReadModel[],
) {
  const transactionIds = transactions
    .filter((transaction) => transaction.type === 'expense' && transaction.reference?.source === 'posted')
    .map((transaction) => transaction.reference?.source === 'posted' ? transaction.reference.transactionId : transaction.id);
  const details = transactionIds.length > 0
    ? await port.sharingListMovementDetails({ transactionIds })
    : { items: [] };
  return buildOverviewSharingInsights(details.items);
}
