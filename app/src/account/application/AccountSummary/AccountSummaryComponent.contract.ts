import type { ReactNode } from 'react';
import type { AccountsPort } from '../accounts.port';

export type AccountSummaryComponentRequired = {
  context: {
    core: AccountsPort;
    accountId: string | null;
  };
  config: {
    enabled: boolean;
    refreshSignal: boolean;
    headerSlot?: ReactNode;
  };
};

export type AccountSummaryComponentProvided = {
  events?: {
    onAccountMutated?: (accountId: string) => void;
    onAccountDeleted?: (accountId: string) => void;
    onError?: (error: { message: string }) => void;
  };
};

export type AccountSummaryComponentProps = {
  required: AccountSummaryComponentRequired;
  provided?: AccountSummaryComponentProvided;
};
