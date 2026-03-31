import { RecentTransactionsListView } from './RecentTransactionsListView';
import type { TransactionHistoryViewProps } from './TransactionHistoryView.contract';

export type {
  TransactionHistoryViewProps,
  TransactionHistoryViewProvided,
  TransactionHistoryViewRequired,
} from './TransactionHistoryView.contract';

export function TransactionHistoryView({ required, provided }: TransactionHistoryViewProps) {
  return (
    <RecentTransactionsListView
      required={{
        items: required.state.items,
        hiddenCount: required.state.hiddenCount,
        expanded: required.state.expanded,
        disabled: required.status.disabled,
        pendingVoidTransactionId: required.state.pendingVoidTransactionId,
      }}
      provided={{
        onViewAll: provided.commands.expandHistory,
        onVoid: provided.commands.requestVoid,
      }}
    />
  );
}
