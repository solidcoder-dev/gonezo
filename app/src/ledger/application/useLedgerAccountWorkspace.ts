import type { FormEvent } from 'react';
import type { LedgerAccountItem } from '../../shared/domain/corePort';

type LedgerAccountWorkspaceSlice = {
  loading: boolean;
  refreshing: boolean;
  creatingAccount: boolean;
  accounts: LedgerAccountItem[];
  supportedCurrencies: string[];
  selectedAccountId: string;
  selectedAccount?: LedgerAccountItem;
  balanceAmount: string;
  showCreateAccountForm: boolean;
  newAccountName: string;
  newAccountCurrency: string;
  newAccountOpeningBalance: string;
  manageAccountSheetOpen: boolean;
  manageAccountName: string;
  managingAccount: boolean;
  setNewAccountName: (value: string) => void;
  setNewAccountCurrency: (value: string) => void;
  setNewAccountOpeningBalance: (value: string) => void;
  submitCreateAccount: (event: FormEvent) => Promise<void>;
  openCreateAccountForm: () => void;
  closeCreateAccountForm: () => void;
  selectAccount: (accountId: string) => Promise<void>;
  openManageAccountSheet: () => void;
  closeManageAccountSheet: () => void;
  setManageAccountName: (value: string) => void;
  submitRenameAccount: (event: FormEvent) => Promise<void>;
  archiveSelectedAccount: () => Promise<void>;
  deleteSelectedAccount: () => Promise<void>;
};

export function useLedgerAccountWorkspace<T extends LedgerAccountWorkspaceSlice>(model: T) {
  return {
    state: {
      loading: model.loading,
      refreshing: model.refreshing,
      creatingAccount: model.creatingAccount,
      accounts: model.accounts,
      supportedCurrencies: model.supportedCurrencies,
      selectedAccountId: model.selectedAccountId,
      selectedAccount: model.selectedAccount,
      balanceAmount: model.balanceAmount,
      showCreateAccountForm: model.showCreateAccountForm,
      newAccountName: model.newAccountName,
      newAccountCurrency: model.newAccountCurrency,
      newAccountOpeningBalance: model.newAccountOpeningBalance,
      manageAccountSheetOpen: model.manageAccountSheetOpen,
      manageAccountName: model.manageAccountName,
      managingAccount: model.managingAccount,
    },
    actions: {
      setNewAccountName: model.setNewAccountName,
      setNewAccountCurrency: model.setNewAccountCurrency,
      setNewAccountOpeningBalance: model.setNewAccountOpeningBalance,
      submitCreateAccount: model.submitCreateAccount,
      openCreateAccountForm: model.openCreateAccountForm,
      closeCreateAccountForm: model.closeCreateAccountForm,
      selectAccount: model.selectAccount,
      openManageAccountSheet: model.openManageAccountSheet,
      closeManageAccountSheet: model.closeManageAccountSheet,
      setManageAccountName: model.setManageAccountName,
      submitRenameAccount: model.submitRenameAccount,
      archiveSelectedAccount: model.archiveSelectedAccount,
      deleteSelectedAccount: model.deleteSelectedAccount,
    },
  };
}
