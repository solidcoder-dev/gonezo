import { TransactionComposerView } from '../transactions/TransactionComposerView';
import { RecentTransactionsListView } from '../transactions/RecentTransactionsListView';
import type { AccountPageViewProvided, AccountPageViewRequired } from '../accountPageView.contract';

export type TransactionsSectionRequired = {
  account: AccountPageViewRequired['account'];
  composer: AccountPageViewRequired['composer'];
  transactions: AccountPageViewRequired['transactions'];
};

export type TransactionsSectionProvided = {
  composer: AccountPageViewProvided['composer'];
  transactions: AccountPageViewProvided['transactions'];
};

type Props = {
  required: TransactionsSectionRequired;
  provided: TransactionsSectionProvided;
};

export function TransactionsSection({ required, provided }: Props) {
  const transactionControlsDisabled = required.composer.isSubmitting || required.account.isRefreshing;

  return (
    <>
      <TransactionComposerView
        required={{
          open: required.composer.isOpen,
          mode: required.composer.mode,
          disabled: transactionControlsDisabled,
          amount: required.composer.amount,
          date: required.composer.date,
          note: required.composer.note,
          categoryInput: required.composer.categoryInput,
          categoryOptions: required.composer.categoryOptions,
          tagInput: required.composer.tagInput,
          tagOptions: required.composer.tagOptions,
          advancedOpen: required.composer.advancedOpen,
          transferTargetAccountId: required.composer.transferTargetAccountId,
          transferTargetOptions: required.composer.transferTargetOptions,
          expenseDetailed: required.composer.expenseDetailed,
          expenseItems: required.composer.expenseItems,
          expenseItemName: required.composer.expenseItemName,
          expenseItemAmount: required.composer.expenseItemAmount,
          expenseRemaining: required.composer.expenseRemaining,
          currencyCode: required.account.selectedAccount?.currency,
          expenseItemNameError: required.composer.expenseItemNameError,
          expenseItemAmountError: required.composer.expenseItemAmountError,
          expenseSplitError: required.composer.expenseSplitError,
          amountError: required.composer.fieldErrors.amount,
          dateError: required.composer.fieldErrors.date,
        }}
        provided={{
          onOpen: provided.composer.openComposer,
          onClose: provided.composer.closeComposer,
          onSelectMode: provided.composer.selectMode,
          onToggleAdvanced: provided.composer.toggleAdvanced,
          onSetAmount: provided.composer.setAmount,
          onSetDate: provided.composer.setDate,
          onSetNote: provided.composer.setNote,
          onSetCategoryInput: provided.composer.setCategoryInput,
          onSetTagInput: provided.composer.setTagInput,
          onSetTransferTarget: provided.composer.setTransferTargetAccountId,
          onToggleExpenseDetailed: () => provided.composer.setExpenseDetailed(!required.composer.expenseDetailed),
          onSetExpenseItemName: provided.composer.setExpenseItemName,
          onSetExpenseItemAmount: provided.composer.setExpenseItemAmount,
          onAddExpenseItem: provided.composer.addExpenseItem,
          onRemoveExpenseItem: provided.composer.removeExpenseItem,
          onAssignRemaining: provided.composer.assignRemaining,
          onSubmit: provided.composer.submitTransaction,
        }}
      />

      <RecentTransactionsListView
        required={{
          items: required.transactions.items,
          hiddenCount: required.transactions.hiddenCount,
          expanded: required.transactions.expanded,
          disabled: transactionControlsDisabled,
          pendingVoidTransactionId: required.transactions.pendingVoidTransactionId,
        }}
        provided={{
          onViewAll: provided.transactions.expandHistory,
          onVoid: provided.transactions.voidTransaction,
        }}
      />
    </>
  );
}
