import { useEffect, useRef, useState } from 'react';
import type { TransactionFieldErrors } from './transactions.types';
import type { PostedMovementDetailViewModel } from '../../movements/application/movementDetailView.types';
import type { LedgerGatewayPort } from '../../ledger/application/ledgerGateway.port';
import { useExpenseSplitEditorModel } from './useExpenseSplitEditorModel';

export function usePostedMovementItemsEditorModel(input: {
  movement: PostedMovementDetailViewModel;
  ledger: Pick<LedgerGatewayPort, 'ledgerReplacePostedTransactionItems'>;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [fieldErrors, setFieldErrors] = useState<TransactionFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const initializedMovementId = useRef<string | undefined>(undefined);
  const editor = useExpenseSplitEditorModel({
    transactionAmount: input.movement.amount.value,
    nextId: () => crypto.randomUUID(),
    setFieldErrors,
  });

  useEffect(() => {
    if (initializedMovementId.current === input.movement.id) {
      return;
    }
    initializedMovementId.current = input.movement.id;
    editor.actions.prefill(input.movement.items.map((item) => ({ id: item.id, name: item.name, amount: item.amount })));
  }, [editor.actions, input.movement.id, input.movement.items]);

  async function save() {
    const items = editor.state.expenseItems;
    if (items.length > 0 && editor.state.expenseRemaining !== '0.00') {
      setFieldErrors((previous) => ({ ...previous, expenseSplit: 'Items must add up to the original amount.' }));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await input.ledger.ledgerReplacePostedTransactionItems({
        transactionId: input.movement.id,
        items: items.map((item) => ({ id: item.id, name: item.name, amount: item.amount, currency: input.movement.amount.currency })),
      });
      input.onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Items could not be saved');
    } finally {
      setSaving(false);
    }
  }

  return { editor, fieldErrors, saving, error, save };
}
