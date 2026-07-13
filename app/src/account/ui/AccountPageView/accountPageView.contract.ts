import type { ReactNode } from 'react';
import type { LoadPhase } from '../../application/accountPage.types';

export type AccountPageViewRequired = {
  screen: {
    loadPhase: LoadPhase;
    error: string;
  };
  toast: {
    message: string;
    tone: 'success' | 'info' | 'warning' | 'error';
    actionLabel: string;
  };
  sections: {
    netWorthSummary: ReactNode;
    accountHub: ReactNode;
    accountSummary: ReactNode;
    transactionEntry: ReactNode;
    recentTransactions: ReactNode;
    transactionsImport: ReactNode;
  };
};

export type AccountPageViewProvided = {
  toast: {
    commands: {
      dismiss: () => void;
      runAction: () => void;
    };
  };
};

export type AccountPageViewProps = {
  required: AccountPageViewRequired;
  provided: AccountPageViewProvided;
};
