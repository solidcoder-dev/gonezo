import type { LedgerTransactionListItem } from '../../ledger/application/ledger.port';
import type { SharingGetMovementDetailsInput, SharingMovementDetailsResult } from '../../sharing/application/sharing.port';
import { buildOverviewSharingInsights } from '../application/overviewSharingInsights';

type OverviewSharingInsightsQueryPort = {
  sharingGetMovementDetails(input: SharingGetMovementDetailsInput): Promise<SharingMovementDetailsResult>;
};

export async function analyticsGetOverviewSharingInsights(
  port: OverviewSharingInsightsQueryPort,
  transactions: LedgerTransactionListItem[],
) {
  const details = await Promise.all(
    transactions
      .filter((transaction) => transaction.type === 'expense')
      .map((transaction) => port.sharingGetMovementDetails({ transactionId: transaction.id })),
  );

  return buildOverviewSharingInsights(details.filter((item) => item != null));
}
