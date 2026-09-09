import type { ReactNode } from 'react';
import type { LedgerAccountOperationsPort } from '../../../ledger/application/useLedgerAccounts';
import type { AmountVisibility } from '../../../shared/domain/amountVisibility';

export type AccountSummaryComponentRequired = {
  context: {
    core: LedgerAccountOperationsPort;
    accountId: string | null;
  };
  config: {
    enabled: boolean;
    refreshSignal: boolean;
    headerSlot?: ReactNode;
    amountVisibility?: AmountVisibility;
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
