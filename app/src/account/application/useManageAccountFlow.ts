import type { FormEvent } from 'react';

type ManageAccountFlowSlice = {
  manageAccountSheetOpen: boolean;
  manageAccountName: string;
  managingAccount: boolean;
  setManageAccountName: (value: string) => void;
  openManageAccountSheet: () => void;
  closeManageAccountSheet: () => void;
  submitRenameAccount: (event: FormEvent) => Promise<void>;
  archiveSelectedAccount: () => Promise<void>;
  deleteSelectedAccount: () => Promise<void>;
};

export function useManageAccountFlow<T extends ManageAccountFlowSlice>(model: T): ManageAccountFlowSlice {
  return {
    manageAccountSheetOpen: model.manageAccountSheetOpen,
    manageAccountName: model.manageAccountName,
    managingAccount: model.managingAccount,
    setManageAccountName: model.setManageAccountName,
    openManageAccountSheet: model.openManageAccountSheet,
    closeManageAccountSheet: model.closeManageAccountSheet,
    submitRenameAccount: model.submitRenameAccount,
    archiveSelectedAccount: model.archiveSelectedAccount,
    deleteSelectedAccount: model.deleteSelectedAccount,
  };
}
