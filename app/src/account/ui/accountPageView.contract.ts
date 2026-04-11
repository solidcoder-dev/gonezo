import type { ReactNode } from 'react';
import type { LoadPhase } from '../domain/accountPage.types';

export type AccountPageViewRequired = {
  screen: {
    loadPhase: LoadPhase;
    error: string;
  };
  toast: {
    message: string;
    actionLabel: string;
  };
  sections: {
    accountHub: ReactNode;
    accountSummary: ReactNode;
    transactionEntry: ReactNode;
    recurringMovements: ReactNode;
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
