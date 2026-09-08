import type { LedgerAccountOperationsPort } from '../../../ledger/application/useLedgerAccounts';

export type ManageAccountSheetComponentProps = {
  required: {
    context: {
      core: LedgerAccountOperationsPort;
      accountId: string | null;
    };
    config: {
      open: boolean;
      refreshSignal?: unknown;
    };
  };
  provided: {
    events: {
      onClose: () => void;
      onAccountMutated?: () => void;
      onAccountDeleted?: () => void;
      onError?: (error: { message: string }) => void;
    };
  };
};
