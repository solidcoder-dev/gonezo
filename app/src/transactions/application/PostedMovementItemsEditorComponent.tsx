import type { PostedMovementDetailViewModel } from '../../movements/application/movementDetailView.types';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import { ItemBreakdownEditorView } from '../ui/ItemBreakdownEditor/ItemBreakdownEditorView';
import { ItemBreakdownEditorPageView } from '../ui/ItemBreakdownEditor/ItemBreakdownEditorPageView';
import { usePostedMovementItemsEditorModel } from './usePostedMovementItemsEditorModel';

export function PostedMovementItemsEditorComponent(props: { movement: PostedMovementDetailViewModel; ledger: Pick<LedgerGatewayPort, 'ledgerReplacePostedTransactionItems'>; onSaved: () => void; onClose: () => void }) {
  const model = usePostedMovementItemsEditorModel(props);
  const items = model.editor.state.expenseItems.map((item) => ({ id: item.id, name: item.name, amount: item.amount, tagNames: item.tagNames }));
  return (
    <ItemBreakdownEditorPageView title="Edit items" onClose={props.onClose}>
      {model.error ? <div className="alert alert-danger" role="alert">{model.error}</div> : null}
      <ItemBreakdownEditorView
        required={{
          data: { items },
          state: {
            enabled: true,
            itemName: model.editor.state.expenseItemName,
            itemAmount: model.editor.state.expenseItemAmount,
            editingItemId: model.editor.state.editingExpenseItemId,
            splitMode: model.editor.state.splitDraftMode,
            splitTotal: model.editor.state.expenseSplitTotal,
            splitBaseAmount: props.movement.amount.value,
            splitRemaining: model.editor.state.expenseRemaining,
            currencyCode: props.movement.amount.currency,
            itemNameError: model.fieldErrors.expenseItemName,
            itemAmountError: model.fieldErrors.expenseItemAmount,
            splitError: model.fieldErrors.expenseSplit,
          },
          status: { disabled: model.saving, hideToggle: true },
        }}
        provided={{ commands: {
          toggleEnabled: () => {},
          changeItemName: model.editor.actions.setExpenseItemNameValue,
          changeItemAmount: model.editor.actions.setExpenseItemAmountValue,
          startItem: model.editor.actions.startExpenseItem,
          cancelItem: model.editor.actions.cancelExpenseItem,
          addItem: model.editor.actions.addExpenseItem,
          splitByParts: model.editor.actions.splitExpenseByParts,
          splitByWeightedParts: model.editor.actions.splitExpenseByWeightedParts,
          selectMode: model.editor.actions.setSplitDraftMode,
          editItem: model.editor.actions.editExpenseItem,
          removeItem: model.editor.actions.removeExpenseItem,
        } }}
      />
      <button type="button" className="btn btn-primary w-100 mt-3" disabled={model.saving} onClick={() => void model.save()}>
        {model.saving ? 'Saving…' : 'Save items'}
      </button>
    </ItemBreakdownEditorPageView>
  );
}
