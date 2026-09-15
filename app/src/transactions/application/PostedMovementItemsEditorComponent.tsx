import { useEffect, useMemo, useRef, useState } from 'react';
import type { LedgerPort } from '../../ledger/application/ledger.port';
import type { MovementDetailViewModel } from '../../movements/application/movementDetailView.types';
import type { TransactionFieldErrors } from './transactions.types';
import { useExpenseSplitEditorModel } from './useExpenseSplitEditorModel';
import { ItemBreakdownEditorView } from '../ui/ItemBreakdownEditor/ItemBreakdownEditorView';
import { ItemBreakdownEditorPageView } from '../ui/ItemBreakdownEditor/ItemBreakdownEditorPageView';

type PostedMovementItemsEditorComponentProps = {
  movement: MovementDetailViewModel;
  ledger: Pick<LedgerPort, 'ledgerReplacePostedTransactionItems'>;
  onClose: () => void;
  onSaved: () => void;
  onError: (error: { message: string }) => void;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to save items';
}

export function PostedMovementItemsEditorComponent({ movement, ledger, onClose, onSaved, onError }: PostedMovementItemsEditorComponentProps) {
  const [fieldErrors, setFieldErrors] = useState<TransactionFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const initializedMovementId = useRef<string | undefined>(undefined);
  const idGenerator = useMemo(() => ({ nextId: () => crypto.randomUUID() }), []);
  const model = useExpenseSplitEditorModel({
    transactionAmount: movement.amount.value,
    nextId: idGenerator.nextId,
    setFieldErrors,
  });

  useEffect(() => {
    if (initializedMovementId.current === movement.id) return;
    initializedMovementId.current = movement.id;
    model.actions.prefill(movement.items.map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      tagNames: item.tags?.map((tag) => tag.name),
    })), true);
  }, [model.actions, movement.id, movement.items]);

  async function saveItems() {
    if (model.state.expenseItems.length > 0 && model.state.expenseRemaining !== '0.00') {
      setFieldErrors((previous) => ({ ...previous, expenseSplit: 'Allocated items must equal the movement amount.' }));
      return;
    }
    setSaving(true);
    setFieldErrors((previous) => ({ ...previous, expenseSplit: undefined }));
    try {
      await ledger.ledgerReplacePostedTransactionItems({
        transactionId: movement.id,
        items: model.state.expenseItems.map((item) => ({
          id: item.id,
          name: item.name,
          amount: item.amount,
          currency: movement.amount.currency,
          tagIds: movement.items.find((original) => original.id === item.id)?.tags?.flatMap((tag) => tag.id ? [tag.id] : []),
        })),
      });
      onSaved();
    } catch (error) {
      onError({ message: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ItemBreakdownEditorPageView
      title="Items"
      onClose={onClose}
      footer={<button type="button" className="btn btn-primary w-100" onClick={() => { void saveItems(); }} disabled={saving}>Apply items</button>}
    >
      <ItemBreakdownEditorView
        required={{
          config: {},
          data: { items: model.state.expenseItems, itemOptions: model.state.expenseItemOptions },
          state: {
            enabled: true,
            itemName: model.state.expenseItemName,
            itemAmount: model.state.expenseItemAmount,
            editingItemId: model.state.editingExpenseItemId,
            splitMode: model.state.splitDraftMode,
            splitTotal: model.state.expenseSplitTotal,
            splitBaseAmount: movement.amount.value,
            splitRemaining: model.state.expenseRemaining,
            currencyCode: movement.amount.currency,
            itemNameError: fieldErrors.expenseItemName,
            itemAmountError: fieldErrors.expenseItemAmount,
            splitError: fieldErrors.expenseSplit,
            itemTagNames: model.state.expenseItemTagNames,
          },
          status: { disabled: saving, hideToggle: true },
        }}
        provided={{
          commands: {
            toggleEnabled: () => undefined,
            changeItemName: model.actions.setExpenseItemNameValue,
            changeItemAmount: model.actions.setExpenseItemAmountValue,
            startItem: model.actions.startExpenseItem,
            cancelItem: model.actions.cancelExpenseItem,
            addItem: model.actions.addExpenseItem,
            editItem: model.actions.editExpenseItem,
            removeItem: model.actions.removeExpenseItem,
            splitByParts: model.actions.splitExpenseByParts,
            splitByWeightedParts: model.actions.splitExpenseByWeightedParts,
            selectMode: model.actions.setSplitDraftMode,
          },
        }}
      />
    </ItemBreakdownEditorPageView>
  );
}
