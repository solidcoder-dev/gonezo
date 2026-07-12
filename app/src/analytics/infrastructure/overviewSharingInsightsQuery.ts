import type { LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type { SharingListMovementDetailsInput, SharingListMovementDetailsResult } from '../../sharing/application/sharing.port';
import { buildOverviewSharingInsights } from '../application/overviewSharingInsights';

type OverviewSharingInsightsQueryPort = {
  sharingListMovementDetails(input: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult>;
};

export async function analyticsGetOverviewSharingInsights(
  port: OverviewSharingInsightsQueryPort,
  transactions: LedgerTransactionListItem[],
) {
  const transactionIds = transactions
    .filter((transaction) => transaction.type === 'expense')
    .map((transaction) => transaction.id);
  const details = transactionIds.length > 0
    ? await port.sharingListMovementDetails({ transactionIds })
    : { items: [] };
  return buildOverviewSharingInsights(details.items);
}
