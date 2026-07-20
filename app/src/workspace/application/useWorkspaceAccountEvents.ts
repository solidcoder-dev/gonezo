import type { Dispatch, SetStateAction } from 'react';
import type { WorkspaceRefreshTarget } from './useWorkspaceRefreshSignals';

type WorkspaceAccountEventsInput = {
  selectedAccountId: string | null;
  setAccountsCount: Dispatch<SetStateAction<number>>;
  setSelectedAccountId: Dispatch<SetStateAction<string | null>>;
  refresh: (...targets: WorkspaceRefreshTarget[]) => void;
};

export function useWorkspaceAccountEvents({
  selectedAccountId,
  setAccountsCount,
  setSelectedAccountId,
  refresh,
}: WorkspaceAccountEventsInput) {
  function handleSelectedAccountChanged(accountId: string | null) {
    setSelectedAccountId((previousAccountId) => {
      if (previousAccountId === accountId) {
        return previousAccountId;
      }
      refresh('accountSummary', 'netWorth', 'recentTransactions', 'movementQuickAction');
      return accountId;
    });
  }

  function handleAccountsCountChanged(count: number) {
    setAccountsCount((previousCount) => {
      if (previousCount > 0 && previousCount !== count) {
        refresh('movementQuickAction', 'netWorth', 'analytics');
      }
      return count;
    });
  }

  function handleAccountMutated() {
    refresh('accountHub', 'accountSummary', 'netWorth', 'movementQuickAction', 'expectedMovements', 'analytics');
  }

  function handleAccountDeleted(accountId: string) {
    if (selectedAccountId === accountId) {
      setSelectedAccountId(null);
    }
    refresh('accountHub', 'accountSummary', 'netWorth', 'recentTransactions', 'movementQuickAction', 'expectedMovements', 'analytics');
  }

  function handleProfileAccountMutated() {
    refresh('accountHub', 'movementQuickAction', 'accountSummary', 'netWorth', 'expectedMovements', 'analytics');
  }

  return {
    handleAccountDeleted,
    handleAccountMutated,
    handleAccountsCountChanged,
    handleProfileAccountMutated,
    handleSelectedAccountChanged,
  };
}
