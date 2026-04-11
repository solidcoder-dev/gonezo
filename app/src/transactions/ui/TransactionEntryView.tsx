import { TransactionComposerView } from './TransactionComposerView';
import type { TransactionEntryViewProps } from './TransactionEntryView.contract';

export type {
  TransactionEntryViewProps,
  TransactionEntryViewProvided,
  TransactionEntryViewRequired,
} from './TransactionEntryView.contract';

export function TransactionEntryView({ required, provided }: TransactionEntryViewProps) {
  return (
    <TransactionComposerView
      required={{
        open: required.state.open,
        mode: required.state.mode,
        disabled: required.status.disabled,
        amount: required.state.amount,
        date: required.state.date,
        note: required.state.note,
        categoryInput: required.state.categoryInput,
        categoryOptions: required.state.categoryOptions,
        tagInput: required.state.tagInput,
        tagOptions: required.state.tagOptions,
        advancedOpen: required.state.advancedOpen,
        transferTargetAccountId: required.state.transferTargetAccountId,
        transferTargetOptions: required.state.transferTargetOptions,
        transferAmountIn: required.state.transferAmountIn,
        transferFxRate: required.state.transferFxRate,
        transferFxMode: required.state.transferFxMode,
        transferDestinationCurrency: required.state.transferDestinationCurrency,
        transferCrossCurrency: required.state.transferCrossCurrency,
        expenseDetailed: required.state.splitEnabled,
        expenseItems: required.state.splitItems,
        expenseItemName: required.state.splitItemName,
        expenseItemAmount: required.state.splitItemAmount,
        expenseRemaining: required.state.splitRemaining,
        currencyCode: required.state.currencyCode,
        expenseItemNameError: required.status.errors.expenseItemName,
        expenseItemAmountError: required.status.errors.expenseItemAmount,
        expenseSplitError: required.status.errors.expenseSplit,
        amountError: required.status.errors.amount,
        transferAmountInError: required.status.errors.transferAmountIn,
        transferFxRateError: required.status.errors.transferFxRate,
        dateError: required.status.errors.date,
      }}
      provided={{
        onOpen: provided.commands.open,
        onClose: provided.commands.close,
        onSelectMode: provided.commands.selectMode,
        onToggleAdvanced: provided.commands.toggleAdvanced,
        onSetAmount: provided.commands.setAmount,
        onSetDate: provided.commands.setDate,
        onSetNote: provided.commands.setNote,
        onSetCategoryInput: provided.commands.setCategoryInput,
        onSetTagInput: provided.commands.setTagInput,
        onSetTransferTarget: provided.commands.setTransferTarget,
        onSetTransferAmountIn: provided.commands.setTransferAmountIn,
        onSetTransferFxRate: provided.commands.setTransferFxRate,
        onSetTransferFxMode: provided.commands.setTransferFxMode,
        onToggleExpenseDetailed: () => provided.commands.setSplitEnabled(!required.state.splitEnabled),
        onSetExpenseItemName: provided.commands.setSplitItemName,
        onSetExpenseItemAmount: provided.commands.setSplitItemAmount,
        onAddExpenseItem: provided.commands.addSplitItem,
        onRemoveExpenseItem: provided.commands.removeSplitItem,
        onAssignRemaining: provided.commands.assignSplitRemaining,
        onSubmit: provided.commands.submit,
      }}
    />
  );
}
