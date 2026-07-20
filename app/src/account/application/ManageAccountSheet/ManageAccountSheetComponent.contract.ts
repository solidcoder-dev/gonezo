import type { AccountWorkspacePort } from '../accounts.port';

export type ManageAccountSheetComponentProps = {
  required: {
    context: {
      core: AccountWorkspacePort;
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
