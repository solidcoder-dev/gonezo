import type { ReactNode } from 'react';
import type { LoadPhase } from '../../application/accountPage.types';

export type AccountPageViewRequired = {
  screen: {
    loadPhase: LoadPhase;
    error: string;
  };
  sections: {
    pageHeader: ReactNode;
    netWorthSummary: ReactNode;
    accountHub: ReactNode;
    accountSummary: ReactNode;
    transactionEntry: ReactNode;
    recentTransactions: ReactNode;
    transactionsImport: ReactNode;
  };
};

export type AccountPageViewProvided = Record<string, never>;

export type AccountPageViewProps = {
  required: AccountPageViewRequired;
  provided: AccountPageViewProvided;
};
