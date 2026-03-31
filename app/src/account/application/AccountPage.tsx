import { useMemo, useState } from 'react';
import { useLedgerAccountWorkspace } from '../../ledger/application/useLedgerAccountWorkspace';
import { mapAccountSummaryList } from './accountViewMappers';
import { useAccountsPageModel, type AccountsCorePort } from './useAccountPageModel';
import { useToast } from './useToast';
import { RecentTransactionsComponent, TransactionEntryComponent, type TransactionsCorePort } from '../../transactions';
import { AccountPageView } from '../ui/AccountPageView';
import { AccountsComponent } from '../ui/capabilities/AccountsComponent';
import { TransactionsImportComponent } from '../ui/capabilities/TransactionsImportComponent';
import type { AccountPageViewProvided, AccountPageViewRequired } from '../ui/accountPageView.contract';
import type { LoadPhase } from '../domain/accountPage.types';

export type AccountPageRequired = {
  core: AccountsCorePort;
};

type AccountPageProps = {
  required: AccountPageRequired;
};

function toLoadPhase(isLoading: boolean, hasError: boolean): LoadPhase {
  if (isLoading) {
    return 'loading';
  }
  if (hasError) {
    return 'error';
  }
  return 'ready';
}

function createAccountsShellCore(core: AccountsCorePort): AccountsCorePort {
  return {
    ledgerListSupportedCurrencies: () => core.ledgerListSupportedCurrencies(),
    ledgerListAccounts: () => core.ledgerListAccounts(),
    ledgerGetAccountSummary: (input) => core.ledgerGetAccountSummary(input),
    ledgerOpenAccount: (input) => core.ledgerOpenAccount(input),
    ledgerRenameAccount: (input) => core.ledgerRenameAccount(input),
    ledgerArchiveAccount: (input) => core.ledgerArchiveAccount(input),
    ledgerDeleteAccount: (input) => core.ledgerDeleteAccount(input),
    mobillsImport: (input) => core.mobillsImport(input),
    ledgerListTransactions: async () => ({ items: [] }),
    ledgerRecordExpense: async () => ({ id: 'disabled-tx' }),
    ledgerRecordIncome: async () => ({ id: 'disabled-tx' }),
    ledgerRecordTransfer: async () => ({ transferOutId: 'disabled-tx-out', transferInId: 'disabled-tx-in' }),
    ledgerCreateExpenseDraft: async () => ({ id: 'disabled-draft' }),
    ledgerAddTransactionItem: async () => undefined,
    ledgerPostDraftTransaction: async () => undefined,
    ledgerVoidTransaction: async () => undefined,
    taxonomyListCategories: async () => ({ items: [] }),
    taxonomyCreateCategory: async () => ({ id: 'disabled-category' }),
    taxonomyListTags: async () => ({ items: [] }),
    orchestrationCategorizeTransaction: async () => ({ status: 'none' }),
    orchestrationApplyTransactionTags: async () => ({ status: 'none' }),
    orchestrationListTransactionTaxonomy: async () => ({ items: [] }),
  };
}

export function AccountPage({ required: pageRequired }: AccountPageProps) {
  const accountsCore = useMemo(() => createAccountsShellCore(pageRequired.core), [pageRequired.core]);
  const model = useAccountsPageModel(accountsCore);
  const [recentTransactionsRefreshSignal, setRecentTransactionsRefreshSignal] = useState(false);

  const ledgerAccount = useLedgerAccountWorkspace(model);
  const toast = useToast(model);

  const screenLoadPhase = toLoadPhase(model.loading, Boolean(model.error));
  const accountLoadPhase = toLoadPhase(model.loading || model.refreshing, Boolean(model.error));

  const accountSummaries = mapAccountSummaryList(ledgerAccount.state.accounts);
  const selectedAccount = accountSummaries.find((account) => account.id === ledgerAccount.state.selectedAccountId);
  const hasSelectedAccount = Boolean(ledgerAccount.state.selectedAccountId);

  const accountsRequired = {
    state: {
      accounts: accountSummaries,
      selectedAccountId: ledgerAccount.state.selectedAccountId,
      selectedAccount,
      balanceAmount: ledgerAccount.state.balanceAmount,
      supportedCurrencies: ledgerAccount.state.supportedCurrencies,
      createForm: {
        isOpen: ledgerAccount.state.showCreateAccountForm,
        name: ledgerAccount.state.newAccountName,
        currency: ledgerAccount.state.newAccountCurrency,
        openingBalance: ledgerAccount.state.newAccountOpeningBalance,
      },
      manageForm: {
        isOpen: ledgerAccount.state.manageAccountSheetOpen,
        name: ledgerAccount.state.manageAccountName,
      },
    },
    status: {
      loadPhase: accountLoadPhase,
      isRefreshing: ledgerAccount.state.refreshing,
      isCreating: ledgerAccount.state.creatingAccount,
      isManaging: ledgerAccount.state.managingAccount,
      isPostingTransaction: model.refreshing,
    },
  };

  const accountsProvided = {
    commands: {
      setCreateName: ledgerAccount.actions.setNewAccountName,
      setCreateCurrency: ledgerAccount.actions.setNewAccountCurrency,
      setCreateOpeningBalance: ledgerAccount.actions.setNewAccountOpeningBalance,
      submitCreate: ledgerAccount.actions.submitCreateAccount,
      openCreateForm: ledgerAccount.actions.openCreateAccountForm,
      closeCreateForm: ledgerAccount.actions.closeCreateAccountForm,
      selectAccount: ledgerAccount.actions.selectAccount,
      openManageForm: ledgerAccount.actions.openManageAccountSheet,
      closeManageForm: ledgerAccount.actions.closeManageAccountSheet,
      setManageName: ledgerAccount.actions.setManageAccountName,
      submitRename: ledgerAccount.actions.submitRenameAccount,
      archiveSelected: ledgerAccount.actions.archiveSelectedAccount,
      deleteSelected: ledgerAccount.actions.deleteSelectedAccount,
    },
    events: {
      onImportRequested: model.openImportSheet,
    },
  };

  const transactionsImportRequired = {
    state: {
      accountsCount: accountSummaries.length,
      isOpen: model.importSheetOpen,
    },
    status: {
      loadPhase: screenLoadPhase,
      submitPhase: model.importSubmitPhase,
    },
  };

  const transactionsImportProvided = {
    commands: {
      open: model.openImportSheet,
      close: model.closeImportSheet,
      submit: model.submitTransactionsImport,
    },
  };

  const transactionEntryRequired = {
    context: {
      accountId: hasSelectedAccount ? ledgerAccount.state.selectedAccountId : null,
      core: pageRequired.core as TransactionsCorePort,
    },
    config: {
      enabled: hasSelectedAccount,
    },
  };

  const recentTransactionsRequired = {
    context: {
      accountId: hasSelectedAccount ? ledgerAccount.state.selectedAccountId : null,
      core: pageRequired.core as TransactionsCorePort,
    },
    config: {
      enabled: hasSelectedAccount,
      refreshSignal: recentTransactionsRefreshSignal,
    },
  };

  const required: AccountPageViewRequired = {
    screen: {
      loadPhase: screenLoadPhase,
      error: model.error,
    },
    toast: {
      message: toast.toastMessage,
      actionLabel: toast.toastActionLabel,
    },
    sections: {
      accounts: <AccountsComponent required={accountsRequired} provided={accountsProvided} />,
      transactionEntry: hasSelectedAccount
        ? (
            <TransactionEntryComponent
              required={transactionEntryRequired}
              provided={{
                events: {
                  onRecorded: () => setRecentTransactionsRefreshSignal((previous) => !previous),
                },
              }}
            />
          )
        : null,
      recentTransactions: hasSelectedAccount
        ? <RecentTransactionsComponent required={recentTransactionsRequired} />
        : null,
      transactionsImport: (
        <TransactionsImportComponent required={transactionsImportRequired} provided={transactionsImportProvided} />
      ),
    },
  };

  const provided: AccountPageViewProvided = {
    toast: {
      commands: {
        dismiss: toast.clearToast,
        runAction: toast.runToastAction,
      },
    },
  };

  return <AccountPageView required={required} provided={provided} />;
}
