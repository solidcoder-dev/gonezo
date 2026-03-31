import type { FormEvent } from 'react';
import type { LoadPhase } from '../../domain/accountPage.types';
import type { AccountSummaryView } from '../../domain/accountView.types';

export type AccountsComponentRequired = {
  state: {
    accounts: AccountSummaryView[];
    selectedAccountId: string;
    selectedAccount?: AccountSummaryView;
    balanceAmount: string;
    supportedCurrencies: string[];
    createForm: {
      isOpen: boolean;
      name: string;
      currency: string;
      openingBalance: string;
    };
    manageForm: {
      isOpen: boolean;
      name: string;
    };
  };
  status: {
    loadPhase: LoadPhase;
    isRefreshing: boolean;
    isCreating: boolean;
    isManaging: boolean;
    isPostingTransaction: boolean;
  };
};

export type AccountsComponentProvided = {
  commands: {
    setCreateName: (value: string) => void;
    setCreateCurrency: (value: string) => void;
    setCreateOpeningBalance: (value: string) => void;
    submitCreate: (event: FormEvent) => Promise<void>;
    openCreateForm: () => void;
    closeCreateForm: () => void;
    selectAccount: (accountId: string) => Promise<void>;
    openManageForm: () => void;
    closeManageForm: () => void;
    setManageName: (value: string) => void;
    submitRename: (event: FormEvent) => Promise<void>;
    archiveSelected: () => Promise<void>;
    deleteSelected: () => Promise<void>;
  };
  events?: {
    onImportRequested?: () => void;
  };
};

export type AccountsComponentProps = {
  required: AccountsComponentRequired;
  provided: AccountsComponentProvided;
};
