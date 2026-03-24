type TransactionsListSlice = {
  refreshing: boolean;
  accounts: Array<{ id: string; name: string; currency: string }>;
  selectedAccountId: string;
  selectedAccount?: { id: string; name: string; currency: string };
  balanceAmount: string;
  visibleTransactions: Array<{ id: string }>;
  hiddenTransactionsCount: number;
  historyExpanded: boolean;
  pendingVoidTransactionId: string;
  selectAccount: (accountId: string) => Promise<void>;
  expandHistory: () => void;
  voidTransaction: (transactionId: string) => void;
};

export function useTransactionsList<T extends TransactionsListSlice>(model: T): TransactionsListSlice {
  return {
    refreshing: model.refreshing,
    accounts: model.accounts,
    selectedAccountId: model.selectedAccountId,
    selectedAccount: model.selectedAccount,
    balanceAmount: model.balanceAmount,
    visibleTransactions: model.visibleTransactions,
    hiddenTransactionsCount: model.hiddenTransactionsCount,
    historyExpanded: model.historyExpanded,
    pendingVoidTransactionId: model.pendingVoidTransactionId,
    selectAccount: model.selectAccount,
    expandHistory: model.expandHistory,
    voidTransaction: model.voidTransaction,
  };
}
