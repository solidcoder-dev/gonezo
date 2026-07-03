import { useState } from 'react';

export type WorkspaceRefreshTarget =
  | 'accountHub'
  | 'accountSummary'
  | 'analytics'
  | 'expectedMovements'
  | 'movementQuickAction'
  | 'netWorth'
  | 'recentTransactions';

export function useWorkspaceRefreshSignals() {
  const [accountHubRefreshSignal, setAccountHubRefreshSignal] = useState(false);
  const [accountSummaryRefreshSignal, setAccountSummaryRefreshSignal] = useState(false);
  const [netWorthRefreshSignal, setNetWorthRefreshSignal] = useState(false);
  const [expectedMovementsRefreshSignal, setExpectedMovementsRefreshSignal] = useState(false);
  const [recentTransactionsRefreshSignal, setRecentTransactionsRefreshSignal] = useState(false);
  const [analyticsRefreshSignal, setAnalyticsRefreshSignal] = useState(false);
  const [movementQuickActionRefreshSignal, setMovementQuickActionRefreshSignal] = useState(false);

  function refresh(...targets: WorkspaceRefreshTarget[]) {
    for (const target of targets) {
      switch (target) {
        case 'accountHub':
          setAccountHubRefreshSignal((previous) => !previous);
          break;
        case 'accountSummary':
          setAccountSummaryRefreshSignal((previous) => !previous);
          break;
        case 'analytics':
          setAnalyticsRefreshSignal((previous) => !previous);
          break;
        case 'expectedMovements':
          setExpectedMovementsRefreshSignal((previous) => !previous);
          break;
        case 'movementQuickAction':
          setMovementQuickActionRefreshSignal((previous) => !previous);
          break;
        case 'netWorth':
          setNetWorthRefreshSignal((previous) => !previous);
          break;
        case 'recentTransactions':
          setRecentTransactionsRefreshSignal((previous) => !previous);
          break;
      }
    }
  }

  return {
    signals: {
      accountHubRefreshSignal,
      accountSummaryRefreshSignal,
      analyticsRefreshSignal,
      expectedMovementsRefreshSignal,
      movementQuickActionRefreshSignal,
      netWorthRefreshSignal,
      recentTransactionsRefreshSignal,
    },
    refresh,
  };
}
