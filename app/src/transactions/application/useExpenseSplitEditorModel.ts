import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExpenseItemDraft, TransactionFieldErrors } from './transactions.types';
import {
  calculateSplitRemaining,
  cloneSplitItems,
  formatSplitTotal,
  rebalanceEditedPartSplit,
  upsertSplitItem,
} from '../domain/expenseSplit';

type UseExpenseSplitEditorModelInput = {
  transactionAmount: string;
  nextId: () => string;
  setFieldErrors: Dispatch<SetStateAction<TransactionFieldErrors>>;
};

type SplitEditorSnapshot = {
  expenseDetailed: boolean;
  splitApplied: boolean;
  splitDraftMode: SplitDraftMode;
  expenseItemName: string;
  expenseItemAmount: string;
  manualExpenseItems: ExpenseItemDraft[];
  partsExpenseItems: ExpenseItemDraft[];
  partsBaseAmount: string;
  editingExpenseItemId: string;
};

type SplitDraftMode = 'items' | 'parts';

function splitAmountIntoParts(amountInput: string, partsInput: string): string[] {
  const amount = Number(amountInput.trim());
  const parts = Math.trunc(Number(partsInput.trim()));
  if (!Number.isFinite(amount) || !Number.isFinite(parts) || amount <= 0 || parts < 2) {
    return [];
  }

  const totalCents = Math.round(amount * 100);
  const baseCents = Math.floor(totalCents / parts);
  const remainderCents = totalCents - baseCents * parts;

  return Array.from({ length: parts }, (_, index) => {
    const cents = index === parts - 1 ? baseCents + remainderCents : baseCents;
    return (cents / 100).toFixed(2);
  });
}

export function useExpenseSplitEditorModel(input: UseExpenseSplitEditorModelInput) {
  const {
    transactionAmount,
    nextId,
    setFieldErrors,
  } = input;
  const [expenseDetailed, setExpenseDetailed] = useState(false);
  const [splitEditorOpen, setSplitEditorOpen] = useState(false);
  const [splitApplied, setSplitApplied] = useState(false);
  const [splitEditorSnapshot, setSplitEditorSnapshot] = useState<SplitEditorSnapshot | null>(null);
  const [splitDraftMode, setSplitDraftMode] = useState<SplitDraftMode>('items');
  const [expenseItemName, setExpenseItemName] = useState('');
  const [expenseItemAmount, setExpenseItemAmount] = useState('');
  const [manualExpenseItems, setManualExpenseItems] = useState<ExpenseItemDraft[]>([]);
  const [partsExpenseItems, setPartsExpenseItems] = useState<ExpenseItemDraft[]>([]);
  const [partsBaseAmount, setPartsBaseAmount] = useState('');
  const [editingExpenseItemId, setEditingExpenseItemId] = useState('');
  const expenseItems = splitDraftMode === 'parts' ? partsExpenseItems : manualExpenseItems;

  const expenseRemaining = useMemo(
    () => calculateSplitRemaining(transactionAmount, expenseItems),
    [transactionAmount, expenseItems],
  );
  const expenseSplitTotal = useMemo(() => formatSplitTotal(expenseItems), [expenseItems]);

  function reset() {
    setExpenseDetailed(false);
    setSplitEditorOpen(false);
    setSplitApplied(false);
    setSplitEditorSnapshot(null);
    setSplitDraftMode('items');
    setExpenseItemName('');
    setExpenseItemAmount('');
    setManualExpenseItems([]);
    setPartsExpenseItems([]);
    setPartsBaseAmount('');
    setEditingExpenseItemId('');
  }

  function prefill(items: Array<{ id: string; name: string; amount: string }>) {
    setExpenseDetailed(items.length > 0);
    setSplitApplied(items.length > 0);
    setSplitEditorOpen(false);
    setSplitEditorSnapshot(null);
    setSplitDraftMode('items');
    setManualExpenseItems(cloneSplitItems(items, nextId));
    setPartsExpenseItems([]);
    setPartsBaseAmount('');
    setEditingExpenseItemId('');
  }

  function setActiveExpenseItems(items: ExpenseItemDraft[]) {
    if (splitDraftMode === 'parts') {
      setPartsExpenseItems(items);
      return;
    }
    setManualExpenseItems(items);
  }

  function setExpenseDetailedValue(value: boolean) {
    setExpenseDetailed(value);
    setSplitApplied(value);
    if (!value) {
      setFieldErrors((previous) => ({
        ...previous,
        expenseItemName: undefined,
        expenseItemAmount: undefined,
        expenseSplit: undefined,
      }));
    }
  }

  function setExpenseItemNameValue(value: string) {
    setExpenseItemName(value);
    setFieldErrors((previous) => ({ ...previous, expenseItemName: undefined }));
  }

  function setExpenseItemAmountValue(value: string) {
    setExpenseItemAmount(value);
    setFieldErrors((previous) => ({ ...previous, expenseItemAmount: undefined }));
  }

  function addExpenseItem(): boolean {
    const result = upsertSplitItem({
      items: expenseItems,
      editingItemId: editingExpenseItemId,
      nameInput: expenseItemName,
      amountInput: expenseItemAmount,
      nextId,
    });

    if (result.errors.expenseItemName || result.errors.expenseItemAmount) {
      setFieldErrors((previous) => ({ ...previous, ...result.errors }));
      return false;
    }

    const nextItems = splitDraftMode === 'parts' && editingExpenseItemId
      ? rebalanceEditedPartSplit({
        items: result.items,
        editedItemId: editingExpenseItemId,
        totalAmount: partsBaseAmount || transactionAmount,
      })
      : result;

    if (nextItems.errors.expenseItemAmount) {
      setFieldErrors((previous) => ({ ...previous, ...nextItems.errors }));
      return false;
    }

    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
      expenseSplit: undefined,
    }));
    setActiveExpenseItems(nextItems.items);
    setExpenseItemName('');
    setExpenseItemAmount('');
    setEditingExpenseItemId('');
    return true;
  }

  function editExpenseItem(itemId: string) {
    const item = expenseItems.find((candidate) => candidate.id === itemId);
    if (!item) {
      return;
    }

    setEditingExpenseItemId(item.id);
    setExpenseItemName(item.name);
    setExpenseItemAmount(item.amount);
    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
      expenseSplit: undefined,
    }));
  }

  function startExpenseItem() {
    setEditingExpenseItemId('');
    setExpenseItemName('');
    setExpenseItemAmount('');
    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
    }));
  }

  function cancelExpenseItem() {
    setEditingExpenseItemId('');
    setExpenseItemName('');
    setExpenseItemAmount('');
    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
    }));
  }

  function removeExpenseItem(itemId: string) {
    setActiveExpenseItems(expenseItems.filter((item) => item.id !== itemId));
    if (editingExpenseItemId === itemId) {
      setEditingExpenseItemId('');
      setExpenseItemName('');
      setExpenseItemAmount('');
    }
  }

  function splitExpenseByParts(amountInput: string, partsInput: string) {
    const partAmounts = splitAmountIntoParts(amountInput, partsInput);
    if (partAmounts.length === 0) {
      return;
    }

    const nextItems = partAmounts.map((amount, index) => ({
      id: nextId(),
      name: `Part ${index + 1}`,
      amount,
    }));

    setSplitDraftMode('parts');
    setPartsExpenseItems(nextItems);
    setPartsBaseAmount(amountInput.trim());
    setExpenseItemName('');
    setExpenseItemAmount('');
    setEditingExpenseItemId('');
    setFieldErrors((previous) => ({ ...previous, expenseSplit: undefined }));
  }

  function openSplitEditor() {
    setSplitEditorSnapshot({
      expenseDetailed,
      splitApplied,
      splitDraftMode,
      expenseItemName,
      expenseItemAmount,
      manualExpenseItems,
      partsExpenseItems,
      partsBaseAmount,
      editingExpenseItemId,
    });
    setExpenseDetailed(true);
    setSplitEditorOpen(true);
  }

  function closeSplitEditor() {
    if (splitEditorSnapshot) {
      setExpenseDetailed(splitEditorSnapshot.expenseDetailed);
      setSplitApplied(splitEditorSnapshot.splitApplied);
      setSplitDraftMode(splitEditorSnapshot.splitDraftMode);
      setExpenseItemName(splitEditorSnapshot.expenseItemName);
      setExpenseItemAmount(splitEditorSnapshot.expenseItemAmount);
      setManualExpenseItems(splitEditorSnapshot.manualExpenseItems);
      setPartsExpenseItems(splitEditorSnapshot.partsExpenseItems);
      setPartsBaseAmount(splitEditorSnapshot.partsBaseAmount);
      setEditingExpenseItemId(splitEditorSnapshot.editingExpenseItemId);
    }
    setSplitEditorOpen(false);
    setSplitEditorSnapshot(null);
  }

  function applySplit() {
    setExpenseDetailed(true);
    setSplitApplied(true);
    setSplitEditorOpen(false);
    setSplitEditorSnapshot(null);
    setFieldErrors((previous) => ({ ...previous, expenseSplit: undefined }));
  }

  function removeSplit() {
    setExpenseDetailed(false);
    setSplitApplied(false);
    setSplitEditorOpen(false);
    setSplitEditorSnapshot(null);
    setSplitDraftMode('items');
    setExpenseItemName('');
    setExpenseItemAmount('');
    setManualExpenseItems([]);
    setPartsExpenseItems([]);
    setPartsBaseAmount('');
    setEditingExpenseItemId('');
    setFieldErrors((previous) => ({
      ...previous,
      expenseItemName: undefined,
      expenseItemAmount: undefined,
      expenseSplit: undefined,
    }));
  }

  return {
    state: {
      expenseDetailed,
      splitEditorOpen,
      splitApplied,
      splitDraftMode,
      expenseItemName,
      expenseItemAmount,
      editingExpenseItemId,
      expenseItems,
      expenseRemaining,
      expenseSplitTotal,
    },
    actions: {
      reset,
      prefill,
      openSplitEditor,
      closeSplitEditor,
      applySplit,
      removeSplit,
      setSplitDraftMode,
      setExpenseDetailedValue,
      setExpenseItemNameValue,
      setExpenseItemAmountValue,
      addExpenseItem,
      startExpenseItem,
      cancelExpenseItem,
      editExpenseItem,
      removeExpenseItem,
      splitExpenseByParts,
    },
  };
}
