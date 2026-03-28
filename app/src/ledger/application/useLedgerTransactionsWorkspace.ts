import type { LedgerTransactionListItem } from '../../shared/domain/corePort';

type LedgerTransactionsWorkspaceSlice = {
  refreshing: boolean;
  postingTransaction: boolean;
  visibleTransactions: LedgerTransactionListItem[];
  hiddenTransactionsCount: number;
  historyExpanded: boolean;
  pendingVoidTransactionId: string;
  expandHistory: () => void;
  voidTransaction: (transactionId: string) => void;
};

export function useLedgerTransactionsWorkspace<T extends LedgerTransactionsWorkspaceSlice>(model: T) {
  return {
    state: {
      refreshing: model.refreshing,
      postingTransaction: model.postingTransaction,
      visibleTransactions: model.visibleTransactions,
      hiddenTransactionsCount: model.hiddenTransactionsCount,
      historyExpanded: model.historyExpanded,
      pendingVoidTransactionId: model.pendingVoidTransactionId,
    },
    actions: {
      expandHistory: model.expandHistory,
      voidTransaction: model.voidTransaction,
    },
  };
}
