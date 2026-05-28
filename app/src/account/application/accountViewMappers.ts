import type { LedgerAccountItem } from '../../ledger/application/ledger.port';
import type { AccountSummaryView } from './accountView.types';

function toAccountStatus(status: LedgerAccountItem['status']): AccountSummaryView['status'] {
  if (status === 'archived') {
    return 'archived';
  }
  if (status === 'deleted') {
    return 'deleted';
  }
  return 'active';
}

export function mapAccountSummaryList(input: LedgerAccountItem[]): AccountSummaryView[] {
  return input.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    currency: item.currency,
    status: toAccountStatus(item.status),
  }));
}
