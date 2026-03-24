import type { FormEvent } from 'react';

type AccountCommandsSlice = {
  creatingAccount: boolean;
  newAccountName: string;
  newAccountCurrency: string;
  newAccountOpeningBalance: string;
  showCreateAccountForm: boolean;
  setNewAccountName: (value: string) => void;
  setNewAccountCurrency: (value: string) => void;
  setNewAccountOpeningBalance: (value: string) => void;
  submitCreateAccount: (event: FormEvent) => Promise<void>;
  openCreateAccountForm: () => void;
  closeCreateAccountForm: () => void;
};

export function useAccountCommands<T extends AccountCommandsSlice>(model: T): AccountCommandsSlice {
  return {
    creatingAccount: model.creatingAccount,
    newAccountName: model.newAccountName,
    newAccountCurrency: model.newAccountCurrency,
    newAccountOpeningBalance: model.newAccountOpeningBalance,
    showCreateAccountForm: model.showCreateAccountForm,
    setNewAccountName: model.setNewAccountName,
    setNewAccountCurrency: model.setNewAccountCurrency,
    setNewAccountOpeningBalance: model.setNewAccountOpeningBalance,
    submitCreateAccount: model.submitCreateAccount,
    openCreateAccountForm: model.openCreateAccountForm,
    closeCreateAccountForm: model.closeCreateAccountForm,
  };
}
