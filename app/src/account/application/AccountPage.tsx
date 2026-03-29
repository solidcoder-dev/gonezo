import { useMobillsImportWorkspace } from '../../imports/mobills/application/useMobillsImportWorkspace';
import { useLedgerAccountWorkspace } from '../../ledger/application/useLedgerAccountWorkspace';
import { useLedgerComposerWorkspace } from '../../ledger/application/useLedgerComposerWorkspace';
import { useLedgerTransactionsWorkspace } from '../../ledger/application/useLedgerTransactionsWorkspace';
import { useTaxonomyComposerWorkspace } from '../../taxonomy/application/useTaxonomyComposerWorkspace';
import { useAccountsPageModel, type AccountsCorePort } from './useAccountPageModel';
import { useToast } from './useToast';
import { AccountPageView } from '../ui/AccountPageView';
import type { AccountPageViewProvided, AccountPageViewRequired, LoadPhase } from '../ui/accountPageView.contract';

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

export function AccountPage({ required: pageRequired }: AccountPageProps) {
  const model = useAccountsPageModel(pageRequired.core);

  const ledgerAccount = useLedgerAccountWorkspace(model);
  const ledgerTransactions = useLedgerTransactionsWorkspace(model);
  const ledgerComposer = useLedgerComposerWorkspace(model);
  const taxonomyComposer = useTaxonomyComposerWorkspace(model);
  const mobillsImport = useMobillsImportWorkspace(model);
  const toast = useToast(model);

  const screenLoadPhase = toLoadPhase(model.loading, Boolean(model.error));
  const accountLoadPhase = toLoadPhase(model.loading || model.refreshing, Boolean(model.error));
  const composerLoadPhase = toLoadPhase(model.loading, Boolean(model.error));
  const transactionsLoadPhase = toLoadPhase(model.refreshing, Boolean(model.error));
  const importsSubmitPhase: LoadPhase = model.importingMobills
    ? 'loading'
    : model.importError
      ? 'error'
      : model.importResult
        ? 'ready'
        : 'idle';

  const required: AccountPageViewRequired = {
    screen: {
      loadPhase: screenLoadPhase,
      error: model.error,
    },
    toast: {
      message: toast.toastMessage,
      actionLabel: toast.toastActionLabel,
    },
    account: {
      loadPhase: accountLoadPhase,
      isRefreshing: ledgerAccount.state.refreshing,
      isCreating: ledgerAccount.state.creatingAccount,
      supportedCurrencies: ledgerAccount.state.supportedCurrencies,
      accounts: ledgerAccount.state.accounts,
      selectedAccountId: ledgerAccount.state.selectedAccountId,
      selectedAccount: ledgerAccount.state.selectedAccount,
      balanceAmount: ledgerAccount.state.balanceAmount,
      createForm: {
        isVisible: ledgerAccount.state.showCreateAccountForm,
        name: ledgerAccount.state.newAccountName,
        currency: ledgerAccount.state.newAccountCurrency,
        openingBalance: ledgerAccount.state.newAccountOpeningBalance,
      },
      manage: {
        isOpen: ledgerAccount.state.manageAccountSheetOpen,
        name: ledgerAccount.state.manageAccountName,
        isSubmitting: ledgerAccount.state.managingAccount,
      },
    },
    composer: {
      loadPhase: composerLoadPhase,
      isSubmitting: ledgerComposer.state.postingTransaction,
      isOpen: ledgerComposer.state.composerOpen,
      mode: ledgerComposer.state.composerMode,
      advancedOpen: ledgerComposer.state.composerAdvancedOpen,
      amount: ledgerComposer.state.transactionAmount,
      date: ledgerComposer.state.transactionDate,
      note: ledgerComposer.state.transactionNote,
      categoryInput: taxonomyComposer.state.transactionCategoryInput,
      categoryOptions: taxonomyComposer.state.categoryOptions,
      tagInput: taxonomyComposer.state.transactionTagInput,
      tagOptions: taxonomyComposer.state.tagOptions,
      transferTargetAccountId: ledgerComposer.state.transferToAccountId,
      transferTargetOptions: ledgerComposer.state.transferTargetOptions,
      expenseDetailed: ledgerComposer.state.expenseDetailed,
      expenseItems: ledgerComposer.state.expenseItems,
      expenseItemName: ledgerComposer.state.expenseItemName,
      expenseItemAmount: ledgerComposer.state.expenseItemAmount,
      expenseRemaining: ledgerComposer.state.expenseRemaining,
      fieldErrors: ledgerComposer.state.fieldErrors,
      expenseItemNameError: ledgerComposer.state.expenseItemNameError,
      expenseItemAmountError: ledgerComposer.state.expenseItemAmountError,
      expenseSplitError: ledgerComposer.state.expenseSplitError,
    },
    transactions: {
      loadPhase: transactionsLoadPhase,
      items: ledgerTransactions.state.visibleTransactions,
      hiddenCount: ledgerTransactions.state.hiddenTransactionsCount,
      expanded: ledgerTransactions.state.historyExpanded,
      pendingVoidTransactionId: ledgerTransactions.state.pendingVoidTransactionId,
    },
    imports: {
      submitPhase: importsSubmitPhase,
      sheetOpen: mobillsImport.state.importSheetOpen,
      isImporting: mobillsImport.state.importingMobills,
      fileName: mobillsImport.state.importFileName,
      error: mobillsImport.state.importError,
      result: mobillsImport.state.importResult,
      createMissingAccounts: mobillsImport.state.importCreateMissingAccounts,
      createMissingCategories: mobillsImport.state.importCreateMissingCategories,
      createMissingTags: mobillsImport.state.importCreateMissingTags,
      duplicatePolicy: mobillsImport.state.importDuplicatePolicy,
      failedRows: mobillsImport.state.importFailedRows,
      failureSummary: mobillsImport.state.importFailureSummary,
      accountNotFoundFailures: mobillsImport.state.accountNotFoundFailures,
      duplicateRowsCount: mobillsImport.state.duplicateRowsCount,
    },
  };

  const provided: AccountPageViewProvided = {
    toast: {
      dismiss: toast.clearToast,
      runAction: toast.runToastAction,
    },
    account: {
      setNewAccountName: ledgerAccount.actions.setNewAccountName,
      setNewAccountCurrency: ledgerAccount.actions.setNewAccountCurrency,
      setNewAccountOpeningBalance: ledgerAccount.actions.setNewAccountOpeningBalance,
      submitCreateAccount: ledgerAccount.actions.submitCreateAccount,
      openCreateAccountForm: ledgerAccount.actions.openCreateAccountForm,
      closeCreateAccountForm: ledgerAccount.actions.closeCreateAccountForm,
      selectAccount: ledgerAccount.actions.selectAccount,
      openManageAccountSheet: ledgerAccount.actions.openManageAccountSheet,
      closeManageAccountSheet: ledgerAccount.actions.closeManageAccountSheet,
      setManageAccountName: ledgerAccount.actions.setManageAccountName,
      submitRenameAccount: ledgerAccount.actions.submitRenameAccount,
      archiveSelectedAccount: ledgerAccount.actions.archiveSelectedAccount,
      deleteSelectedAccount: ledgerAccount.actions.deleteSelectedAccount,
    },
    composer: {
      openComposer: ledgerComposer.actions.openTransactionComposer,
      closeComposer: ledgerComposer.actions.closeTransactionComposer,
      selectMode: ledgerComposer.actions.selectComposerMode,
      toggleAdvanced: ledgerComposer.actions.toggleComposerAdvanced,
      setAmount: ledgerComposer.actions.setTransactionAmount,
      setDate: ledgerComposer.actions.setTransactionDate,
      setNote: ledgerComposer.actions.setTransactionNote,
      setCategoryInput: taxonomyComposer.actions.setTransactionCategoryInput,
      setTagInput: taxonomyComposer.actions.setTransactionTagInput,
      setTransferTargetAccountId: ledgerComposer.actions.setTransferToAccountId,
      setExpenseDetailed: ledgerComposer.actions.setExpenseDetailed,
      setExpenseItemName: ledgerComposer.actions.setExpenseItemName,
      setExpenseItemAmount: ledgerComposer.actions.setExpenseItemAmount,
      addExpenseItem: ledgerComposer.actions.addExpenseItem,
      removeExpenseItem: ledgerComposer.actions.removeExpenseItem,
      assignRemaining: ledgerComposer.actions.assignRemaining,
      submitTransaction: ledgerComposer.actions.submitTransaction,
    },
    transactions: {
      expandHistory: ledgerTransactions.actions.expandHistory,
      voidTransaction: ledgerTransactions.actions.voidTransaction,
    },
    imports: {
      openSheet: mobillsImport.actions.openImportSheet,
      closeSheet: mobillsImport.actions.closeImportSheet,
      setFile: mobillsImport.actions.setImportFile,
      setCreateMissingAccounts: mobillsImport.actions.setImportCreateMissingAccounts,
      setCreateMissingCategories: mobillsImport.actions.setImportCreateMissingCategories,
      setCreateMissingTags: mobillsImport.actions.setImportCreateMissingTags,
      setDuplicatePolicy: mobillsImport.actions.setImportDuplicatePolicy,
      submitImport: mobillsImport.actions.submitMobillsImport,
    },
  };

  return <AccountPageView required={required} provided={provided} />;
}
