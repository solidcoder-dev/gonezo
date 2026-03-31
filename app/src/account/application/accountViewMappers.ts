import type { LedgerAccountItem } from '../../shared/domain/corePort';
import type { AccountSummaryView } from '../domain/accountView.types';

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
