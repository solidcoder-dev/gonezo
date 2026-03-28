import { TransactionComposerView } from '../transactions/TransactionComposerView';
import { RecentTransactionsListView } from '../transactions/RecentTransactionsListView';
import type { AccountPageActions, AccountPageState } from '../accountPageView.contract';

type Props = {
  account: AccountPageState['account'];
  composer: AccountPageState['composer'];
  transactions: AccountPageState['transactions'];
  composerActions: AccountPageActions['composer'];
  transactionActions: AccountPageActions['transactions'];
};

export function TransactionsSection({
  account,
  composer,
  transactions,
  composerActions,
  transactionActions,
}: Props) {
  const transactionControlsDisabled = composer.isSubmitting || account.isRefreshing;

  return (
    <>
      <TransactionComposerView
        open={composer.isOpen}
        mode={composer.mode}
        onOpen={composerActions.openComposer}
        onClose={composerActions.closeComposer}
        onSelectMode={composerActions.selectMode}
        onToggleAdvanced={composerActions.toggleAdvanced}
        advancedOpen={composer.advancedOpen}
        amount={composer.amount}
        date={composer.date}
        note={composer.note}
        categoryInput={composer.categoryInput}
        categoryOptions={composer.categoryOptions}
        tagInput={composer.tagInput}
        tagOptions={composer.tagOptions}
        transferTargetAccountId={composer.transferTargetAccountId}
        transferTargetOptions={composer.transferTargetOptions}
        expenseDetailed={composer.expenseDetailed}
        expenseItems={composer.expenseItems}
        expenseItemName={composer.expenseItemName}
        expenseItemAmount={composer.expenseItemAmount}
        expenseRemaining={composer.expenseRemaining}
        currencyCode={account.selectedAccount?.currency}
        expenseItemNameError={composer.expenseItemNameError}
        expenseItemAmountError={composer.expenseItemAmountError}
        expenseSplitError={composer.expenseSplitError}
        onToggleExpenseDetailed={() => composerActions.setExpenseDetailed(!composer.expenseDetailed)}
        onSetExpenseItemName={composerActions.setExpenseItemName}
        onSetExpenseItemAmount={composerActions.setExpenseItemAmount}
        onAddExpenseItem={composerActions.addExpenseItem}
        onRemoveExpenseItem={composerActions.removeExpenseItem}
        onAssignRemaining={composerActions.assignRemaining}
        amountError={composer.fieldErrors.amount}
        dateError={composer.fieldErrors.date}
        disabled={transactionControlsDisabled}
        onSetAmount={composerActions.setAmount}
        onSetDate={composerActions.setDate}
        onSetNote={composerActions.setNote}
        onSetCategoryInput={composerActions.setCategoryInput}
        onSetTagInput={composerActions.setTagInput}
        onSetTransferTarget={composerActions.setTransferTargetAccountId}
        onSubmit={composerActions.submitTransaction}
      />

      <RecentTransactionsListView
        items={transactions.items}
        hiddenCount={transactions.hiddenCount}
        expanded={transactions.expanded}
        disabled={transactionControlsDisabled}
        pendingVoidTransactionId={transactions.pendingVoidTransactionId}
        onViewAll={transactionActions.expandHistory}
        onVoid={transactionActions.voidTransaction}
      />
    </>
  );
}
